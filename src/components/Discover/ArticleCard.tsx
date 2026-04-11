import { Discover } from "@/app/discover/page";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

const ArticleCard = ({ item }: { item: Discover }) => {
        let domain = "";
        try {
                domain = new URL(item.url).hostname.replace("www.", "");
        } catch {}

        let thumbnailSrc = item.thumbnail;
        try {
                const url = new URL(item.thumbnail);
                const id = url.searchParams.get("id");
                thumbnailSrc = url.origin + url.pathname + (id ? `?id=${id}` : "");
        } catch {}

        return (
                <Link
                        href={`/?q=Summary: ${item.url}`}
                        className="group flex flex-col rounded-2xl overflow-hidden bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 shadow-sm hover:shadow-md hover:border-light-300 dark:hover:border-dark-300 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
                        aria-label={`Read: ${item.title}`}
                >
                        <div className="relative aspect-[16/10] overflow-hidden bg-light-tertiary dark:bg-dark-tertiary">
                                <img
                                        className="object-cover w-full h-full group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                                        src={thumbnailSrc}
                                        alt=""
                                        loading="lazy"
                                        width={400}
                                        height={250}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                        </div>
                        <div className="p-4 flex flex-col gap-2">
                                <h3 className="font-semibold text-sm leading-snug line-clamp-2 group-hover:text-[var(--accent)] transition-colors duration-200 min-h-[2.5rem]">
                                        {item.title}
                                </h3>
                                <p className="text-black/55 dark:text-white/55 text-xs leading-relaxed line-clamp-2">
                                        {item.content}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 pt-2 border-t border-light-200/50 dark:border-dark-200/50">
                                        <ExternalLink size={10} className="text-black/30 dark:text-white/30 flex-shrink-0" aria-hidden="true" />
                                        <span className="text-[11px] text-black/35 dark:text-white/35 truncate">
                                                {domain}
                                        </span>
                                </div>
                        </div>
                </Link>
        );
};

export default ArticleCard;
