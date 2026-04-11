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
                        <div className="relative flex flex-col w-full lg:pl-[72px]">
                                <div className="absolute top-0 right-0 flex flex-row items-center justify-end pr-4 pt-4 z-10">
                                        <SettingsButtonMobile />
                                </div>
                                <div className="flex flex-col items-center justify-center min-h-[100dvh] w-full">
                                        <div className="flex flex-col items-center w-full max-w-2xl mx-auto px-5 sm:px-6 py-8">
                                                <div className="flex flex-col items-center w-full">
                                                        <h1 className="text-black dark:text-white text-4xl sm:text-5xl md:text-6xl font-semibold mb-4 tracking-tight leading-none">
                                                                Perplexica
                                                        </h1>
                                                        <p className="text-black/50 dark:text-white/50 text-base sm:text-lg mb-10 sm:mb-12 text-center leading-relaxed max-w-md">
                                                                Research-grade search
                                                                with source traceability
                                                        </p>
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mb-10 sm:mb-12 max-w-lg px-1 sm:px-2">
                                                                {suggestions.map(
                                                                        (s, i) => (
                                                                                <button
                                                                                        key={
                                                                                                i
                                                                                        }
                                                                                        onClick={() =>
                                                                                                sendMessage(
                                                                                                        s.text,
                                                                                                )
                                                                                        }
                                                                                        aria-label={s.text}
                                                                                        className="min-h-[48px] flex items-center gap-3 px-5 py-3.5 bg-light-secondary/50 dark:bg-dark-secondary/50 border border-light-200 dark:border-dark-200 rounded-xl text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-secondary dark:hover:bg-dark-secondary hover:border-light-300 dark:hover:border-dark-300 transition-colors duration-200 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                                                                                >
                                                                                        <span className="text-lg flex-shrink-0 text-black/40 dark:text-white/40">
                                                                                                <s.Icon size={20} weight="bold" />
                                                                                        </span>
                                                                                        <span className="truncate leading-snug">
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
                                                        <div className="flex flex-col w-full gap-4 mt-6 sm:flex-row sm:justify-center">
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
