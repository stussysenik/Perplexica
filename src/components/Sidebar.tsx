"use client";

import { cn } from "@/lib/utils";
import { BookOpenText, Home, Search, Plus } from "lucide-react";
import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";
import React, { type ReactNode } from "react";
import SettingsButton from "./Settings/SettingsButton";
import ThemeSwitcher from "./theme/Switcher";

const Sidebar = ({ children }: { children: React.ReactNode }) => {
        const segments = useSelectedLayoutSegments();

        const navLinks = [
                {
                        icon: Home,
                        href: "/",
                        active: segments.length === 0 || segments.includes("c"),
                        label: "Home",
                },
                {
                        icon: Search,
                        href: "/discover",
                        active: segments.includes("discover"),
                        label: "Discover",
                },
                {
                        icon: BookOpenText,
                        href: "/library",
                        active: segments.includes("library"),
                        label: "Library",
                },
        ];

        return (
                <div>
                        {/* Desktop sidebar */}
                        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[72px] lg:flex-col">
                                <div className="flex grow flex-col items-center justify-between gap-y-5 bg-light-primary dark:bg-dark-primary border-r border-light-200 dark:border-dark-200 px-2 py-6">
                                        <div className="flex flex-col items-center gap-2">
                                                <a
                                                        className="p-2.5 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 transition-colors duration-200 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
                                                        href="/"
                                                        aria-label="New chat"
                                                >
                                                        <Plus
                                                                size={18}
                                                                className="cursor-pointer"
                                                                strokeWidth={
                                                                        2.5
                                                                }
                                                                aria-hidden="true"
                                                        />
                                                </a>
                                        </div>

                                        <div className="flex flex-col items-center w-full gap-1">
                                                {navLinks.map((link, i) => (
                                                        <Link
                                                                key={i}
                                                                href={link.href}
                                                                className={cn(
                                                                        "relative flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full py-2.5 rounded-xl transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2",
                                                                        link.active
                                                                                ? "text-[var(--accent)]"
                                                                                : "text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70",
                                                                )}
                                                        >
                                                                <div
                                                                        className={cn(
                                                                                "rounded-xl p-2 transition-colors duration-200",
                                                                                link.active &&
                                                                                        "bg-[var(--accent)]/10",
                                                                                !link.active &&
                                                                                        "hover:bg-light-secondary dark:hover:bg-dark-secondary",
                                                                        )}
                                                                >
                                                                        <link.icon
                                                                                size={
                                                                                        20
                                                                                }
                                                                                aria-hidden="true"
                                                                        />
                                                                </div>
                                                                <p className="text-[10px] font-medium">
                                                                        {
                                                                                link.label
                                                                        }
                                                                </p>
                                                        </Link>
                                                ))}
                                        </div>

                                        <div className="flex flex-col items-center gap-2">
                                                <ThemeSwitcher />
                                                <SettingsButton />
                                        </div>
                                </div>
                        </div>

                        {/* Mobile bottom navigation */}
                        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-light-200 dark:border-dark-200 bg-light-primary/95 dark:bg-dark-primary/95 backdrop-blur-md safe-bottom">
                                <div className="flex flex-row items-center justify-around px-2 py-2">
                                        {navLinks.map((link, i) => (
                                                <Link
                                                        href={link.href}
                                                        key={i}
                                                        className={cn(
                                                                "relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200",
                                                                link.active
                                                                        ? "text-[var(--accent)]"
                                                                        : "text-black/40 dark:text-white/40",
                                                        )}
                                                >
                                                        {link.active && (
                                                                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-[var(--accent)]" />
                                                        )}
                                                        <link.icon size={20} />
                                                        <p className="text-[10px] font-medium">
                                                                {link.label}
                                                        </p>
                                                </Link>
                                        ))}
                                </div>
                        </div>

                        {children}
                </div>
        );
};

export default Sidebar;
