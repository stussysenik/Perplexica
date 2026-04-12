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
                activeClass: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-50 dark:bg-amber-500/10",
        },
        {
                key: "balanced",
                label: "Balanced",
                icon: Sliders,
                activeClass: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10",
        },
        {
                key: "quality",
                label: "Quality",
                icon: Star,
                activeClass: "text-blue-600 dark:text-blue-400 border-blue-500/30 bg-blue-50 dark:bg-blue-500/10",
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
                                className="flex items-center gap-1 mb-3 w-full px-0.5"
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
                                                                "flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-md transition-colors duration-150 border min-h-[32px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
                                                                isActive
                                                                        ? mode.activeClass
                                                                        : "text-[var(--text-muted)] border-[var(--border-primary)] hover:text-[var(--text-secondary)] hover:border-[var(--border-secondary)]",
                                                        )}
                                                >
                                                        <Icon size={12} aria-hidden="true" />
                                                        <span>{mode.label}</span>
                                                </button>
                                        );
                                })}
                        </div>

                        <div className="flex flex-col bg-[var(--bg-primary)] px-3 py-2.5 rounded-lg w-full border border-[var(--border-primary)] transition-colors duration-150 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/10 relative">
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
                                                className="bg-transparent placeholder:text-[13px] placeholder:text-[var(--text-muted)] text-[13px] text-[var(--text-primary)] resize-none focus:outline-none w-full max-h-32 py-1"
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
                                                className="flex-shrink-0 flex items-center justify-center h-7 w-7 ml-2 rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity duration-150 disabled:opacity-25 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                                        >
                                                <ArrowUp
                                                        size={14}
                                                        strokeWidth={2.5}
                                                        aria-hidden="true"
                                                />
                                        </button>
                                </div>
                        </div>

                        <p className="text-[10px] text-[var(--text-muted)] mt-2.5 tracking-tight font-medium">
                                <kbd className="px-1 py-0.5 border border-[var(--border-primary)] rounded text-[9px]">
                                        /
                                </kbd>{" "}
                                to focus ·{" "}
                                <kbd className="px-1 py-0.5 border border-[var(--border-primary)] rounded text-[9px]">
                                        ⇧ ↵
                                </kbd>{" "}
                                new line
                        </p>
                </form>
        );
};

export default EmptyChatMessageInput;
