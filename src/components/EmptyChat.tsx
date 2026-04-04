"use client";

import { useEffect, useState } from "react";
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
        { text: "What is quantum computing?", icon: "⚛️" },
        { text: "Best restaurants in Tokyo", icon: "🍜" },
        { text: "How does Elixir handle concurrency?", icon: "💧" },
        { text: "Latest AI research breakthroughs", icon: "🤖" },
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
                        <div className="relative">
                                <div className="absolute w-full flex flex-row items-center justify-end pr-4 pt-4 z-10">
                                        <SettingsButtonMobile />
                                </div>
                                <div className="flex flex-col items-center justify-center min-h-[100dvh] max-w-2xl mx-auto px-4 py-8 lg:py-16">
                                        <div className="flex flex-col items-center w-full">
                                                <h2 className="text-black dark:text-white text-4xl sm:text-5xl font-semibold mt-4 mb-2 tracking-tight">
                                                        Perplexica
                                                </h2>
                                                <p className="text-black/50 dark:text-white/50 text-sm mb-8">
                                                        Research-grade search
                                                        with source traceability
                                                </p>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full mb-8 max-w-xl px-2">
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
                                                                                className="flex items-center gap-2 px-4 py-3 bg-light-secondary/50 dark:bg-dark-secondary/50 border border-light-200 dark:border-dark-200 rounded-xl text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white hover:bg-light-secondary dark:hover:bg-dark-secondary hover:border-light-300 dark:hover:border-dark-300 transition-all duration-200 text-left"
                                                                        >
                                                                                <span className="text-base flex-shrink-0">
                                                                                        {
                                                                                                s.icon
                                                                                        }
                                                                                </span>
                                                                                <span className="truncate">
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
                </DropZone>
        );
};

export default EmptyChat;
