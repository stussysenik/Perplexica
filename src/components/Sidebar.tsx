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
                        <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[56px] lg:flex-col">
                                <div className="flex grow flex-col items-center justify-between gap-y-5 bg-[var(--bg-primary)] border-r border-[var(--border-primary)] px-1.5 py-4">
                                        <div className="flex flex-col items-center gap-2">
                                                <a
                                                        className="p-2 rounded-md bg-[var(--accent)] text-white hover:opacity-90 transition-opacity duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
                                                        href="/"
                                                        aria-label="New chat"
                                                >
                                                        <Plus
                                                                size={16}
                                                                className="cursor-pointer"
                                                                strokeWidth={2}
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
                                                                        "flex flex-col items-center justify-center gap-0.5 cursor-pointer w-full py-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1",
                                                                        link.active
                                                                                ? "text-[var(--accent)]"
                                                                                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]",
                                                                )}
                                                        >
                                                                <div
                                                                        className={cn(
                                                                                "rounded-md p-1.5 transition-colors duration-150",
                                                                                link.active &&
                                                                                        "bg-[var(--accent-subtle)]",
                                                                                !link.active &&
                                                                                        "hover:bg-[var(--bg-secondary)]",
                                                                        )}
                                                                >
                                                                        <link.icon
                                                                                size={18}
                                                                                strokeWidth={link.active ? 2 : 1.5}
                                                                                aria-hidden="true"
                                                                        />
                                                                </div>
                                                                <p className="text-[9px] font-medium tracking-tight">
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
                        <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden border-t border-[var(--border-primary)] bg-[var(--bg-primary)] safe-bottom">
                                <div className="flex flex-row items-center justify-around px-2 py-1.5">
                                        {navLinks.map((link, i) => (
                                                <Link
                                                        href={link.href}
                                                        key={i}
                                                        className={cn(
                                                                "flex flex-col items-center gap-0.5 py-1.5 px-5 transition-colors duration-150",
                                                                link.active
                                                                        ? "text-[var(--accent)]"
                                                                        : "text-[var(--text-muted)]",
                                                        )}
                                                >
                                                        <link.icon size={18} strokeWidth={link.active ? 2 : 1.5} />
                                                        <p className="text-[10px] font-medium tracking-tight">
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
