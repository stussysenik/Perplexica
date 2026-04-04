import { Popover, PopoverButton, PopoverPanel } from "@headlessui/react";
import {
        File,
        Image as ImageIcon,
        LoaderCircle,
        Paperclip,
        Plus,
        Trash,
        X,
} from "lucide-react";
import { useRef, useState } from "react";
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

const AttachSmall = () => {
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
                        <div className="p-1">
                                <LoaderCircle
                                        size={16}
                                        className="text-[#24A0ED] animate-spin"
                                />
                        </div>
                );
        }

        if (files.length > 0) {
                return (
                        <Popover className="relative">
                                {({ open }) => (
                                        <>
                                                <PopoverButton
                                                        type="button"
                                                        className="flex items-center gap-1 p-1 rounded-lg text-black/40 dark:text-white/40 hover:text-black/70 dark:hover:text-white/70 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-all duration-200"
                                                >
                                                        <div className="relative">
                                                                <Paperclip
                                                                        size={
                                                                                16
                                                                        }
                                                                />
                                                                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-[#24A0ED] text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                                                                        {
                                                                                files.length
                                                                        }
                                                                </span>
                                                        </div>
                                                </PopoverButton>
                                                <AnimatePresence>
                                                        {open && (
                                                                <PopoverPanel
                                                                        className="absolute z-10 w-64 bottom-10 left-0"
                                                                        static
                                                                >
                                                                        <motion.div
                                                                                initial={{
                                                                                        opacity: 0,
                                                                                        scale: 0.95,
                                                                                        y: 4,
                                                                                }}
                                                                                animate={{
                                                                                        opacity: 1,
                                                                                        scale: 1,
                                                                                        y: 0,
                                                                                }}
                                                                                exit={{
                                                                                        opacity: 0,
                                                                                        scale: 0.95,
                                                                                        y: 4,
                                                                                }}
                                                                                transition={{
                                                                                        duration: 0.15,
                                                                                        ease: "easeOut",
                                                                                }}
                                                                                className="origin-bottom-left bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-xl shadow-lg overflow-hidden"
                                                                        >
                                                                                <div className="flex items-center justify-between px-3 py-2 border-b border-light-200 dark:border-dark-200">
                                                                                        <span className="text-xs font-medium text-black/60 dark:text-white/60">
                                                                                                {
                                                                                                        files.length
                                                                                                }{" "}
                                                                                                file
                                                                                                {files.length !==
                                                                                                1
                                                                                                        ? "s"
                                                                                                        : ""}
                                                                                        </span>
                                                                                        <div className="flex items-center gap-3">
                                                                                                <button
                                                                                                        type="button"
                                                                                                        onClick={() =>
                                                                                                                fileInputRef.current.click()
                                                                                                        }
                                                                                                        className="flex items-center gap-1 text-[#24A0ED] text-xs"
                                                                                                >
                                                                                                        <Plus
                                                                                                                size={
                                                                                                                        12
                                                                                                                }
                                                                                                        />{" "}
                                                                                                        Add
                                                                                                </button>
                                                                                                <button
                                                                                                        onClick={() => {
                                                                                                                setFiles(
                                                                                                                        [],
                                                                                                                );
                                                                                                                setFileIds(
                                                                                                                        [],
                                                                                                                );
                                                                                                        }}
                                                                                                        className="flex items-center gap-1 text-black/40 dark:text-white/40 hover:text-red-500 text-xs transition-colors"
                                                                                                >
                                                                                                        <Trash
                                                                                                                size={
                                                                                                                        11
                                                                                                                }
                                                                                                        />{" "}
                                                                                                        Clear
                                                                                                </button>
                                                                                        </div>
                                                                                </div>
                                                                                <div className="max-h-40 overflow-y-auto p-1">
                                                                                        {files.map(
                                                                                                (
                                                                                                        file,
                                                                                                        i,
                                                                                                ) => (
                                                                                                        <div
                                                                                                                key={
                                                                                                                        i
                                                                                                                }
                                                                                                                className="flex items-center gap-2 p-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors group"
                                                                                                        >
                                                                                                                <div className="flex items-center justify-center w-7 h-7 rounded-md bg-light-secondary dark:bg-dark-secondary flex-shrink-0">
                                                                                                                        {isImageFile(
                                                                                                                                file.fileName,
                                                                                                                        ) ? (
                                                                                                                                <ImageIcon
                                                                                                                                        size={
                                                                                                                                                13
                                                                                                                                        }
                                                                                                                                        className="text-[#24A0ED]"
                                                                                                                                />
                                                                                                                        ) : (
                                                                                                                                <File
                                                                                                                                        size={
                                                                                                                                                13
                                                                                                                                        }
                                                                                                                                        className="text-black/50 dark:text-white/50"
                                                                                                                                />
                                                                                                                        )}
                                                                                                                </div>
                                                                                                                <span className="text-xs text-black/60 dark:text-white/60 truncate flex-1">
                                                                                                                        {
                                                                                                                                file.fileName
                                                                                                                        }
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
                                                                                                                        className="opacity-0 group-hover:opacity-100 text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 transition-all"
                                                                                                                >
                                                                                                                        <X
                                                                                                                                size={
                                                                                                                                        11
                                                                                                                                }
                                                                                                                        />
                                                                                                                </button>
                                                                                                        </div>
                                                                                                ),
                                                                                        )}
                                                                                </div>
                                                                                <input
                                                                                        type="file"
                                                                                        onChange={
                                                                                                handleChange
                                                                                        }
                                                                                        ref={
                                                                                                fileInputRef
                                                                                        }
                                                                                        accept={ALL_TYPES.join(
                                                                                                ",",
                                                                                        )}
                                                                                        multiple
                                                                                        hidden
                                                                                />
                                                                        </motion.div>
                                                                </PopoverPanel>
                                                        )}
                                                </AnimatePresence>
                                        </>
                                )}
                        </Popover>
                );
        }

        return (
                <button
                        type="button"
                        onClick={() => fileInputRef.current.click()}
                        className="flex items-center gap-0.5 p-1.5 rounded-lg text-black/30 dark:text-white/30 hover:text-black/60 dark:hover:text-white/60 hover:bg-light-secondary dark:hover:bg-dark-secondary transition-all duration-200"
                >
                        <input
                                type="file"
                                onChange={handleChange}
                                ref={fileInputRef}
                                accept={ALL_TYPES.join(",")}
                                multiple
                                hidden
                        />
                        <Paperclip size={15} />
                </button>
        );
};

export default AttachSmall;
