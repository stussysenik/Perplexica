"use client";

import { useEffect, useRef, useState } from "react";
import MessageInput from "./MessageInput";
import MessageBox from "./MessageBox";
import MessageBoxLoading from "./MessageBoxLoading";
import { useChat } from "@/lib/hooks/useChat";
import { motion, AnimatePresence } from "framer-motion";

const Chat = () => {
        const { sections, loading, messageAppeared, messages } = useChat();

        const [dividerWidth, setDividerWidth] = useState(0);
        const dividerRef = useRef<HTMLDivElement | null>(null);
        const messageEnd = useRef<HTMLDivElement | null>(null);
        const lastScrolledRef = useRef<number>(0);

        useEffect(() => {
                const updateDividerWidth = () => {
                        if (dividerRef.current) {
                                setDividerWidth(dividerRef.current.offsetWidth);
                        }
                };

                updateDividerWidth();

                const resizeObserver = new ResizeObserver(() => {
                        updateDividerWidth();
                });

                const currentRef = dividerRef.current;
                if (currentRef) {
                        resizeObserver.observe(currentRef);
                }

                window.addEventListener("resize", updateDividerWidth);

                return () => {
                        if (currentRef) {
                                resizeObserver.unobserve(currentRef);
                        }
                        resizeObserver.disconnect();
                        window.removeEventListener(
                                "resize",
                                updateDividerWidth,
                        );
                };
        }, [sections.length]);

        useEffect(() => {
                const scroll = () => {
                        messageEnd.current?.scrollIntoView({
                                behavior: "auto",
                        });
                };

                if (messages.length === 1) {
                        document.title = `${messages[0].query.substring(0, 30)} - Perplexica`;
                }

                if (sections.length > lastScrolledRef.current) {
                        scroll();
                        lastScrolledRef.current = sections.length;
                }
        }, [messages]);

        return (
                <div className="flex flex-col space-y-6 pt-4 pb-48 lg:pb-32">
                        <AnimatePresence initial={false}>
                                {sections.map((section, i) => {
                                        const isLast =
                                                i === sections.length - 1;

                                        return (
                                                <motion.div
                                                        key={
                                                                section.message
                                                                        .messageId
                                                        }
                                                        initial={{
                                                                opacity: 0,
                                                                y: 20,
                                                        }}
                                                        animate={{
                                                                opacity: 1,
                                                                y: 0,
                                                        }}
                                                        transition={{
                                                                duration: 0.4,
                                                                ease: [
                                                                        0.25,
                                                                        0.1,
                                                                        0.25, 1,
                                                                ],
                                                        }}
                                                        className="flex flex-col space-y-6"
                                                >
                                                        <MessageBox
                                                                section={
                                                                        section
                                                                }
                                                                sectionIndex={i}
                                                                dividerRef={
                                                                        isLast
                                                                                ? dividerRef
                                                                                : undefined
                                                                }
                                                                isLast={isLast}
                                                        />
                                                        {!isLast && (
                                                                <div className="h-px w-full bg-light-200 dark:bg-dark-200 mx-auto" />
                                                        )}
                                                </motion.div>
                                        );
                                })}
                        </AnimatePresence>
                        {loading && !messageAppeared && <MessageBoxLoading />}
                        <div ref={messageEnd} className="h-0" />
                        {dividerWidth > 0 && (
                                <div
                                        className="fixed z-40 bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 px-4 lg:px-0"
                                        style={{
                                                width: Math.min(
                                                        dividerWidth,
                                                        768,
                                                ),
                                        }}
                                >
                                        {/* Light mode gradient */}
                                        <div
                                                className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+24px+24px)] dark:hidden"
                                                style={{
                                                        background: "linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 35%, color-mix(in srgb, var(--bg-primary) 95%, transparent) 45%, color-mix(in srgb, var(--bg-primary) 85%, transparent) 55%, color-mix(in srgb, var(--bg-primary) 70%, transparent) 65%, color-mix(in srgb, var(--bg-primary) 50%, transparent) 75%, color-mix(in srgb, var(--bg-primary) 30%, transparent) 85%, color-mix(in srgb, var(--bg-primary) 10%, transparent) 92%, transparent 100%)",
                                                }}
                                        />
                                        {/* Dark mode gradient */}
                                        <div
                                                className="pointer-events-none absolute -bottom-6 left-0 right-0 h-[calc(100%+24px+24px)] hidden dark:block"
                                                style={{
                                                        background: "linear-gradient(to top, var(--bg-primary) 0%, var(--bg-primary) 35%, color-mix(in srgb, var(--bg-primary) 95%, transparent) 45%, color-mix(in srgb, var(--bg-primary) 85%, transparent) 55%, color-mix(in srgb, var(--bg-primary) 70%, transparent) 65%, color-mix(in srgb, var(--bg-primary) 50%, transparent) 75%, color-mix(in srgb, var(--bg-primary) 30%, transparent) 85%, color-mix(in srgb, var(--bg-primary) 10%, transparent) 92%, transparent 100%)",
                                                }}
                                        />
                                        <MessageInput />
                                </div>
                        )}
                </div>
        );
};

export default Chat;
