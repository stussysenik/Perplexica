'use client';

import { FileDown, FileJson, FileText, Table } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Section } from '@/lib/hooks/useChat';

const ExportMenu = ({ section }: { section: Section }) => {
  const chatId = section.message.chatId;

  const handleExport = (format: string) => {
    window.open(`/api/chats/${chatId}/export?format=${format}`, '_blank');
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Export conversation"
          className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 hover:text-black dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
        >
          <FileDown size={16} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[10rem] overflow-hidden rounded-lg border border-light-200 dark:border-dark-200 bg-white dark:bg-[#111111] p-1 shadow-md animate-in fade-in-80 zoom-in-95"
        >
          <DropdownMenu.Item
            onClick={() => handleExport('markdown')}
            className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-light-secondary dark:hover:bg-dark-secondary text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
          >
            <FileText size={14} className="text-black/70 dark:text-white/70" aria-hidden="true" />
            <span>Markdown</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => handleExport('json')}
            className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-light-secondary dark:hover:bg-dark-secondary text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
          >
            <FileJson size={14} className="text-black/70 dark:text-white/70" aria-hidden="true" />
            <span>JSON (provenance)</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => handleExport('csv')}
            className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none transition-colors hover:bg-light-secondary dark:hover:bg-dark-secondary text-black dark:text-white focus:bg-light-200 dark:focus:bg-dark-200"
          >
            <Table size={14} className="text-black/70 dark:text-white/70" aria-hidden="true" />
            <span>CSV</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default ExportMenu;
