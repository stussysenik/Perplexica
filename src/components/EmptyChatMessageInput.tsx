import { ArrowUp, Zap, Sliders, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useChat } from "@/lib/hooks/useChat";
import Attach from "./MessageInputActions/Attach";
import { cn } from "@/lib/utils";

const modeConfig = [
        {
                key: "speed",
                label: "Speed",
                icon: Zap,
                color: "text-amber-500",
                activeBg: "bg-amber-500/10",
                activeBorder: "border-amber-500/20",
                activeText: "text-amber-600 dark:text-amber-400",
        },
        {
                key: "balanced",
                label: "Balanced",
                icon: Sliders,
                color: "text-emerald-500",
                activeBg: "bg-emerald-500/10",
                activeBorder: "border-emerald-500/20",
                activeText: "text-emerald-600 dark:text-emerald-400",
        },
        {
                key: "quality",
                label: "Quality",
                icon: Star,
                color: "text-sky-500",
                activeBg: "bg-sky-500/10",
                activeBorder: "border-sky-500/20",
                activeText: "text-sky-600 dark:text-sky-400",
        },
];

const EmptyChatMessageInput = () => {
        const { sendMessage, optimizationMode, setOptimizationMode } =
                useChat();
        const [message, setMessage] = useState("");
        const inputRef = useRef<HTMLTextAreaElement | null>(null);

        useEffect(() => {
                const handleKeyDown = (e: KeyboardEvent) => {
                        const activeElement = document.activeElement;
                        const isInputFocused =
                                activeElement?.tagName === "INPUT" ||
                                activeElement?.tagName === "TEXTAREA" ||
                                activeElement?.hasAttribute("contenteditable");

                        if (e.key === "/" && !isInputFocused) {
                                e.preventDefault();
                                inputRef.current?.focus();
                        }
                };
                document.addEventListener("keydown", handleKeyDown);
                inputRef.current?.focus();
                return () =>
                        document.removeEventListener("keydown", handleKeyDown);
        }, []);

        return (
                <form
                        onSubmit={(e) => {
                                e.preventDefault();
                                if (message.trim().length === 0) return;
                                sendMessage(message);
                                setMessage("");
                        }}
                        className="w-full max-w-2xl flex flex-col items-center"
                >
                        <div
                                className="flex items-center gap-1 mb-4 w-full px-1"
                                role="radiogroup"
                                aria-label="Search mode"
                        >
                                {modeConfig.map((mode) => {
                                        const isActive = optimizationMode === mode.key;
                                        const Icon = mode.icon;
                                        return (
                                                <button
                                                        key={mode.key}
                                                        type="button"
                                                        role="radio"
                                                        aria-checked={isActive}
                                                        onClick={() =>
                                                                setOptimizationMode(
                                                                        mode.key as any,
                                                                )
                                                        }
                                                        className={cn(
                                                                "flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-full transition-colors duration-200 border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] min-h-[36px]",
                                                                isActive
                                                                        ? cn(mode.activeBg, mode.activeBorder, mode.activeText)
                                                                        : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 border-transparent hover:border-light-200 dark:hover:border-dark-200",
                                                        )}
                                                >
                                                        <Icon size={13} className={isActive ? mode.color : ""} aria-hidden="true" />
                                                        <span>{mode.label}</span>
                                                </button>
                                        );
                                })}
                        </div>

                        <div className="flex flex-col bg-white dark:bg-dark-secondary/80 px-4 py-3 rounded-2xl w-full border border-light-200 dark:border-dark-200 shadow-sm transition-all duration-300 focus-within:shadow-md focus-within:border-[var(--accent)]/30 focus-within:ring-4 focus-within:ring-[var(--accent)]/5 relative">
                                <Attach />
                                <div className="flex items-center w-full">
                                        <TextareaAutosize
                                                ref={inputRef}
                                                value={message}
                                                onChange={(e) =>
                                                        setMessage(
                                                                e.target.value,
                                                        )
                                                }
                                                minRows={1}
                                                maxRows={4}
                                                className="bg-transparent placeholder:text-[15px] placeholder:text-black/40 dark:placeholder:text-white/40 text-sm text-black dark:text-white resize-none focus:outline-none w-full max-h-32 py-1.5"
                                                placeholder="Ask anything..."
                                                aria-label="Search query"
                                        />
                                        <button
                                                disabled={
                                                        message.trim()
                                                                .length === 0
                                                }
                                                type="submit"
                                                aria-label="Send message"
                                                className="flex-shrink-0 flex items-center justify-center h-9 w-9 ml-2 rounded-lg bg-[var(--accent)] text-white hover:opacity-90 transition-colors duration-200 disabled:opacity-30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
                                        >
                                                <ArrowUp
                                                        size={16}
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                />
                                        </button>
                                </div>
                        </div>

                        <p className="text-[10px] text-black/30 dark:text-white/30 mt-3.5 tracking-[0.05em] font-medium">
                                <kbd className="px-1.5 py-0.5 border border-black/10 dark:border-white/10 rounded text-[9px]">
                                        /
                                </kbd>{" "}
                                to focus ·{" "}
                                <kbd className="px-1.5 py-0.5 border border-black/10 dark:border-white/10 rounded text-[9px]">
                                        ⇧ ↵
                                </kbd>{" "}
                                new line
                        </p>
                </form>
        );
};

export default EmptyChatMessageInput;
