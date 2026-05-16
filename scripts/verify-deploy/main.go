// scripts/verify-deploy — release verifier for the current Perplexica deploy.
//
// Polls the Railway production URL and confirms the public-surface markers
// that the restore-search-context-and-progress + kill-stale-pwa-service-worker
// changes should produce:
//
//  1. /health returns 200
//  2. /         contains <title>Find Your Own Answer</title> (title unification)
//  3. /sw.js    contains the kill-switch markers (skipWaiting, unregister,
//               no fetch handler)
//  4. /manifest.json returns 404 (Phoenix no longer serves PWA artifacts)
//  5. /icon-192.png  returns 404 (same rule)
//  6. /graphql  introspection lists the new Library mutations
//               (toggleChatBookmark, archiveChat, restoreChat, trashChat,
//               purgeChat) and the :search_event timing fields
//               (emittedAtMs, step, elapsedMs)
//
// Every check is retried with a ticker until the total --timeout expires,
// because Railway auto-deploy takes a couple of minutes to swap containers
// after a push. The tool is idempotent: run it before or after the deploy
// and it will wait until either every marker is green or the timeout hits.
//
// Usage:
//
//	go run ./scripts/verify-deploy \
//	  --url https://perplexica-production-41f5.up.railway.app
package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type checkResult struct {
	name    string
	ok      bool
	detail  string
}

func main() {
	url := flag.String("url", "https://perplexica-production-41f5.up.railway.app", "Base URL")
	timeout := flag.Duration("timeout", 5*time.Minute, "Total timeout")
	interval := flag.Duration("interval", 15*time.Second, "Polling interval")
	skipGraphQL := flag.Bool("skip-graphql", false, "Skip GraphQL introspection (requires public /graphql)")
	flag.Parse()

	base := strings.TrimSuffix(*url, "/")
	fmt.Printf("%s Verifying %s\n", tag("init"), base)
	fmt.Printf("%s Timeout %v, poll every %v\n", tag("init"), *timeout, *interval)

	client := &http.Client{Timeout: 10 * time.Second}
	start := time.Now()
	deadline := start.Add(*timeout)

	for {
		elapsed := time.Since(start).Round(time.Second)
		fmt.Printf("\n%s Tick at %s\n", tag("poll"), elapsed)

		results := []checkResult{
			checkHealth(client, base),
			checkTitle(client, base),
			checkKillSwitchSW(client, base),
			checkPWAArtifact404(client, base, "/manifest.json"),
			checkPWAArtifact404(client, base, "/icon-192.png"),
		}
		if !*skipGraphQL {
			results = append(results, checkGraphQLIntrospection(client, base))
		}

		allOK := true
		for _, r := range results {
			if r.ok {
				fmt.Printf("  %s %s — %s\n", green("✓"), bold(r.name), r.detail)
			} else {
				fmt.Printf("  %s %s — %s\n", red("✗"), bold(r.name), r.detail)
				allOK = false
			}
		}

		if allOK {
			fmt.Printf("\n%s all markers green in %s\n", green(tag("done")), time.Since(start).Round(time.Second))
			fmt.Printf("%s open %s and verify: four-tab library, search progress timeline, right-edge accent, unified title\n",
				tag("next"), base)
			os.Exit(0)
		}

		if time.Now().After(deadline) {
			fmt.Printf("\n%s timeout after %v with failing markers above\n", red(tag("fail")), *timeout)
			os.Exit(1)
		}

		time.Sleep(*interval)
	}
}

func checkHealth(c *http.Client, base string) checkResult {
	name := "health"
	resp, err := c.Get(base + "/health")
	if err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("network error: %v", err)}
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return checkResult{name: name, detail: fmt.Sprintf("status %d", resp.StatusCode)}
	}
	return checkResult{name: name, ok: true, detail: "200 OK"}
}

func checkTitle(c *http.Client, base string) checkResult {
	name := "title"
	body, status, err := fetchBody(c, base+"/")
	if err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("network: %v", err)}
	}
	if status != 200 {
		return checkResult{name: name, detail: fmt.Sprintf("status %d", status)}
	}
	// The new build ships `<title>Find Your Own Answer</title>`. The old
	// build shipped `<title>FYOA — Find Your Own Answer</title>` — a
	// substring check alone would pass on both, so we explicitly reject
	// the old `FYOA — ` prefix inside the <title> tag.
	titleOpen := strings.Index(body, "<title>")
	titleClose := strings.Index(body, "</title>")
	if titleOpen < 0 || titleClose < 0 || titleClose <= titleOpen {
		return checkResult{name: name, detail: "no <title> tag in HTML"}
	}
	titleText := body[titleOpen+len("<title>") : titleClose]
	if strings.Contains(titleText, "FYOA") {
		return checkResult{name: name, detail: fmt.Sprintf("old build still live — <title>%s</title>", titleText)}
	}
	if !strings.Contains(titleText, "Find Your Own Answer") {
		return checkResult{name: name, detail: fmt.Sprintf("unexpected title: %q", titleText)}
	}
	return checkResult{name: name, ok: true, detail: fmt.Sprintf("<title>%s</title>", titleText)}
}

func checkKillSwitchSW(c *http.Client, base string) checkResult {
	name := "sw.js kill-switch"
	body, status, err := fetchBody(c, base+"/sw.js")
	if err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("network: %v", err)}
	}
	if status != 200 {
		return checkResult{name: name, detail: fmt.Sprintf("status %d (expected 200 from Redwood public/)", status)}
	}
	needs := []string{"skipWaiting", "unregister"}
	for _, s := range needs {
		if !strings.Contains(body, s) {
			return checkResult{name: name, detail: fmt.Sprintf("missing marker %q", s)}
		}
	}
	if strings.Contains(body, "addEventListener('fetch'") ||
		strings.Contains(body, `addEventListener("fetch"`) {
		return checkResult{name: name, detail: "fetch handler present — this is NOT the kill-switch"}
	}
	return checkResult{name: name, ok: true, detail: "skipWaiting+unregister, no fetch handler"}
}

func checkPWAArtifact404(c *http.Client, base, path string) checkResult {
	name := fmt.Sprintf("404 %s", path)
	resp, err := c.Get(base + path)
	if err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("network: %v", err)}
	}
	defer resp.Body.Close()
	if resp.StatusCode == 404 {
		return checkResult{name: name, ok: true, detail: "404 (Phoenix no longer serves PWA)"}
	}
	if resp.StatusCode == 200 {
		return checkResult{name: name, detail: "200 — Phoenix still serving artifact (PWA not purged)"}
	}
	return checkResult{name: name, detail: fmt.Sprintf("unexpected status %d", resp.StatusCode)}
}

func checkGraphQLIntrospection(c *http.Client, base string) checkResult {
	name := "graphql /api/graphql: Library + step fields"
	query := `{"query":"{__schema{mutationType{fields{name}} types{name fields{name}}}}"}`
	resp, err := c.Post(base+"/api/graphql", "application/json", bytes.NewBufferString(query))
	if err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("network: %v", err)}
	}
	defer resp.Body.Close()
	if resp.StatusCode != 200 {
		return checkResult{name: name, detail: fmt.Sprintf("status %d", resp.StatusCode)}
	}
	raw, _ := io.ReadAll(resp.Body)
	var parsed struct {
		Data struct {
			Schema struct {
				MutationType struct {
					Fields []struct{ Name string } `json:"fields"`
				} `json:"mutationType"`
				Types []struct {
					Name   string
					Fields []struct{ Name string } `json:"fields"`
				} `json:"types"`
			} `json:"__schema"`
		} `json:"data"`
	}
	if err := json.Unmarshal(raw, &parsed); err != nil {
		return checkResult{name: name, detail: fmt.Sprintf("parse error: %v (body: %.80s)", err, raw)}
	}
	wantMutations := []string{"toggleChatBookmark", "archiveChat", "restoreChat", "trashChat", "purgeChat"}
	mutationNames := map[string]bool{}
	for _, f := range parsed.Data.Schema.MutationType.Fields {
		mutationNames[f.Name] = true
	}
	for _, w := range wantMutations {
		if !mutationNames[w] {
			return checkResult{name: name, detail: fmt.Sprintf("missing mutation %q", w)}
		}
	}
	wantStepFields := []string{"emittedAtMs", "step", "elapsedMs"}
	var sawSearchEvent bool
	for _, t := range parsed.Data.Schema.Types {
		if t.Name != "SearchEvent" {
			continue
		}
		sawSearchEvent = true
		fieldNames := map[string]bool{}
		for _, f := range t.Fields {
			fieldNames[f.Name] = true
		}
		for _, w := range wantStepFields {
			if !fieldNames[w] {
				return checkResult{name: name, detail: fmt.Sprintf("SearchEvent missing %q", w)}
			}
		}
	}
	if !sawSearchEvent {
		return checkResult{name: name, detail: "SearchEvent type not found in schema"}
	}
	return checkResult{name: name, ok: true, detail: "5 Library mutations + 3 step fields present"}
}

func fetchBody(c *http.Client, url string) (string, int, error) {
	resp, err := c.Get(url)
	if err != nil {
		return "", 0, err
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", resp.StatusCode, err
	}
	return string(raw), resp.StatusCode, nil
}

func tag(s string) string    { return fmt.Sprintf("\033[36m[%s]\033[0m", s) }
func green(s string) string  { return fmt.Sprintf("\033[32m%s\033[0m", s) }
func red(s string) string    { return fmt.Sprintf("\033[31m%s\033[0m", s) }
func bold(s string) string   { return fmt.Sprintf("\033[1m%s\033[0m", s) }
