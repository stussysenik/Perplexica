#!/usr/bin/env python3
"""
zed-sync: Diagnose and repair stale git decoration state in Zed (and any
other editor that watches .git/index via FSEventStream on macOS).

Symptom — after a batch commit (we just landed three), Zed keeps showing
files as modified/staged even though `git status` reports them clean.

Root cause — macOS FSEvents coalesces bulk filesystem writes. When git
rewrites .git/index three times in under a second, the watcher's callback
can receive a single synthetic event whose path flags don't match what Zed's
debouncer is keying on. The watcher's in-memory decoration snapshot drifts
from reality and stays drifted until the next write on a watched path.

What this tool does:
  1. Reads real git state from the index (the single source of truth).
  2. Detects drift vs any tooling that might be cached (working-tree mtimes
     compared to .git/index mtime).
  3. Cleans orphan .git/*.lock files older than --lock-ttl seconds.
  4. Runs `git update-index --refresh` to force git to re-stat the working
     tree and update the index's cached stat fields.
  5. Bumps mtime on the paths that editor git watchers typically listen on
     (.git/index, .git/HEAD, .git/FETCH_HEAD) so FSEvents emits a fresh
     event the watcher cannot coalesce away.
  6. Touches an ephemeral sentinel at the repo root so workspace-scoped
     watchers that don't watch .git/ also wake up.
  7. Prints a before/after drift report.

Usage:
  scripts/zed-sync.py                 # diagnose + repair in the current repo
  scripts/zed-sync.py --dry-run       # report only, no writes
  scripts/zed-sync.py --verbose       # verbose mode
  scripts/zed-sync.py --lock-ttl 120  # only clean locks older than 120s

Exit codes:
  0 = clean state or repair succeeded
  1 = drift detected and --dry-run prevented repair
  2 = hard failure (git unreachable, no .git dir, etc.)
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


RESET = "\033[0m"
DIM = "\033[2m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
CYAN = "\033[36m"
BOLD = "\033[1m"


def log(tag: str, msg: str, color: str = "") -> None:
    prefix = f"{color}[{tag}]{RESET}" if sys.stdout.isatty() else f"[{tag}]"
    print(f"{prefix} {msg}")


def run(cmd: list[str], cwd: Path) -> tuple[int, str, str]:
    proc = subprocess.run(
        cmd, cwd=str(cwd), capture_output=True, text=True, check=False
    )
    return proc.returncode, proc.stdout, proc.stderr


@dataclass
class GitState:
    modified: list[str]
    staged: list[str]
    untracked: list[str]
    branch: str
    ahead: int
    index_mtime: float

    @property
    def is_clean_except_untracked(self) -> bool:
        return not self.modified and not self.staged


def find_repo_root(start: Path) -> Path:
    path = start.resolve()
    for candidate in [path, *path.parents]:
        if (candidate / ".git").exists():
            return candidate
    log("fatal", f"no .git directory found above {start}", RED)
    sys.exit(2)


def read_git_state(repo: Path) -> GitState:
    rc, out, err = run(["git", "status", "--porcelain=v1", "--branch"], repo)
    if rc != 0:
        log("fatal", f"git status failed: {err.strip()}", RED)
        sys.exit(2)

    modified: list[str] = []
    staged: list[str] = []
    untracked: list[str] = []
    branch = "detached"
    ahead = 0

    for line in out.splitlines():
        if line.startswith("## "):
            header = line[3:]
            if "..." in header:
                branch = header.split("...", 1)[0]
            else:
                branch = header.split(" ", 1)[0]
            if "ahead " in header:
                try:
                    ahead = int(header.split("ahead ", 1)[1].split(",", 1)[0].rstrip("]"))
                except ValueError:
                    ahead = 0
            continue
        if not line:
            continue
        code = line[:2]
        name = line[3:]
        if code == "??":
            untracked.append(name)
            continue
        x, y = code[0], code[1]
        if x != " " and x != "?":
            staged.append(name)
        if y != " " and y != "?":
            modified.append(name)

    index_path = repo / ".git" / "index"
    index_mtime = index_path.stat().st_mtime if index_path.exists() else 0.0

    return GitState(
        modified=modified,
        staged=staged,
        untracked=untracked,
        branch=branch,
        ahead=ahead,
        index_mtime=index_mtime,
    )


def print_state(state: GitState, label: str) -> None:
    tag = f"state:{label}"
    log(tag, f"branch={state.branch} ahead={state.ahead}", CYAN)
    log(tag, f"modified={len(state.modified)} staged={len(state.staged)} untracked={len(state.untracked)}", CYAN)
    if state.modified:
        log(tag, "  modified:", DIM)
        for f in state.modified[:10]:
            print(f"    M {f}")
        if len(state.modified) > 10:
            print(f"    … +{len(state.modified) - 10} more")
    if state.staged:
        log(tag, "  staged:", DIM)
        for f in state.staged[:10]:
            print(f"    S {f}")
    if state.untracked:
        log(tag, "  untracked:", DIM)
        for f in state.untracked[:10]:
            print(f"    ? {f}")
    if state.index_mtime:
        age = time.time() - state.index_mtime
        log(tag, f"  .git/index age: {age:.1f}s", DIM)


def clean_stale_locks(repo: Path, ttl: float, dry_run: bool) -> list[Path]:
    now = time.time()
    removed: list[Path] = []
    for lock in (repo / ".git").glob("*.lock"):
        age = now - lock.stat().st_mtime
        if age < ttl:
            log("locks", f"skip {lock.name} (age {age:.1f}s < ttl {ttl}s)", DIM)
            continue
        log("locks", f"stale: {lock.name} (age {age:.1f}s)", YELLOW)
        if not dry_run:
            lock.unlink()
            removed.append(lock)
            log("locks", f"removed {lock.name}", GREEN)
    if not removed and not dry_run:
        log("locks", "no stale locks", GREEN)
    return removed


def refresh_index(repo: Path, dry_run: bool) -> None:
    if dry_run:
        log("index", "would run: git update-index --refresh", DIM)
        return
    rc, _, err = run(["git", "update-index", "--really-refresh"], repo)
    if rc == 0:
        log("index", "git update-index --really-refresh: ok", GREEN)
    else:
        log("index", f"refresh reported drift: {err.strip() or 'files need attention'}", YELLOW)


def kick_fsevents(paths: Iterable[Path], dry_run: bool) -> list[Path]:
    now = time.time()
    touched: list[Path] = []
    for p in paths:
        if not p.exists():
            log("fsevents", f"skip missing {p}", DIM)
            continue
        if dry_run:
            log("fsevents", f"would bump mtime on {p}", DIM)
            continue
        os.utime(p, (now, now))
        touched.append(p)
        log("fsevents", f"bumped mtime on {p.name}", GREEN)
    return touched


def sentinel_kick(repo: Path, dry_run: bool) -> None:
    sentinel = repo / ".zed-sync-kick"
    if dry_run:
        log("sentinel", f"would touch {sentinel.name}", DIM)
        return
    sentinel.write_text(f"{time.time()}\n")
    os.utime(sentinel, None)
    time.sleep(0.05)
    sentinel.unlink()
    log("sentinel", "kicked workspace watcher", GREEN)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--repo", default=".", help="Path to repo (default: cwd)")
    parser.add_argument("--dry-run", action="store_true", help="Diagnose only, no writes")
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    parser.add_argument("--lock-ttl", type=float, default=60.0, help="Min age (s) for a .lock to be considered stale")
    args = parser.parse_args()

    repo = find_repo_root(Path(args.repo))
    log("init", f"repo: {repo}", BOLD)
    if args.dry_run:
        log("init", "DRY RUN — no writes", YELLOW)

    before = read_git_state(repo)
    print_state(before, "before")

    if before.is_clean_except_untracked:
        log("diagnosis", "no modified/staged files — any decoration in Zed showing otherwise is stale", YELLOW)
    else:
        log("diagnosis", "repo has real uncommitted changes — tool will still refresh watchers but decorations may be correct", CYAN)

    print()
    log("repair", "clean stale locks", BOLD)
    clean_stale_locks(repo, args.lock_ttl, args.dry_run)

    print()
    log("repair", "refresh git index stat cache", BOLD)
    refresh_index(repo, args.dry_run)

    print()
    log("repair", "kick FSEvents on .git watch targets", BOLD)
    kick_fsevents(
        [
            repo / ".git" / "index",
            repo / ".git" / "HEAD",
            repo / ".git" / "FETCH_HEAD",
            repo / ".git" / "ORIG_HEAD",
        ],
        args.dry_run,
    )

    print()
    log("repair", "kick workspace sentinel", BOLD)
    sentinel_kick(repo, args.dry_run)

    print()
    after = read_git_state(repo)
    print_state(after, "after")

    print()
    if args.dry_run and not before.is_clean_except_untracked:
        log("result", "drift detected — re-run without --dry-run to repair", YELLOW)
        return 1

    if before.is_clean_except_untracked and after.is_clean_except_untracked:
        log("result", "filesystem side is clean; Zed should re-render on next focus", GREEN)
        log("hint", "if decorations still stale, run `cmd-shift-P` → `workspace: reload` in Zed", DIM)
    else:
        log("result", "real uncommitted work remains; decorations will reflect those", CYAN)
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("\nabort", file=sys.stderr)
        sys.exit(130)
