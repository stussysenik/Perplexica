"use client";

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useRef } from "react";
import { cn } from "@/lib/utils";
import {
        BookCopy,
        Disc3,
        Volume2,
        StopCircle,
        Layers3,
        Plus,
        CornerDownRight,
} from "lucide-react";
import Markdown, { MarkdownToJSX, RuleType } from "markdown-to-jsx";
import Copy from "./MessageActions/Copy";
import ExportPdf from "./MessageActions/ExportPdf";
import Rewrite from "./MessageActions/Rewrite";
import MessageSources from "./MessageSources";
import SearchImages from "./SearchImages";
import SearchVideos from "./SearchVideos";
import { useSpeech } from "react-text-to-speech";
import ThinkBox from "./ThinkBox";
import { useChat, Section } from "@/lib/hooks/useChat";
import Citation from "./MessageRenderer/Citation";
import AssistantSteps from "./AssistantSteps";
import { ResearchBlock } from "@/lib/types";
import Renderer from "./Widgets/Renderer";
import CodeBlock from "./MessageRenderer/CodeBlock";
import TextSelectionPopup from "./TextSelectionPopup";

const ThinkTagProcessor = ({
        children,
        thinkingEnded,
}: {
        children: React.ReactNode;
        thinkingEnded: boolean;
}) => {
        return (
                <ThinkBox
                        content={children as string}
                        thinkingEnded={thinkingEnded}
                />
        );
};

const MessageBox = ({
        section,
        sectionIndex,
        dividerRef,
        isLast,
}: {
        section: Section;
        sectionIndex: number;
        dividerRef?: MutableRefObject<HTMLDivElement | null>;
        isLast: boolean;
}) => {
        const {
                loading,
                sendMessage,
                rewrite,
                messages,
                researchEnded,
                chatHistory,
        } = useChat();

        const messageContentRef = useRef<HTMLDivElement>(null);

        const parsedMessage = section.parsedTextBlocks.join("\n\n");
        const speechMessage = section.speechMessage || "";
        const thinkingEnded = section.thinkingEnded;

        const sourceBlocks = section.message.responseBlocks.filter(
                (block): block is typeof block & { type: "source" } =>
                        block.type === "source",
        );

        const sources = sourceBlocks.flatMap((block) => block.data);

        const hasContent = section.parsedTextBlocks.length > 0;

        const { speechStatus, start, stop } = useSpeech({
                text: speechMessage,
        });

        const handleAskFollowUp = (selectedText: string) => {
                sendMessage(`Regarding "${selectedText}" — can you elaborate?`);
        };

        const markdownOverrides: MarkdownToJSX.Options = {
                renderRule(next, node, renderChildren, state) {
                        if (node.type === RuleType.codeInline) {
                                return `\`${node.text}\``;
                        }

                        if (node.type === RuleType.codeBlock) {
                                return (
                                        <CodeBlock
                                                key={state.key}
                                                language={node.lang || ""}
                                        >
                                                {node.text}
                                        </CodeBlock>
                                );
                        }

                        return next();
                },
                overrides: {
                        think: {
                                component: ThinkTagProcessor,
                                props: {
                                        thinkingEnded: thinkingEnded,
                                },
                        },
                        citation: {
                                component: Citation,
                        },
                },
        };

        return (
                <div className="space-y-6" ref={messageContentRef}>
                        <TextSelectionPopup
                                containerRef={messageContentRef}
                                onAskFollowUp={handleAskFollowUp}
                        />
                        <div className={"w-full pt-6 break-words"}>
                                <h2 className="text-black dark:text-white font-medium text-2xl sm:text-3xl lg:w-9/12">
                                        {section.message.query}
                                </h2>
                        </div>

                        <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
                                <div
                                        ref={dividerRef}
                                        className="flex flex-col space-y-6 w-full lg:w-9/12"
                                >
                                        {sources.length > 0 && (
                                                <div className="flex flex-col space-y-2">
                                                        <div className="flex flex-row items-center space-x-2">
                                                                <BookCopy
                                                                        className="text-black/70 dark:text-white/70"
                                                                        size={
                                                                                18
                                                                        }
                                                                />
                                                                <h3 className="text-black/70 dark:text-white/70 font-medium text-lg">
                                                                        Sources
                                                                </h3>
                                                        </div>
                                                        <MessageSources
                                                                sources={
                                                                        sources
                                                                }
                                                        />
                                                </div>
                                        )}

                                        {section.message.responseBlocks
                                                .filter(
                                                        (
                                                                block,
                                                        ): block is ResearchBlock =>
                                                                block.type ===
                                                                        "research" &&
                                                                block.data
                                                                        .subSteps
                                                                        .length >
                                                                        0,
                                                )
                                                .map((researchBlock) => (
                                                        <div
                                                                key={
                                                                        researchBlock.id
                                                                }
                                                                className="flex flex-col space-y-2"
                                                        >
                                                                <AssistantSteps
                                                                        block={
                                                                                researchBlock
                                                                        }
                                                                        status={
                                                                                section
                                                                                        .message
                                                                                        .status
                                                                        }
                                                                        isLast={
                                                                                isLast
                                                                        }
                                                                />
                                                        </div>
                                                ))}

                                        {isLast &&
                                                loading &&
                                                !researchEnded &&
                                                !section.message.responseBlocks.some(
                                                        (b) =>
                                                                b.type ===
                                                                        "research" &&
                                                                b.data.subSteps
                                                                        .length >
                                                                        0,
                                                ) && (
                                                        <div className="flex items-center gap-2 p-3 rounded-lg bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200">
                                                                <Disc3 className="w-4 h-4 text-black/50 dark:text-white/50 animate-spin" />
                                                                <span className="text-sm text-black/50 dark:text-white/50">
                                                                        Brainstorming...
                                                                </span>
                                                        </div>
                                                )}

                                        {section.widgets.length > 0 && (
                                                <Renderer
                                                        widgets={
                                                                section.widgets
                                                        }
                                                />
                                        )}

                                        <div className="flex flex-col space-y-2">
                                                {sources.length > 0 && (
                                                        <div className="flex flex-row items-center space-x-2">
                                                                <Disc3
                                                                        className={cn(
                                                                                "text-black/70 dark:text-white/70",
                                                                                isLast &&
                                                                                        loading
                                                                                        ? "animate-spin"
                                                                                        : "animate-none",
                                                                        )}
                                                                        size={
                                                                                18
                                                                        }
                                                                />
                                                                <h3 className="text-black/70 dark:text-white/70 font-medium text-lg">
                                                                        Answer
                                                                </h3>
                                                        </div>
                                                )}

                                                {hasContent && (
                                                        <>
                                                                <div className="relative">
                                                                        <Markdown
                                                                                className={cn(
                                                                                        "prose prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:overflow-x-auto font-[400]",
                                                                                        "max-w-none break-words text-black/90 dark:text-white/90",
                                                                                        "prose-a:text-[#24A0ED] prose-a:no-underline hover:prose-a:underline",
                                                                                        "prose-code:before:content-none prose-code:after:content-none",
                                                                                )}
                                                                                options={
                                                                                        markdownOverrides
                                                                                }
                                                                        >
                                                                                {
                                                                                        parsedMessage
                                                                                }
                                                                        </Markdown>
                                                                </div>

                                                                {loading &&
                                                                isLast ? null : (
                                                                        <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-3">
                                                                                <div className="flex flex-row items-center -ml-1.5">
                                                                                        <Rewrite
                                                                                                rewrite={
                                                                                                        rewrite
                                                                                                }
                                                                                                messageId={
                                                                                                        section
                                                                                                                .message
                                                                                                                .messageId
                                                                                                }
                                                                                        />
                                                                                </div>
                                                                                <div className="flex flex-row items-center -mr-1.5">
                                                                                        <Copy
                                                                                                initialMessage={
                                                                                                        parsedMessage
                                                                                                }
                                                                                                section={
                                                                                                        section
                                                                                                }
                                                                                        />
                                                                                        <ExportPdf
                                                                                                section={
                                                                                                        section
                                                                                                }
                                                                                                parsedMessage={
                                                                                                        parsedMessage
                                                                                                }
                                                                                        />
                                                                                        <button
                                                                                                onClick={() => {
                                                                                                        if (
                                                                                                                speechStatus ===
                                                                                                                "started"
                                                                                                        ) {
                                                                                                                stop();
                                                                                                        } else {
                                                                                                                start();
                                                                                                        }
                                                                                                }}
                                                                                                className="p-2 text-black/50 dark:text-white/50 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                                                                                        >
                                                                                                {speechStatus ===
                                                                                                "started" ? (
                                                                                                        <StopCircle
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                ) : (
                                                                                                        <Volume2
                                                                                                                size={
                                                                                                                        16
                                                                                                                }
                                                                                                        />
                                                                                                )}
                                                                                        </button>
                                                                                </div>
                                                                        </div>
                                                                )}

                                                                {isLast &&
                                                                        section.suggestions &&
                                                                        section
                                                                                .suggestions
                                                                                .length >
                                                                                0 &&
                                                                        hasContent &&
                                                                        !loading && (
                                                                                <div className="mt-4">
                                                                                        <div className="flex flex-row items-center space-x-2 mb-3">
                                                                                                <Layers3
                                                                                                        className="text-black/70 dark:text-white/70"
                                                                                                        size={
                                                                                                                18
                                                                                                        }
                                                                                                />
                                                                                                <h3 className="text-black/70 dark:text-white/70 font-medium text-lg">
                                                                                                        Related
                                                                                                </h3>
                                                                                        </div>
                                                                                        <div className="space-y-0">
                                                                                                {section.suggestions.map(
                                                                                                        (
                                                                                                                suggestion: string,
                                                                                                                i: number,
                                                                                                        ) => (
                                                                                                                <div
                                                                                                                        key={
                                                                                                                                i
                                                                                                                        }
                                                                                                                >
                                                                                                                        <div className="h-px bg-light-200/40 dark:bg-dark-200/40" />
                                                                                                                        <button
                                                                                                                                onClick={() =>
                                                                                                                                        sendMessage(
                                                                                                                                                suggestion,
                                                                                                                                        )
                                                                                                                                }
                                                                                                                                className="group w-full py-3.5 text-left transition-colors duration-200"
                                                                                                                        >
                                                                                                                                <div className="flex items-center justify-between gap-3">
                                                                                                                                        <div className="flex flex-row space-x-3 items-center">
                                                                                                                                                <CornerDownRight
                                                                                                                                                        size={
                                                                                                                                                                14
                                                                                                                                                        }
                                                                                                                                                        className="group-hover:text-[#24A0ED] transition-colors duration-200 flex-shrink-0 text-black/30 dark:text-white/30"
                                                                                                                                                />
                                                                                                                                                <p className="text-sm text-black/60 dark:text-white/60 group-hover:text-[#24A0ED] transition-colors duration-200 leading-relaxed">
                                                                                                                                                        {
                                                                                                                                                                suggestion
                                                                                                                                                        }
                                                                                                                                                </p>
                                                                                                                                        </div>
                                                                                                                                        <Plus
                                                                                                                                                size={
                                                                                                                                                        14
                                                                                                                                                }
                                                                                                                                                className="text-black/25 dark:text-white/25 group-hover:text-[#24A0ED] transition-colors duration-200 flex-shrink-0"
                                                                                                                                        />
                                                                                                                                </div>
                                                                                                                        </button>
                                                                                                                </div>
                                                                                                        ),
                                                                                                )}
                                                                                        </div>
                                                                                </div>
                                                                        )}
                                                        </>
                                                )}
                                        </div>
                                </div>

                                {hasContent && (
                                        <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
                                                <SearchImages
                                                        query={
                                                                section.message
                                                                        .query
                                                        }
                                                        chatHistory={
                                                                chatHistory
                                                        }
                                                        messageId={
                                                                section.message
                                                                        .messageId
                                                        }
                                                />
                                                <SearchVideos
                                                        chatHistory={
                                                                chatHistory
                                                        }
                                                        query={
                                                                section.message
                                                                        .query
                                                        }
                                                        messageId={
                                                                section.message
                                                                        .messageId
                                                        }
                                                />
                                        </div>
                                )}
                        </div>
                </div>
        );
};

export default MessageBox;
