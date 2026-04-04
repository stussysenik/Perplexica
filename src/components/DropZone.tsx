"use client";

import { useState, useCallback, ReactNode } from "react";
import { Upload } from "lucide-react";
import { useChat } from "@/lib/hooks/useChat";

const DropZone = ({ children }: { children: ReactNode }) => {
        const [isDragging, setIsDragging] = useState(false);
        const { files, setFiles, setFileIds, fileIds } = useChat();

        const handleDragOver = useCallback((e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
        }, []);

        const handleDragEnter = useCallback((e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                setIsDragging(true);
        }, []);

        const handleDragLeave = useCallback((e: React.DragEvent) => {
                e.preventDefault();
                e.stopPropagation();
                if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                setIsDragging(false);
        }, []);

        const handleDrop = useCallback(
                async (e: React.DragEvent) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsDragging(false);

                        const droppedFiles = Array.from(e.dataTransfer.files);
                        if (droppedFiles.length === 0) return;

                        const validTypes = [
                                "application/pdf",
                                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                "text/plain",
                                "image/png",
                                "image/jpeg",
                                "image/webp",
                                "image/gif",
                        ];

                        const validFiles = droppedFiles.filter((f) =>
                                validTypes.includes(f.type),
                        );
                        if (validFiles.length === 0) return;

                        const data = new FormData();
                        validFiles.forEach((f) => data.append("files", f));

                        const embeddingModelProvider = localStorage.getItem(
                                "embeddingModelProviderId",
                        );
                        const embeddingModel =
                                localStorage.getItem("embeddingModelKey");

                        data.append(
                                "embedding_model_provider_id",
                                embeddingModelProvider || "",
                        );
                        data.append(
                                "embedding_model_key",
                                embeddingModel || "",
                        );

                        try {
                                const res = await fetch(`/api/uploads`, {
                                        method: "POST",
                                        body: data,
                                });
                                const resData = await res.json();
                                setFiles([...files, ...resData.files]);
                                setFileIds([
                                        ...fileIds,
                                        ...resData.files.map(
                                                (file: any) => file.fileId,
                                        ),
                                ]);
                        } catch (err) {
                                console.error("Upload error:", err);
                        }
                },
                [files, fileIds, setFiles, setFileIds],
        );

        return (
                <div
                        onDragOver={handleDragOver}
                        onDragEnter={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className="relative w-full"
                >
                        {isDragging && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[#24A0ED] bg-[#24A0ED]/5 dark:bg-[#24A0ED]/10 backdrop-blur-sm">
                                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#24A0ED]/10">
                                                <Upload
                                                        size={24}
                                                        className="text-[#24A0ED]"
                                                />
                                        </div>
                                        <p className="text-sm font-medium text-[#24A0ED]">
                                                Drop files here
                                        </p>
                                        <p className="text-xs text-black/50 dark:text-white/50">
                                                PDF, DOCX, TXT, PNG, JPG, WEBP,
                                                GIF
                                        </p>
                                </div>
                        )}
                        {children}
                </div>
        );
};

export default DropZone;
