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
                        <button className={`p-2 rounded-lg ${className || ""}`}>
                                <div className="w-4 h-4" />
                        </button>
                );
        }

        return (
                <button
                        onClick={handleThemeSwitch}
                        className={`p-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white ${className || ""}`}
                        title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                >
                        {theme === "dark" ? (
                                <Sun size={16} />
                        ) : (
                                <Moon size={16} />
                        )}
                </button>
        );
};

export default ThemeSwitcher;
