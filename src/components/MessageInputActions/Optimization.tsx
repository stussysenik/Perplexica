"use client";

import { ChevronDown, Sliders, Star, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import { useChat } from "@/lib/hooks/useChat";
import { AnimatePresence, motion } from "motion/react";

const OptimizationModes = [
        {
                key: "speed",
                title: "Speed",
                description:
                        "Prioritize speed and get the quickest possible answer.",
                icon: (active: boolean) => (
                        <Zap
                                size={16}
                                className={
                                        active
                                                ? "text-[#FF9800]"
                                                : "text-[#FF9800]/60"
                                }
                        />
                ),
        },
        {
                key: "balanced",
                title: "Balanced",
                description:
                        "Find the right balance between speed and accuracy.",
                icon: (active: boolean) => (
                        <Sliders
                                size={16}
                                className={
                                        active
                                                ? "text-[#4CAF50]"
                                                : "text-[#4CAF50]/60"
                                }
                        />
                ),
        },
        {
                key: "quality",
                title: "Quality",
                description: "Get the most thorough and accurate answer.",
                icon: (active: boolean) => (
                        <Star
                                size={16}
                                className={cn(
                                        active
                                                ? "text-[#2196F3] dark:text-[#BBDEFB] fill-[#2196F3] dark:fill-[#BBDEFB]"
                                                : "text-[#2196F3]/60 dark:text-[#BBDEFB]/60 fill-[#2196F3]/30 dark:fill-[#BBDEFB]/30",
                                )}
                        />
                ),
        },
];

const Optimization = () => {
        const { optimizationMode, setOptimizationMode } = useChat();

        const activeMode = OptimizationModes.find(
                (mode) => mode.key === optimizationMode,
        );

        return (
                <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg">
                        {({ open }) => (
                                <>
                                        <PopoverButton
                                                type="button"
                                                className="flex items-center justify-center min-h-[44px] min-w-[44px] p-2 text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white focus:outline-none"
                                        >
                                                <div className="flex flex-row items-center space-x-1">
                                                        {activeMode?.icon(true)}
                                                        <span className="text-xs font-medium hidden sm:inline">
                                                                {
                                                                        activeMode?.title
                                                                }
                                                        </span>
                                                        <ChevronDown
                                                                size={14}
                                                                className={cn(
                                                                        open
                                                                                ? "rotate-180"
                                                                                : "rotate-0",
                                                                        "transition duration-200",
                                                                )}
                                                        />
                                                </div>
                                        </PopoverButton>

                                        <AnimatePresence>
                                                {open && (
                                                        <PopoverPanel
                                                                static
                                                                className="absolute z-50 bottom-full sm:bottom-auto sm:top-full left-0 right-0 sm:left-0 sm:right-auto sm:w-[280px] mb-2 sm:mb-0 sm:mt-1"
                                                        >
                                                                <motion.div
                                                                        initial={{
                                                                                opacity: 0,
                                                                                y: 8,
                                                                                scale: 0.95,
                                                                        }}
                                                                        animate={{
                                                                                opacity: 1,
                                                                                y: 0,
                                                                                scale: 1,
                                                                        }}
                                                                        exit={{
                                                                                opacity: 0,
                                                                                y: 8,
                                                                                scale: 0.95,
                                                                        }}
                                                                        transition={{
                                                                                duration: 0.15,
                                                                                ease: "easeOut",
                                                                        }}
                                                                        className="origin-bottom-left sm:origin-top-left flex flex-col gap-1 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl p-1.5 shadow-lg shadow-black/5 dark:shadow-black/20"
                                                                >
                                                                        {OptimizationModes.map(
                                                                                (
                                                                                        mode,
                                                                                ) => {
                                                                                        const isActive =
                                                                                                optimizationMode ===
                                                                                                mode.key;

                                                                                        return (
                                                                                                <PopoverButton
                                                                                                        as="button"
                                                                                                        key={
                                                                                                                mode.key
                                                                                                        }
                                                                                                        onClick={() =>
                                                                                                                setOptimizationMode(
                                                                                                                        mode.key,
                                                                                                                )
                                                                                                        }
                                                                                                        className={cn(
                                                                                                                "flex items-start gap-3 w-full p-3 rounded-lg text-left transition duration-150 focus:outline-none min-h-[44px]",
                                                                                                                isActive
                                                                                                                        ? "bg-[#24A0ED]/10 dark:bg-[#24A0ED]/15 ring-1 ring-[#24A0ED]/20"
                                                                                                                        : "hover:bg-light-secondary dark:hover:bg-dark-secondary",
                                                                                                        )}
                                                                                                >
                                                                                                        <div
                                                                                                                className={cn(
                                                                                                                        "flex items-center justify-center w-8 h-8 rounded-lg shrink-0 transition",
                                                                                                                        isActive
                                                                                                                                ? "bg-[#24A0ED]/15 dark:bg-[#24A0ED]/20"
                                                                                                                                : "bg-light-200 dark:bg-dark-200",
                                                                                                                )}
                                                                                                        >
                                                                                                                {mode.icon(
                                                                                                                        isActive,
                                                                                                                )}
                                                                                                        </div>
                                                                                                        <div className="flex flex-col flex-1 min-w-0">
                                                                                                                <div className="flex flex-row items-center justify-between gap-2">
                                                                                                                        <p
                                                                                                                                className={cn(
                                                                                                                                        "text-sm font-medium",
                                                                                                                                        isActive
                                                                                                                                                ? "text-[#24A0ED] dark:text-[#24A0ED]"
                                                                                                                                                : "text-black dark:text-white",
                                                                                                                                )}
                                                                                                                        >
                                                                                                                                {
                                                                                                                                        mode.title
                                                                                                                                }
                                                                                                                        </p>
                                                                                                                        {mode.key ===
                                                                                                                                "quality" && (
                                                                                                                                <span className="bg-sky-500/70 dark:bg-sky-500/40 border border-sky-600/50 px-1.5 py-0.5 rounded-full text-[10px] text-white leading-none">
                                                                                                                                        Beta
                                                                                                                                </span>
                                                                                                                        )}
                                                                                                                </div>
                                                                                                                <p
                                                                                                                        className={cn(
                                                                                                                                "text-xs mt-0.5",
                                                                                                                                isActive
                                                                                                                                        ? "text-black/70 dark:text-white/70"
                                                                                                                                        : "text-black/50 dark:text-white/50",
                                                                                                                        )}
                                                                                                                >
                                                                                                                        {
                                                                                                                                mode.description
                                                                                                                        }
                                                                                                                </p>
                                                                                                        </div>
                                                                                                </PopoverButton>
                                                                                        );
                                                                                },
                                                                        )}
                                                                </motion.div>
                                                        </PopoverPanel>
                                                )}
                                        </AnimatePresence>
                                </>
                        )}
                </Popover>
        );
};

export default Optimization;
