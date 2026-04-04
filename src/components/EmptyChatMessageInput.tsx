import { ArrowUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import { useChat } from "@/lib/hooks/useChat";
import Attach from "./MessageInputActions/Attach";

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
                        {/* Mode selector tabs */}
                        <div className="flex items-center gap-1 mb-3 w-full px-1">
                                {[
                                        {
                                                key: "speed",
                                                label: "Speed",
                                                emoji: "⚡",
                                        },
                                        {
                                                key: "balanced",
                                                label: "Balanced",
                                                emoji: "⚖️",
                                        },
                                        {
                                                key: "quality",
                                                label: "Quality",
                                                emoji: "✨",
                                        },
                                ].map((mode) => (
                                        <button
                                                key={mode.key}
                                                type="button"
                                                onClick={() =>
                                                        setOptimizationMode(
                                                                mode.key as any,
                                                        )
                                                }
                                                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 ${
                                                        optimizationMode ===
                                                        mode.key
                                                                ? "bg-[#24A0ED]/10 text-[#24A0ED] border border-[#24A0ED]/20"
                                                                : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 border border-transparent hover:border-light-200 dark:hover:border-dark-200"
                                                }`}
                                        >
                                                <span>{mode.emoji}</span>
                                                <span>{mode.label}</span>
                                        </button>
                                ))}
                        </div>

                        {/* Input container */}
                        <div className="flex flex-col bg-white dark:bg-dark-secondary/80 px-4 py-3 rounded-2xl w-full border border-light-200 dark:border-dark-200 shadow-sm transition-all duration-300 focus-within:shadow-md focus-within:border-[#24A0ED]/30 focus-within:ring-4 focus-within:ring-[#24A0ED]/5 relative">
                                {/* Attached files preview row */}
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
                                        />
                                        <button
                                                disabled={
                                                        message.trim()
                                                                .length === 0
                                                }
                                                type="submit"
                                                className="flex-shrink-0 flex items-center justify-center h-8 w-8 ml-2 rounded-lg bg-[#24A0ED] text-white hover:bg-[#1a8cd8] transition-all duration-200 disabled:opacity-30 disabled:hover:bg-[#24A0ED]"
                                        >
                                                <ArrowUp
                                                        size={16}
                                                        strokeWidth={2.5}
                                                />
                                        </button>
                                </div>
                        </div>

                        <p className="text-[10px] text-black/30 dark:text-white/30 mt-3 tracking-[0.05em] font-medium">
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
