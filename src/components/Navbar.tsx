"use client";

import { Clock, Edit, Share, Trash, FileText, FileDown, FileJson, Table } from "lucide-react";
import { Message } from "./ChatWindow";
import { useEffect, useState, Fragment } from "react";
import { formatTimeDifference } from "@/lib/utils";
import DeleteChat from "./DeleteChat";
import {
        Popover,
        PopoverButton,
        PopoverPanel,
        Transition,
} from "@headlessui/react";
import jsPDF from "jspdf";
import { useChat, Section } from "@/lib/hooks/useChat";
import { SourceBlock } from "@/lib/types";

const downloadFile = (filename: string, content: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
        }, 0);
};

const exportAsMarkdown = (sections: Section[], title: string) => {
        const date = new Date(
                sections[0].message.createdAt || Date.now(),
        ).toLocaleString();
        let md = `# Chat Export: ${title}\n\n`;
        md += `*Exported on: ${date}*\n\n---\n`;

        sections.forEach((section, idx) => {
                md += `\n---\n`;
                md += `**User**
`;
                md += `*${new Date(section.message.createdAt).toLocaleString()}*\n\n`;
                md += `> ${section.message.query.replace(/\n/g, "\n> ")}\n`;

                if (section.message.responseBlocks.length > 0) {
                        md += `\n---\n`;
                        md += `**Assistant**
`;
                        md += `*${new Date(section.message.createdAt).toLocaleString()}*\n\n`;
                        md += `> ${section.message.responseBlocks
                                .filter((b) => b.type === "text")
                                .map((block) => block.data)
                                .join("\n")
                                .replace(/\n/g, "\n> ")}\n`;
                }

                const sourceResponseBlock = section.message.responseBlocks.find(
                        (block) => block.type === "source",
                ) as SourceBlock | undefined;

                if (
                        sourceResponseBlock &&
                        sourceResponseBlock.data &&
                        sourceResponseBlock.data.length > 0
                ) {
                        md += `\n**Citations:**\n`;
                        sourceResponseBlock.data.forEach(
                                (src: any, i: number) => {
                                        const url = src.metadata?.url || "";
                                        md += `- [${i + 1}] [${url}](${url})\n`;
                                },
                        );
                }
        });
        md += "\n---\n";
        downloadFile(`${title || "chat"}.md`, md, "text/markdown");
};

const exportAsPDF = (sections: Section[], title: string) => {
        const doc = new jsPDF();
        const date = new Date(
                sections[0]?.message?.createdAt || Date.now(),
        ).toLocaleString();
        let y = 15;
        const pageHeight = doc.internal.pageSize.height;
        doc.setFontSize(18);
        doc.text(`Chat Export: ${title}`, 10, y);
        y += 8;
        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(`Exported on: ${date}`, 10, y);
        y += 8;
        doc.setDrawColor(200);
        doc.line(10, y, 200, y);
        y += 6;
        doc.setTextColor(30);

        sections.forEach((section, idx) => {
                if (y > pageHeight - 30) {
                        doc.addPage();
                        y = 15;
                }
                doc.setFont("helvetica", "bold");
                doc.text("User", 10, y);
                doc.setFont("helvetica", "normal");
                doc.setFontSize(10);
                doc.setTextColor(120);
                doc.text(
                        `${new Date(section.message.createdAt).toLocaleString()}`,
                        40,
                        y,
                );
                y += 6;
                doc.setTextColor(30);
                doc.setFontSize(12);
                const userLines = doc.splitTextToSize(
                        section.message.query,
                        180,
                );
                for (let i = 0; i < userLines.length; i++) {
                        if (y > pageHeight - 20) {
                                doc.addPage();
                                y = 15;
                        }
                        doc.text(userLines[i], 12, y);
                        y += 6;
                }
                y += 6;
                doc.setDrawColor(230);
                if (y > pageHeight - 10) {
                        doc.addPage();
                        y = 15;
                }
                doc.line(10, y, 200, y);
                y += 4;

                if (section.message.responseBlocks.length > 0) {
                        if (y > pageHeight - 30) {
                                doc.addPage();
                                y = 15;
                        }
                        doc.setFont("helvetica", "bold");
                        doc.text("Assistant", 10, y);
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(120);
                        doc.text(
                                `${new Date(section.message.createdAt).toLocaleString()}`,
                                40,
                                y,
                        );
                        y += 6;
                        doc.setTextColor(30);
                        doc.setFontSize(12);
                        const assistantLines = doc.splitTextToSize(
                                section.parsedTextBlocks.join("\n"),
                                180,
                        );
                        for (let i = 0; i < assistantLines.length; i++) {
                                if (y > pageHeight - 20) {
                                        doc.addPage();
                                        y = 15;
                                }
                                doc.text(assistantLines[i], 12, y);
                                y += 6;
                        }

                        const sourceResponseBlock =
                                section.message.responseBlocks.find(
                                        (block) => block.type === "source",
                                ) as SourceBlock | undefined;

                        if (
                                sourceResponseBlock &&
                                sourceResponseBlock.data &&
                                sourceResponseBlock.data.length > 0
                        ) {
                                doc.setFontSize(11);
                                doc.setTextColor(80);
                                if (y > pageHeight - 20) {
                                        doc.addPage();
                                        y = 15;
                                }
                                doc.text("Citations:", 12, y);
                                y += 5;
                                sourceResponseBlock.data.forEach(
                                        (src: any, i: number) => {
                                                const url =
                                                        src.metadata?.url || "";
                                                if (y > pageHeight - 15) {
                                                        doc.addPage();
                                                        y = 15;
                                                }
                                                doc.text(
                                                        `- [${i + 1}] ${url}`,
                                                        15,
                                                        y,
                                                );
                                                y += 5;
                                        },
                                );
                                doc.setTextColor(30);
                        }
                        y += 6;
                        doc.setDrawColor(230);
                        if (y > pageHeight - 10) {
                                doc.addPage();
                                y = 15;
                        }
                        doc.line(10, y, 200, y);
                        y += 4;
                }
        });
        doc.save(`${title || "chat"}.pdf`);
};

const Navbar = () => {
        const [title, setTitle] = useState<string>("");
        const [timeAgo, setTimeAgo] = useState<string>("");

        const { sections, chatId } = useChat();

        useEffect(() => {
                if (sections.length > 0 && sections[0].message) {
                        const newTitle =
                                sections[0].message.query.length > 30
                                        ? `${sections[0].message.query.substring(0, 30).trim()}...`
                                        : sections[0].message.query ||
                                          "New Conversation";

                        setTitle(newTitle);
                        const newTimeAgo = formatTimeDifference(
                                new Date(),
                                sections[0].message.createdAt,
                        );
                        setTimeAgo(newTimeAgo);
                }
        }, [sections]);

        useEffect(() => {
                const intervalId = setInterval(() => {
                        if (sections.length > 0 && sections[0].message) {
                                const newTimeAgo = formatTimeDifference(
                                        new Date(),
                                        sections[0].message.createdAt,
                                );
                                setTimeAgo(newTimeAgo);
                        }
                }, 1000);

                return () => clearInterval(intervalId);
                // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        return (
                <div className="sticky top-0 z-40 bg-[var(--bg-primary)] border-b border-[var(--border-primary)]">
                        <div className="px-3 lg:px-4 py-2.5">
                                <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 min-w-0 flex-shrink-0">
                                                <a
                                                        href="/"
                                                        className="lg:hidden p-1.5 -ml-1 rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                                                        aria-label="New chat"
                                                >
                                                        <Edit
                                                                size={14}
                                                                className="text-[var(--text-muted)]"
                                                                aria-hidden="true"
                                                        />
                                                </a>
                                                <div className="hidden lg:flex items-center gap-1.5 text-[var(--text-muted)]">
                                                        <Clock size={11} aria-hidden="true" />
                                                        <span className="text-[10px] tabular-nums">
                                                                {timeAgo} ago
                                                        </span>
                                                </div>
                                        </div>

                                        <div className="flex-1 min-w-0">
                                                <h1 className="text-center text-[13px] font-medium text-[var(--text-secondary)] truncate">
                                                        {title ||
                                                                "New Conversation"}
                                                </h1>
                                        </div>

                                        <div className="flex items-center gap-0.5 flex-shrink-0">
                                                <Popover className="relative">
                                                        <PopoverButton className="p-1.5 rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]" aria-label="Export conversation">
                                                                <Share
                                                                        size={
                                                                                14
                                                                        }
                                                                        className="text-[var(--text-muted)]"
                                                                        aria-hidden="true"
                                                                />
                                                        </PopoverButton>
                                                        <Transition
                                                                as={Fragment}
                                                                enter="transition ease-out duration-200"
                                                                enterFrom="opacity-0 translate-y-1"
                                                                enterTo="opacity-100 translate-y-0"
                                                                leave="transition ease-in duration-150"
                                                                leaveFrom="opacity-100 translate-y-0"
                                                                leaveTo="opacity-0 translate-y-1"
                                                        >
                                                                <PopoverPanel className="absolute right-0 mt-1.5 w-52 origin-top-right rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] shadow-sm z-50 overflow-hidden">
                                                                        <div className="p-1.5">
                                                                                <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 pt-0.5 pb-1.5">
                                                                                        Export
                                                                                </p>
                                                                                <button
                                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                                                                                        onClick={() =>
                                                                                                exportAsMarkdown(
                                                                                                        sections,
                                                                                                        title ||
                                                                                                                "",
                                                                                                )
                                                                                        }
                                                                                >
                                                                                        <FileText
                                                                                                size={
                                                                                                        13
                                                                                                }
                                                                                                className="text-[var(--accent)]"
                                                                                                aria-hidden="true"
                                                                                        />
                                                                                        <div>
                                                                                                <p className="text-[12px] font-medium text-[var(--text-primary)]">
                                                                                                        Markdown
                                                                                                </p>
                                                                                                <p className="text-[10px] text-[var(--text-muted)]">
                                                                                                        .md
                                                                                                        file
                                                                                                </p>
                                                                                        </div>
                                                                                </button>
                                                                                <button
                                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                                                                                        onClick={() => {
                                                                                                window.open(`/api/chats/${chatId}/export?format=json`, '_blank');
                                                                                        }}
                                                                                >
                                                                                        <FileJson
                                                                                                size={
                                                                                                        13
                                                                                                }
                                                                                                className="text-[var(--accent)]"
                                                                                                aria-hidden="true"
                                                                                        />
                                                                                        <div>
                                                                                                <p className="text-[12px] font-medium text-[var(--text-primary)]">
                                                                                                        JSON
                                                                                                </p>
                                                                                                <p className="text-[10px] text-[var(--text-muted)]">
                                                                                                        Provenance data
                                                                                                </p>
                                                                                        </div>
                                                                                </button>
                                                                                <button
                                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                                                                                        onClick={() => {
                                                                                                window.open(`/api/chats/${chatId}/export?format=csv`, '_blank');
                                                                                        }}
                                                                                >
                                                                                        <Table
                                                                                                size={
                                                                                                        13
                                                                                                }
                                                                                                className="text-[var(--accent)]"
                                                                                                aria-hidden="true"
                                                                                        />
                                                                                        <div>
                                                                                                <p className="text-[12px] font-medium text-[var(--text-primary)]">
                                                                                                        CSV
                                                                                                </p>
                                                                                                <p className="text-[10px] text-[var(--text-muted)]">
                                                                                                        Spreadsheet
                                                                                                </p>
                                                                                        </div>
                                                                                </button>
                                                                                <button
                                                                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-left rounded-md hover:bg-[var(--bg-secondary)] transition-colors duration-150"
                                                                                        onClick={() =>
                                                                                                exportAsPDF(
                                                                                                        sections,
                                                                                                        title ||
                                                                                                                "",
                                                                                                )
                                                                                        }
                                                                                >
                                                                                        <FileDown
                                                                                                size={
                                                                                                        13
                                                                                                }
                                                                                                className="text-[var(--accent)]"
                                                                                                aria-hidden="true"
                                                                                        />
                                                                                        <div>
                                                                                                <p className="text-[12px] font-medium text-[var(--text-primary)]">
                                                                                                        PDF
                                                                                                </p>
                                                                                                <p className="text-[10px] text-[var(--text-muted)]">
                                                                                                        Document
                                                                                                </p>
                                                                                        </div>
                                                                                </button>
                                                                        </div>
                                                                </PopoverPanel>
                                                        </Transition>
                                                </Popover>
                                                <DeleteChat
                                                        redirect
                                                        chatId={chatId!}
                                                        chats={[]}
                                                        setChats={() => {}}
                                                />
                                        </div>
                                </div>
                        </div>
                </div>
        );
};

export default Navbar;
