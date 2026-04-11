"use client";

import { Zap, Sliders, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import * as Popover from "@radix-ui/react-popover";
import * as Tooltip from "@radix-ui/react-tooltip";
import { useChat } from "@/lib/hooks/useChat";

const modes = [
        {
                key: "speed",
                title: "Speed",
                shortTitle: "Fast",
                description: "Quickest possible answer",
                icon: Zap,
                color: "text-amber-500",
                bgColor: "bg-amber-500/10",
                ringColor: "ring-amber-500/25",
        },
        {
                key: "balanced",
                title: "Balanced",
                shortTitle: "Bal",
                description: "Balance speed and accuracy",
                icon: Sliders,
                color: "text-emerald-500",
                bgColor: "bg-emerald-500/10",
                ringColor: "ring-emerald-500/25",
        },
        {
                key: "quality",
                title: "Quality",
                shortTitle: "Pro",
                description: "Most thorough answer",
                icon: Star,
                color: "text-sky-500",
                bgColor: "bg-sky-500/10",
                ringColor: "ring-sky-500/25",
        },
];

const Optimization = () => {
        const { optimizationMode, setOptimizationMode } = useChat();

        const activeMode = modes.find((m) => m.key === optimizationMode) ?? modes[0];
        const ActiveIcon = activeMode.icon;

        return (
                <Popover.Root>
                        <Tooltip.Provider delayDuration={300}>
                                <Tooltip.Root>
                                        <Tooltip.Trigger asChild>
                                                <Popover.Trigger asChild>
                                                        <button
                                                                type="button"
                                                                aria-label={`Search mode: ${activeMode.title}. Click to change.`}
                                                                className="flex items-center gap-1.5 min-h-[44px] min-w-[44px] px-2 py-1.5 rounded-xl text-black/50 dark:text-white/50 hover:bg-light-secondary dark:hover:bg-dark-secondary hover:text-black/70 dark:hover:text-white/70 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
                                                        >
                                                                <ActiveIcon
                                                                        size={15}
                                                                        className={cn(
                                                                                "transition-colors duration-200",
                                                                                activeMode.color,
                                                                        )}
                                                                        aria-hidden="true"
                                                                />
                                                                <span className="text-xs font-medium hidden sm:inline">
                                                                        {activeMode.title}
                                                                </span>
                                                        </button>
                                                </Popover.Trigger>
                                        </Tooltip.Trigger>
                                        <Tooltip.Content
                                                side="top"
                                                sideOffset={4}
                                                className="text-[11px] bg-black/80 text-white px-2 py-1 rounded-md z-50"
                                        >
                                                Search mode: {activeMode.title}
                                        </Tooltip.Content>
                                </Tooltip.Root>
                        </Tooltip.Provider>

                        <Popover.Portal>
                                <Popover.Content
                                        align="start"
                                        sideOffset={8}
                                        className="z-50 w-[280px] rounded-xl border border-light-200 dark:border-dark-200 bg-light-primary dark:bg-dark-primary p-2 shadow-lg shadow-black/5 dark:shadow-black/20 focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
                                >
                                        <p className="text-[10px] font-semibold text-black/30 dark:text-white/30 uppercase tracking-wider px-2 pt-1 pb-2">
                                                Search Mode
                                        </p>
                                        <div className="flex flex-col gap-1">
                                                {modes.map((mode) => {
                                                        const isActive = optimizationMode === mode.key;
                                                        const Icon = mode.icon;

                                                        return (
                                                                <button
                                                                        key={mode.key}
                                                                        type="button"
                                                                        onClick={() => setOptimizationMode(mode.key)}
                                                                        aria-pressed={isActive}
                                                                        className={cn(
                                                                                "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[44px]",
                                                                                isActive
                                                                                        ? cn(mode.bgColor, "ring-1", mode.ringColor)
                                                                                        : "hover:bg-light-secondary dark:hover:bg-dark-secondary",
                                                                        )}
                                                                >
                                                                        <div
                                                                                className={cn(
                                                                                        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition-colors duration-150",
                                                                                        isActive
                                                                                                ? cn(mode.bgColor, mode.color)
                                                                                                : "bg-light-200 dark:bg-dark-200 text-black/40 dark:text-white/40",
                                                                                )}
                                                                        >
                                                                                <Icon size={16} aria-hidden="true" />
                                                                        </div>
                                                                        <div className="flex flex-col flex-1 min-w-0">
                                                                                <div className="flex items-center gap-2">
                                                                                        <p
                                                                                                className={cn(
                                                                                                        "text-sm font-medium",
                                                                                                        isActive
                                                                                                                ? mode.color
                                                                                                                : "text-black dark:text-white",
                                                                                                )}
                                                                                        >
                                                                                                {mode.title}
                                                                                        </p>
                                                                                        {mode.key === "quality" && (
                                                                                                <span className="bg-sky-500/70 dark:bg-sky-500/40 border border-sky-600/50 px-1.5 py-0.5 rounded-full text-[10px] text-white leading-none">
                                                                                                        Beta
                                                                                                </span>
                                                                                        )}
                                                                                </div>
                                                                                <p className="text-xs mt-0.5 text-black/45 dark:text-white/45">
                                                                                        {mode.description}
                                                                                </p>
                                                                        </div>
                                                                </button>
                                                        );
                                                })}
                                        </div>
                                </Popover.Content>
                        </Popover.Portal>
                </Popover.Root>
        );
};

export default Optimization;
