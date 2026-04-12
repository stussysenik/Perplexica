import { cn } from "@/lib/utils";
import { ArrowUp, Zap, Sliders, Star } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import TextareaAutosize from "react-textarea-autosize";
import AttachSmall from "./MessageInputActions/AttachSmall";
import { useChat } from "@/lib/hooks/useChat";
import Optimization from "./MessageInputActions/Optimization";

const MessageInput = () => {
        const { loading, sendMessage, optimizationMode } = useChat();

        const [message, setMessage] = useState("");
        const [textareaRows, setTextareaRows] = useState(1);
        const [mode, setMode] = useState<"multi" | "single">("single");
        const [isDragging, setIsDragging] = useState(false);
        const inputRef = useRef<HTMLTextAreaElement | null>(null);

        useEffect(() => {
                if (textareaRows >= 2 && message && mode === "single") {
                        setMode("multi");
                } else if (!message && mode === "multi") {
                        setMode("single");
                }
        }, [textareaRows, mode, message]);

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
                return () =>
                        document.removeEventListener("keydown", handleKeyDown);
        }, []);

        const handleDragOver = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
        };

        const handleDragLeave = (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragging(false);
        };

        const handleDrop = async (e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(false);

                // Check for text drops
                const text = e.dataTransfer.getData("text");
                if (text) {
                        setMessage((prev) => prev + text);
                        return;
                }

                const droppedFiles = Array.from(e.dataTransfer.files);
                if (droppedFiles.length === 0) return;

                // File handling is done via the Attach component
        };

        const modeIcons: Record<string, React.ReactNode> = {
                speed: <Zap size={12} className="text-[#FF9800]" />,
                balanced: <Sliders size={12} className="text-[#4CAF50]" />,
                quality: <Star size={12} className="text-[#2196F3]" />,
        };

        return (
                <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="relative"
                >
                        {isDragging && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[var(--accent)] bg-[var(--accent)]/5 dark:bg-[var(--accent)]/10 backdrop-blur-sm">
                                        <p className="text-xs font-medium text-[var(--accent)]">
                                                Drop here
                                        </p>
                                </div>
                        )}
                        <form
                                onSubmit={(e) => {
                                        if (loading) return;
                                        e.preventDefault();
                                        sendMessage(message);
                                        setMessage("");
                                }}
                                onKeyDown={(e) => {
                                        if (
                                                e.key === "Enter" &&
                                                !e.shiftKey &&
                                                !loading
                                        ) {
                                                e.preventDefault();
                                                sendMessage(message);
                                                setMessage("");
                                        }
                                }}
                                className={cn(
                                        "relative bg-[var(--bg-primary)] p-2.5 sm:p-3 flex items-center overflow-visible border border-[var(--border-primary)] transition-colors duration-150 focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/10",
                                        mode === "multi"
                                                ? "flex-col rounded-lg"
                                                : "flex-row rounded-lg",
                                )}
                        >
                                {mode === "single" && (
                                        <div className="flex items-center gap-0.5 pl-1">
                                                <AttachSmall />
                                                <Optimization />
                                        </div>
                                )}
                                <TextareaAutosize
                                        ref={inputRef}
                                        value={message}
                                        onChange={(e) =>
                                                setMessage(e.target.value)
                                        }
                                        onHeightChange={(height, props) => {
                                                setTextareaRows(
                                                        Math.ceil(
                                                                height /
                                                                        props.rowHeight,
                                                        ),
                                                );
                                        }}
                                        className="bg-transparent placeholder:text-[var(--text-muted)] placeholder:text-[13px] text-[13px] text-[var(--text-primary)] resize-none focus:outline-none w-full px-1.5 max-h-24 lg:max-h-36 flex-grow flex-shrink"
                                        placeholder="Ask a follow-up..."
                                        aria-label="Message input"
                                />
                                {mode === "single" && (
                                        <button
                                                disabled={
                                                        message.trim()
                                                                .length === 0 ||
                                                        loading
                                                }
                                        className="bg-[var(--accent)] text-white disabled:opacity-25 hover:opacity-90 active:scale-95 transition-opacity duration-150 rounded-md p-1.5 mr-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                                        aria-label="Send message"
                                >
                                        <ArrowUp size={14} />
                                </button>
                                )}
                                {mode === "multi" && (
                                        <div className="flex flex-row items-center justify-between w-full pt-1.5">
                                                <div className="flex items-center gap-0.5">
                                                        <AttachSmall />
                                                        <Optimization />
                                                </div>
                                                <button
                                                        disabled={
                                                                message.trim()
                                                                        .length ===
                                                                        0 ||
                                                                loading
                                                        }
                                                        className="bg-[var(--accent)] text-white disabled:opacity-25 hover:opacity-90 active:scale-95 transition-opacity duration-150 rounded-md p-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                                                        aria-label="Send message"
                                                >
                                                        <ArrowUp size={16} />
                                                </button>
                                        </div>
                                )}
                        </form>
                </div>
        );
};

export default MessageInput;
