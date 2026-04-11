"use client";

import { Globe2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ArticleCard from "@/components/Discover/ArticleCard";

export interface Discover {
        title: string;
        content: string;
        url: string;
        thumbnail: string;
}

const topics: { key: string; display: string }[] = [
        { display: "Tech & Science", key: "tech" },
        { display: "Finance", key: "finance" },
        { display: "Art & Culture", key: "art" },
        { display: "Sports", key: "sports" },
        { display: "Entertainment", key: "entertainment" },
];

const Page = () => {
        const [discover, setDiscover] = useState<Discover[] | null>(null);
        const [loading, setLoading] = useState(true);
        const [activeTopic, setActiveTopic] = useState<string>(topics[0].key);
        const [elapsedMs, setElapsedMs] = useState(0);

        const fetchArticles = async (topic: string) => {
                setLoading(true);
                setElapsedMs(0);
                const now = Date.now();

                const interval = setInterval(() => {
                        setElapsedMs(Date.now() - now);
                }, 100);

                try {
                        const res = await fetch(
                                `/api/discover?topic=${topic}`,
                                {
                                        method: "GET",
                                        headers: {
                                                "Content-Type":
                                                        "application/json",
                                        },
                                },
                        );

                        const data = await res.json();

                        if (!res.ok) {
                                throw new Error(data.message);
                        }

                        data.blogs = data.blogs.filter(
                                (blog: Discover) => blog.thumbnail,
                        );
                        setDiscover(data.blogs);
                } catch (err: any) {
                        console.error("Error fetching data:", err.message);
                        toast.error("Error fetching data");
                } finally {
                        setLoading(false);
                        clearInterval(interval);
                }
        };

        useEffect(() => {
                fetchArticles(activeTopic);
        }, [activeTopic]);

        return (
                <div>
                        <div className="flex flex-col pt-10 pb-6">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
                                        <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[var(--accent)]/10">
                                                        <Globe2Icon
                                                                size={22}
                                                                className="text-[var(--accent)]"
                                                                aria-hidden="true"
                                                        />
                                                </div>
                                                <h1
                                                        className="text-3xl sm:text-4xl font-light"
                                                        style={{
                                                                fontFamily: "PP Editorial, serif",
                                                        }}
                                                >
                                                        Discover
                                                </h1>
                                        </div>
                                        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none" role="tablist" aria-label="Article topics">
                                                {topics.map((t) => (
                                                        <button
                                                                key={t.key}
                                                                role="tab"
                                                                aria-selected={activeTopic === t.key}
                                                                className={cn(
                                                                        "min-h-[36px] rounded-full text-xs font-medium px-4 py-2 text-nowrap transition-colors duration-200 cursor-pointer border focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]",
                                                                        activeTopic ===
                                                                                t.key
                                                                                ? "text-[var(--accent)] bg-[var(--accent)]/10 border-[var(--accent)]/20"
                                                                                : "border-light-200 dark:border-dark-200 text-black/50 dark:text-white/50 hover:text-black/80 dark:hover:text-white/80 hover:border-light-300 dark:hover:border-dark-300",
                                                                )}
                                                                onClick={() =>
                                                                        setActiveTopic(
                                                                                t.key,
                                                                        )
                                                                }
                                                        >
                                                                {t.display}
                                                        </button>
                                                ))}
                                        </div>
                                </div>
                        </div>

                        {loading ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3" role="status" aria-label="Loading articles">
                                        <div className="w-6 h-6 border-2 border-light-200 dark:border-dark-200 border-t-[var(--accent)] rounded-full animate-spin" />
                                        <p className="text-xs text-black/40 dark:text-white/40 tabular-nums">
                                                Loading articles… {(elapsedMs / 1000).toFixed(1)}s
                                        </p>
                                </div>
                        ) : !discover || discover.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-light-secondary dark:bg-dark-secondary mb-4">
                                                <Globe2Icon
                                                        className="text-black/40 dark:text-white/40"
                                                        size={20}
                                                        aria-hidden="true"
                                                />
                                        </div>
                                        <p className="text-black/50 dark:text-white/50 text-sm font-medium">
                                                No articles found for this topic.
                                        </p>
                                </div>
                        ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pb-28 lg:pb-10">
                                        {discover.map((item, i) => (
                                                <ArticleCard
                                                        key={i}
                                                        item={item}
                                                />
                                        ))}
                                </div>
                        )}
                </div>
        );
};

export default Page;
