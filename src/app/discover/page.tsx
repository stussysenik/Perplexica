"use client";

import { Globe2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import SmallNewsCard from "@/components/Discover/SmallNewsCard";

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

        const fetchArticles = async (topic: string) => {
                setLoading(true);
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
                }
        };

        useEffect(() => {
                fetchArticles(activeTopic);
        }, [activeTopic]);

        return (
                <div>
                        <div className="flex flex-col pt-8 pb-4">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#24A0ED]/10">
                                                        <Globe2Icon
                                                                size={22}
                                                                className="text-[#24A0ED]"
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
                                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 scrollbar-none">
                                                {topics.map((t, i) => (
                                                        <button
                                                                key={i}
                                                                className={cn(
                                                                        "rounded-full text-xs font-medium px-3 py-1.5 text-nowrap transition-all duration-200 cursor-pointer border",
                                                                        activeTopic ===
                                                                                t.key
                                                                                ? "text-[#24A0ED] bg-[#24A0ED]/10 border-[#24A0ED]/20"
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
                                <div className="flex items-center justify-center min-h-[60vh]">
                                        <div className="w-6 h-6 border-2 border-light-200 dark:border-dark-200 border-t-[#24A0ED] rounded-full animate-spin" />
                                </div>
                        ) : !discover || discover.length === 0 ? (
                                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                                        <p className="text-black/40 dark:text-white/40 text-sm">
                                                No articles found for this
                                                topic.
                                        </p>
                                </div>
                        ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pb-24 lg:pb-8">
                                        {discover.map((item, i) => (
                                                <SmallNewsCard
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
