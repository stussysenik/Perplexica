"use client";

import DeleteChat from "@/components/DeleteChat";
import { formatTimeDifference } from "@/lib/utils";
import {
        BookOpenText,
        ClockIcon,
        FileText,
        Globe2Icon,
        Plus,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export interface Chat {
        id: string;
        title: string;
        createdAt: string;
        sources: string[];
        files: { fileId: string; name: string }[];
}

const Page = () => {
        const [chats, setChats] = useState<Chat[]>([]);
        const [loading, setLoading] = useState(true);

        useEffect(() => {
                const fetchChats = async () => {
                        setLoading(true);

                        const res = await fetch(`/api/chats`, {
                                method: "GET",
                                headers: {
                                        "Content-Type": "application/json",
                                },
                        });

                        const data = await res.json();

                        setChats(data.chats);
                        setLoading(false);
                };

                fetchChats();
        }, []);

        return (
                <div>
                        <div className="flex flex-col pt-8 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#24A0ED]/10">
                                                        <BookOpenText
                                                                size={22}
                                                                className="text-[#24A0ED]"
                                                        />
                                                </div>
                                                <div>
                                                        <h1
                                                                className="text-3xl sm:text-4xl font-light"
                                                                style={{
                                                                        fontFamily: "PP Editorial, serif",
                                                                }}
                                                        >
                                                                Library
                                                        </h1>
                                                </div>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-black/40 dark:text-white/40">
                                                <span className="inline-flex items-center gap-1 rounded-full border border-light-200 dark:border-dark-200 px-2.5 py-1">
                                                        <BookOpenText
                                                                size={12}
                                                        />
                                                        {loading
                                                                ? "…"
                                                                : `${chats.length} ${chats.length === 1 ? "chat" : "chats"}`}
                                                </span>
                                        </div>
                                </div>
                        </div>

                        {loading ? (
                                <div className="flex items-center justify-center min-h-[60vh]">
                                        <div className="w-6 h-6 border-2 border-light-200 dark:border-dark-200 border-t-[#24A0ED] rounded-full animate-spin" />
                                </div>
                        ) : chats.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-light-secondary dark:bg-dark-secondary mb-3">
                                                <BookOpenText
                                                        className="text-black/40 dark:text-white/40"
                                                        size={20}
                                                />
                                        </div>
                                        <p className="text-black/50 dark:text-white/50 text-sm font-medium">
                                                No chats yet
                                        </p>
                                        <p className="text-black/30 dark:text-white/30 text-sm mt-1">
                                                <Link
                                                        href="/"
                                                        className="text-[#24A0ED] hover:underline"
                                                >
                                                        Start a new chat
                                                </Link>{" "}
                                                to see it listed here
                                        </p>
                                </div>
                        ) : (
                                <div className="pb-24 lg:pb-8">
                                        <div className="flex flex-col gap-1">
                                                {chats.map((chat) => {
                                                        const sourcesLabel =
                                                                chat.sources
                                                                        .length ===
                                                                0
                                                                        ? null
                                                                        : chat
                                                                                    .sources
                                                                                    .length <=
                                                                            2
                                                                          ? chat.sources
                                                                                    .map(
                                                                                            (
                                                                                                    s,
                                                                                            ) =>
                                                                                                    s
                                                                                                            .charAt(
                                                                                                                    0,
                                                                                                            )
                                                                                                            .toUpperCase() +
                                                                                                    s.slice(
                                                                                                            1,
                                                                                                    ),
                                                                                    )
                                                                                    .join(
                                                                                            ", ",
                                                                                    )
                                                                          : `${chat.sources
                                                                                    .slice(
                                                                                            0,
                                                                                            2,
                                                                                    )
                                                                                    .map(
                                                                                            (
                                                                                                    s,
                                                                                            ) =>
                                                                                                    s
                                                                                                            .charAt(
                                                                                                                    0,
                                                                                                            )
                                                                                                            .toUpperCase() +
                                                                                                    s.slice(
                                                                                                            1,
                                                                                                    ),
                                                                                    )
                                                                                    .join(
                                                                                            ", ",
                                                                                    )} +${chat.sources.length - 2}`;

                                                        return (
                                                                <div
                                                                        key={
                                                                                chat.id
                                                                        }
                                                                        className="group flex flex-col gap-2 p-3 sm:p-4 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200"
                                                                >
                                                                        <div className="flex items-start justify-between gap-3">
                                                                                <Link
                                                                                        href={`/c/${chat.id}`}
                                                                                        className="flex-1 text-black dark:text-white text-sm sm:text-base font-medium leading-snug line-clamp-2 group-hover:text-[#24A0ED] transition-colors duration-200"
                                                                                        title={
                                                                                                chat.title
                                                                                        }
                                                                                >
                                                                                        {
                                                                                                chat.title
                                                                                        }
                                                                                </Link>
                                                                                <div className="shrink-0 pt-0.5">
                                                                                        <DeleteChat
                                                                                                chatId={
                                                                                                        chat.id
                                                                                                }
                                                                                                chats={
                                                                                                        chats
                                                                                                }
                                                                                                setChats={
                                                                                                        setChats
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                        </div>

                                                                        <div className="flex flex-wrap items-center gap-1.5 text-black/40 dark:text-white/40">
                                                                                <span className="inline-flex items-center gap-1 text-[11px]">
                                                                                        <ClockIcon
                                                                                                size={
                                                                                                        12
                                                                                                }
                                                                                        />
                                                                                        {formatTimeDifference(
                                                                                                new Date(),
                                                                                                chat.createdAt,
                                                                                        )}{" "}
                                                                                        ago
                                                                                </span>

                                                                                {sourcesLabel && (
                                                                                        <span className="inline-flex items-center gap-1 text-[11px] border border-light-200 dark:border-dark-200 rounded-full px-2 py-0.5">
                                                                                                <Globe2Icon
                                                                                                        size={
                                                                                                                11
                                                                                                        }
                                                                                                />
                                                                                                {
                                                                                                        sourcesLabel
                                                                                                }
                                                                                        </span>
                                                                                )}
                                                                                {chat
                                                                                        .files
                                                                                        .length >
                                                                                        0 && (
                                                                                        <span className="inline-flex items-center gap-1 text-[11px] border border-light-200 dark:border-dark-200 rounded-full px-2 py-0.5">
                                                                                                <FileText
                                                                                                        size={
                                                                                                                11
                                                                                                        }
                                                                                                />
                                                                                                {
                                                                                                        chat
                                                                                                                .files
                                                                                                                .length
                                                                                                }{" "}
                                                                                                {chat
                                                                                                        .files
                                                                                                        .length ===
                                                                                                1
                                                                                                        ? "file"
                                                                                                        : "files"}
                                                                                        </span>
                                                                                )}
                                                                        </div>
                                                                </div>
                                                        );
                                                })}
                                        </div>
                                </div>
                        )}
                </div>
        );
};

export default Page;
