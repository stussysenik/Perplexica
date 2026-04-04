import { Check, ClipboardList, Copy as CopyIcon, FileText } from 'lucide-react';
import { useState } from 'react';
import { Section } from '@/lib/hooks/useChat';
import { SourceBlock } from '@/lib/types';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

const Copy = ({
  section,
  initialMessage,
}: {
  section: Section;
  initialMessage: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (withSources: boolean) => {
    let contentToCopy = initialMessage;

    if (withSources) {
      const sources = section.message.responseBlocks.filter(
        (b) => b.type === 'source' && b.data.length > 0,
      ) as SourceBlock[];

      if (sources.length > 0) {
        contentToCopy += `\n\nCitations:\n${sources
          .map((source) => source.data)
          .flat()
          .map(
            (s, i) =>
              `[${i + 1}] ${s.metadata.url.startsWith('file_id://') ? s.metadata.fileName || 'Uploaded File' : s.metadata.url}`,
          )
          .join(`\n`)}`;
      }
    }

    navigator.clipboard.writeText(contentToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white focus:outline-none"
        >
          {copied ? <Check size={16} /> : <ClipboardList size={16} />}
        </button>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          className="z-50 min-w-[8rem] overflow-hidden rounded-lg border border-light-200 dark:border-dark-200 bg-white dark:bg-[#111111] p-1 shadow-md animate-in fade-in-80 zoom-in-95"
        >
          <DropdownMenu.Item
            onClick={() => handleCopy(false)}
            className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-light-secondary dark:hover:bg-dark-secondary text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
          >
            <FileText size={14} className="text-black/70 dark:text-white/70" />
            <span>Copy text only</span>
          </DropdownMenu.Item>
          
          <DropdownMenu.Item
            onClick={() => handleCopy(true)}
            className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-light-secondary dark:hover:bg-dark-secondary text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
          >
            <CopyIcon size={14} className="text-black/70 dark:text-white/70" />
            <span>Copy with sources</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Copy;
