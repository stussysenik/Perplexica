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
          className="p-1.5 text-[var(--text-muted)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
        >
          <FileDown size={14} aria-hidden="true" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-[10rem] overflow-hidden rounded-md border border-[var(--border-primary)] bg-[var(--bg-primary)] p-1 shadow-sm animate-in fade-in-80 zoom-in-95"
        >
          <DropdownMenu.Item
            onClick={() => handleExport('markdown')}
            className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-[12px] outline-none transition-colors hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
          >
            <FileText size={12} className="text-[var(--text-muted)]" aria-hidden="true" />
            <span>Markdown</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => handleExport('json')}
            className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-[12px] outline-none transition-colors hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
          >
            <FileJson size={12} className="text-[var(--text-muted)]" aria-hidden="true" />
            <span>JSON (provenance)</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onClick={() => handleExport('csv')}
            className="flex cursor-pointer select-none items-center gap-2 rounded px-2 py-1 text-[12px] outline-none transition-colors hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:bg-[var(--bg-secondary)]"
          >
            <Table size={12} className="text-[var(--text-muted)]" aria-hidden="true" />
            <span>CSV</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};

export default ExportMenu;
