import { ChevronLeft, ChevronRight, GitBranch } from 'lucide-react';

interface BranchSwitcherProps {
        currentBranch: number;
        totalBranches: number;
        onSwitch: (branchIndex: number) => void;
}

const BranchSwitcher = ({
        currentBranch,
        totalBranches,
        onSwitch,
}: BranchSwitcherProps) => {
        if (totalBranches <= 1) return null;

        return (
                <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-light-secondary/60 dark:bg-dark-secondary/60 border border-light-200/50 dark:border-dark-200/50 text-xs">
                        <button
                                onClick={() => onSwitch(currentBranch - 1)}
                                disabled={currentBranch <= 0}
                                aria-label="Previous branch"
                                className="p-1 rounded hover:bg-light-200 dark:hover:bg-dark-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        >
                                <ChevronLeft size={12} aria-hidden="true" />
                        </button>
                        <div className="flex items-center gap-1 px-1">
                                <GitBranch size={10} className="text-[var(--accent)]" aria-hidden="true" />
                                <span className="text-black/50 dark:text-white/50 font-medium tabular-nums">
                                        {currentBranch + 1}/{totalBranches}
                                </span>
                        </div>
                        <button
                                onClick={() => onSwitch(currentBranch + 1)}
                                disabled={currentBranch >= totalBranches - 1}
                                aria-label="Next branch"
                                className="p-1 rounded hover:bg-light-200 dark:hover:bg-dark-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)]"
                        >
                                <ChevronRight size={12} aria-hidden="true" />
                        </button>
                </div>
        );
};

export default BranchSwitcher;
