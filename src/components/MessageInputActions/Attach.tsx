import {
        Popover,
        PopoverButton,
        PopoverPanel,
        Transition,
} from "@headlessui/react";
import {
        File,
        Image as ImageIcon,
        LoaderCircle,
        Paperclip,
        Plus,
        Trash,
        X,
} from "lucide-react";
import { Fragment, useRef, useState } from "react";
import { useChat } from "@/lib/hooks/useChat";
import { AnimatePresence, motion } from "motion/react";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const DOC_TYPES = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
];
const ALL_TYPES = [...DOC_TYPES, ...IMAGE_TYPES];

const isImageFile = (fileName: string) => {
        const ext = fileName.split(".").pop()?.toLowerCase();
        return ["png", "jpg", "jpeg", "webp", "gif"].includes(ext || "");
};

const Attach = () => {
        const { files, setFiles, setFileIds, fileIds } = useChat();

        const [loading, setLoading] = useState(false);
        const fileInputRef = useRef<any>();

        const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
                setLoading(true);
                const data = new FormData();

                for (let i = 0; i < e.target.files!.length; i++) {
                        data.append("files", e.target.files![i]);
                }

                const embeddingModelProvider = localStorage.getItem(
                        "embeddingModelProviderId",
                );
                const embeddingModel =
                        localStorage.getItem("embeddingModelKey");

                data.append(
                        "embedding_model_provider_id",
                        embeddingModelProvider || "",
                );
                data.append("embedding_model_key", embeddingModel || "");

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
                } finally {
                        setLoading(false);
                }
        };

        if (loading) {
                return (
                        <div className="p-2 rounded-lg text-black/30 dark:text-white/30">
                                <LoaderCircle
                                        size={16}
                                        className="text-[var(--accent)] animate-spin"
                                />
                        </div>
                );
        }

        if (files.length > 0) {
                return (
                        <div className="w-full">
                                <div className="flex flex-wrap gap-1.5 py-1">
                                        {files.map((file, i) => (
                                                <div
                                                        key={i}
                                                        className="flex items-center gap-1.5 bg-light-secondary dark:bg-dark-secondary rounded-lg px-2 py-1 text-xs text-black/60 dark:text-white/60 max-w-[180px]"
                                                >
                                                        {isImageFile(
                                                                file.fileName,
                                                        ) ? (
                                                                <ImageIcon
                                                                        size={
                                                                                12
                                                                        }
                                                                        className="text-[var(--accent)] flex-shrink-0"
                                                                />
                                                        ) : (
                                                                <File
                                                                        size={
                                                                                12
                                                                        }
                                                                        className="text-[var(--accent)] flex-shrink-0"
                                                                />
                                                        )}
                                                        <span className="truncate">
                                                                {file.fileName
                                                                        .length >
                                                                20
                                                                        ? file.fileName
                                                                                  .replace(
                                                                                          /\.\w+$/,
                                                                                          "",
                                                                                  )
                                                                                  .substring(
                                                                                          0,
                                                                                          20,
                                                                                  ) +
                                                                          "..." +
                                                                          file.fileExtension
                                                                        : file.fileName}
                                                        </span>
                                                        <button
                                                                type="button"
                                                                onClick={() => {
                                                                        const newFiles =
                                                                                files.filter(
                                                                                        (
                                                                                                _,
                                                                                                idx,
                                                                                        ) =>
                                                                                                idx !==
                                                                                                i,
                                                                                );
                                                                        const newFileIds =
                                                                                fileIds.filter(
                                                                                        (
                                                                                                _,
                                                                                                idx,
                                                                                        ) =>
                                                                                                idx !==
                                                                                                i,
                                                                                );
                                                                        setFiles(
                                                                                newFiles,
                                                                        );
                                                                        setFileIds(
                                                                                newFileIds,
                                                                        );
                                                                }}
                                                                className="text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-colors"
                                                        >
                                                                <X size={10} />
                                                        </button>
                                                </div>
                                        ))}
                                        <button
                                                type="button"
                                                onClick={() =>
                                                        fileInputRef.current.click()
                                                }
                                                className="flex items-center gap-1 text-[var(--accent)] hover:bg-[var(--accent)]/10 rounded-lg px-2 py-1 text-xs transition-colors"
                                        >
                                                <Plus size={12} />
                                                <span>Add</span>
                                        </button>
                                </div>
                                <input
                                        type="file"
                                        onChange={handleChange}
                                        ref={fileInputRef}
                                        accept={ALL_TYPES.join(",")}
                                        multiple
                                        hidden
                                />
                        </div>
                );
        }

        return (
                <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center justify-center p-2 rounded-lg text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-all duration-200 active:scale-95"
                >
                        <input
                                type="file"
                                onChange={handleChange}
                                ref={fileInputRef}
                                accept={ALL_TYPES.join(",")}
                                multiple
                                hidden
                        />
                        <Paperclip size={16} />
                </button>
        );
};

export default Attach;
