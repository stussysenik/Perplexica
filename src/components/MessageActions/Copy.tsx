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
          aria-label={copied ? 'Copied' : 'Copy response'}
          className="p-1.5 text-[var(--text-muted)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
        >
          {copied ? <Check size={14} aria-hidden="true" /> : <ClipboardList size={14} aria-hidden="true" />}
        </button>
      </DropdownMenu.Trigger>
      
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-50 min-w-[8rem] overflow-hidden rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-1 shadow-sm animate-in fade-in-80 zoom-in-95"
        >
          <DropdownMenu.Item
            onClick={() => handleCopy(false)}
            className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-[12px] outline-none transition-colors hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
          >
            <FileText size={12} className="text-[var(--text-muted)]" />
            <span>Copy text only</span>
          </DropdownMenu.Item>
          
          <DropdownMenu.Item
            onClick={() => handleCopy(true)}
            className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-[12px] outline-none transition-colors hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
          >
            <CopyIcon size={12} className="text-[var(--text-muted)]" />
            <span>Copy with sources</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default Copy;
