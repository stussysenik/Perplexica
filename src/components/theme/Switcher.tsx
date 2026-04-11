"use client";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

type Theme = "dark" | "light";

const ThemeSwitcher = ({ className }: { className?: string }) => {
        const [mounted, setMounted] = useState(false);
        const { theme, setTheme } = useTheme();

        const handleThemeSwitch = () => {
                const root = document.documentElement;
                root.classList.add("theme-transitioning");
                setTheme(theme === "dark" ? "light" : "dark");
                setTimeout(
                        () => root.classList.remove("theme-transitioning"),
                        300,
                );
        };

        useEffect(() => {
                setMounted(true);
        }, []);

        if (!mounted) {
                return (
                        <button className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg ${className || ""}`} aria-label="Toggle theme">
                                <div className="w-4 h-4" />
                        </button>
                );
        }

        return (
                <button
                        onClick={handleThemeSwitch}
                        className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary ${className || ""}`}
                        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                        {theme === "dark" ? (
                                <Sun size={16} aria-hidden="true" />
                        ) : (
                                <Moon size={16} aria-hidden="true" />
                        )}
                </button>
        );
};

export default ThemeSwitcher;
