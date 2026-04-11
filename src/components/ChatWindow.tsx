"use client";

import Navbar from "./Navbar";
import Chat from "./Chat";
import EmptyChat from "./EmptyChat";
import NextError from "next/error";
import { useChat } from "@/lib/hooks/useChat";
import SettingsButtonMobile from "./Settings/SettingsButtonMobile";
import { Block } from "@/lib/types";
import Loader from "./ui/Loader";
import DropZone from "./DropZone";
import { useEffect, useState } from "react";

export interface BaseMessage {
        chatId: string;
        messageId: string;
        createdAt: Date;
}

export interface Message extends BaseMessage {
        backendId: string;
        query: string;
        responseBlocks: Block[];
        status: "answering" | "completed" | "error";
        parentId?: string | null;
        branchIndex?: number;
        siblings?: Message[];
        isCompacted?: boolean;
        compactSummary?: string;
}

export interface File {
        fileName: string;
        fileExtension: string;
        fileId: string;
}

export interface Widget {
        widgetType: string;
        params: Record<string, any>;
}

const ChatWindow = () => {
        const { hasError, notFound, messages, isReady } = useChat();
        const [elapsedMs, setElapsedMs] = useState(0);

        useEffect(() => {
                if (isReady) return;
                const now = Date.now();
                const interval = setInterval(() => {
                        setElapsedMs(Date.now() - now);
                }, 100);
                return () => clearInterval(interval);
        }, [isReady]);

        if (hasError) {
                return (
                        <DropZone>
                                <div className="relative">
                                        <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
                                                <SettingsButtonMobile />
                                        </div>
                                        <div className="flex flex-col items-center justify-center min-h-screen">
                                                <p className="dark:text-white/70 text-black/70 text-sm">
                                                        Failed to connect to the
                                                        server. Please try again
                                                        later.
                                                </p>
                                        </div>
                                </div>
                        </DropZone>
                );
        }

        return (
                <DropZone>
                        {isReady ? (
                                notFound ? (
                                        <NextError statusCode={404} />
                                ) : (
                                        <div>
                                                {messages.length > 0 ? (
                                                        <>
                                                                <Navbar />
                                                                <Chat />
                                                        </>
                                                ) : (
                                                        <EmptyChat />
                                                )}
                                        </div>
                                )
                        ) : (
                                <div className="flex flex-col items-center justify-center min-h-screen w-full gap-3" role="status" aria-label="Initializing chat">
                                        <Loader />
                                        <p className="text-xs text-black/40 dark:text-white/40 tabular-nums">
                                                Initializing… {(elapsedMs / 1000).toFixed(1)}s
                                        </p>
                                </div>
                        )}
                </DropZone>
        );
};

export default ChatWindow;
