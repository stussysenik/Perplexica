"use client";

import { useEffect, useState } from "react";
import { Atom, ForkKnife, Drop, Robot } from "@phosphor-icons/react";
import EmptyChatMessageInput from "./EmptyChatMessageInput";
import WeatherWidget from "./WeatherWidget";
import NewsArticleWidget from "./NewsArticleWidget";
import SettingsButtonMobile from "@/components/Settings/SettingsButtonMobile";
import {
        getShowNewsWidget,
        getShowWeatherWidget,
} from "@/lib/config/clientRegistry";
import { useChat } from "@/lib/hooks/useChat";
import DropZone from "./DropZone";

const suggestions = [
        { text: "What is quantum computing?", Icon: Atom },
        { text: "Best restaurants in Tokyo", Icon: ForkKnife },
        { text: "How does Elixir handle concurrency?", Icon: Drop },
        { text: "Latest AI research breakthroughs", Icon: Robot },
];

const EmptyChat = () => {
        const { sendMessage } = useChat();
        const [showWeather, setShowWeather] = useState(() =>
                typeof window !== "undefined" ? getShowWeatherWidget() : true,
        );
        const [showNews, setShowNews] = useState(() =>
                typeof window !== "undefined" ? getShowNewsWidget() : true,
        );

        useEffect(() => {
                const updateWidgetVisibility = () => {
                        setShowWeather(getShowWeatherWidget());
                        setShowNews(getShowNewsWidget());
                };

                updateWidgetVisibility();

                window.addEventListener(
                        "client-config-changed",
                        updateWidgetVisibility,
                );
                window.addEventListener("storage", updateWidgetVisibility);

                return () => {
                        window.removeEventListener(
                                "client-config-changed",
                                updateWidgetVisibility,
                        );
                        window.removeEventListener(
                                "storage",
                                updateWidgetVisibility,
                        );
                };
        }, []);

        return (
                <DropZone>
                        <div className="relative flex flex-col w-full lg:pl-[56px]">
                                <div className="absolute top-0 right-0 flex flex-row items-center justify-end pr-4 pt-4 z-10">
                                        <SettingsButtonMobile />
                                </div>
                                <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)]">
                                        <div className="flex flex-col items-center w-full max-w-xl mx-auto px-4 sm:px-6 py-8">
                                                <div className="flex flex-col items-center w-full">
                                                        <h1 className="text-[var(--text-primary)] text-3xl sm:text-4xl font-semibold mb-2 tracking-tight leading-tight">
                                                                Perplexica
                                                        </h1>
                                                        <p className="text-[var(--text-muted)] text-sm mb-8 text-center leading-relaxed max-w-sm">
                                                                Research-grade search with source traceability
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-8 max-w-lg">
                                                                {suggestions.map(
                                                                        (s, i) => (
                                                                                <button
                                                                                        key={i}
                                                                                        onClick={() =>
                                                                                                sendMessage(
                                                                                                        s.text,
                                                                                                )
                                                                                        }
                                                                                        aria-label={s.text}
                                                                                        className="min-h-[44px] flex items-center gap-2.5 px-3 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-primary)] rounded-md text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-secondary)] transition-colors duration-150 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                                                                                >
                                                                                        <span className="flex-shrink-0 text-[var(--text-muted)]">
                                                                                                <s.Icon size={16} weight="bold" />
                                                                                        </span>
                                                                                        <span className="truncate leading-snug text-[13px]">
                                                                                                {
                                                                                                        s.text
                                                                                                }
                                                                                        </span>
                                                                                </button>
                                                                        ),
                                                                )}
                                                        </div>
                                                        <EmptyChatMessageInput />
                                                </div>
                                                {(showWeather || showNews) && (
                                                        <div className="flex flex-col w-full gap-3 mt-4 sm:flex-row sm:justify-center">
                                                                {showWeather && (
                                                                        <div className="flex-1 w-full">
                                                                                <WeatherWidget />
                                                                        </div>
                                                                )}
                                                                {showNews && (
                                                                        <div className="flex-1 w-full">
                                                                                <NewsArticleWidget />
                                                                        </div>
                                                                )}
                                                        </div>
                                                )}
                                        </div>
                                </div>
                        </div>
                </DropZone>
        );
};

export default EmptyChat;
