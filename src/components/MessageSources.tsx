/* eslint-disable @next/next/no-img-element */
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Transition,
  TransitionChild,
} from '@headlessui/react';
import { File, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Fragment, useState } from 'react';
import { Chunk } from '@/lib/types';

const SourceCard = ({
  source,
  index,
  showContent,
}: {
  source: Chunk;
  index: number;
  showContent?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const hasContent =
    source.content &&
    source.content.length > 0 &&
    source.content !== source.metadata.title;

  const truncatedContent =
    source.content && source.content.length > 300
      ? source.content.slice(0, 300) + '...'
      : source.content;

  return (
    <div
      className="bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-colors duration-150 rounded-md flex flex-col font-medium"
      data-testid={`source-card-${index}`}
    >
      <a
        className="p-2.5 flex flex-col space-y-1.5"
        href={source.metadata.url}
        target="_blank"
      >
        <p className="text-[var(--text-primary)] text-[12px] overflow-hidden whitespace-nowrap text-ellipsis leading-tight">
          {source.metadata.title}
        </p>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center space-x-1">
            {source.metadata.url.includes('file_id://') ? (
              <div className="bg-[var(--bg-tertiary)] flex items-center justify-center w-5 h-5 rounded">
                <File size={10} className="text-[var(--text-muted)]" />
              </div>
            ) : (
              <img
                src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                width={14}
                height={14}
                alt="favicon"
                className="rounded h-3.5 w-3.5"
              />
            )}
            <p className="text-[11px] text-[var(--text-muted)] overflow-hidden whitespace-nowrap text-ellipsis">
              {source.metadata.url.includes('file_id://')
                ? 'Uploaded File'
                : source.metadata.url.replace(/.+\/\/|www.|\..+/g, '')}
            </p>
          </div>
          <div className="flex flex-row items-center space-x-1 text-[var(--text-muted)] text-[11px]">
            <div className="bg-[var(--text-muted)] h-[3px] w-[3px] rounded-full" />
            <span className="tabular-nums">{index + 1}</span>
          </div>
        </div>
      </a>
      {showContent && hasContent && (
        <div className="px-2.5 pb-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-[10px] text-[var(--accent)] hover:opacity-80 transition-opacity"
            data-testid={`source-toggle-${index}`}
          >
            {expanded ? (
              <ChevronUp size={10} />
            ) : (
              <ChevronDown size={10} />
            )}
            {expanded ? 'Hide extracted text' : 'View extracted text'}
          </button>
          {expanded && (
            <div
             className="mt-1.5 p-2 rounded bg-[var(--bg-secondary)]"
             data-testid={`source-content-${index}`}
            >
              <p className="text-[11px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap break-words">
                {truncatedContent}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MessageSources = ({ sources }: { sources: Chunk[] }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const closeModal = () => {
    setIsDialogOpen(false);
    document.body.classList.remove('overflow-hidden-scrollable');
  };

  const openModal = () => {
    setIsDialogOpen(true);
    document.body.classList.add('overflow-hidden-scrollable');
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5">
      {sources.slice(0, 3).map((source, i) => (
        <SourceCard key={i} source={source} index={i} showContent={true} />
      ))}
      {sources.length > 3 && (
        <button
          onClick={openModal}
          className="bg-[var(--bg-primary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-colors duration-150 rounded-md p-2.5 flex flex-col space-y-1.5 font-medium"
          data-testid="source-view-more"
        >
          <div className="flex flex-row items-center space-x-1">
            {sources.slice(3, 6).map((source, i) => {
              return source.metadata.url === 'File' ? (
                <div
                  key={i}
                  className="bg-dark-200 hover:bg-dark-100 transition duration-200 flex items-center justify-center w-6 h-6 rounded-full"
                >
                  <File size={12} className="text-white/70" />
                </div>
              ) : (
                <img
                  key={i}
                  src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                  width={16}
                  height={16}
                  alt="favicon"
                  className="rounded-lg h-4 w-4"
                />
              );
            })}
          </div>
          <p className="text-[11px] text-[var(--text-muted)]">
            View {sources.length - 3} more
          </p>
        </button>
      )}
      <Transition appear show={isDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={closeModal}>
          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <TransitionChild
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-100"
                leaveFrom="opacity-100 scale-200"
                leaveTo="opacity-0 scale-95"
              >
                <DialogPanel className="w-full max-w-2xl transform rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] p-5 text-left align-middle transition-all">
                  <DialogTitle className="text-sm font-medium leading-6 text-[var(--text-primary)]">
                    Sources
                  </DialogTitle>
                  <div className="grid grid-cols-1 gap-1.5 overflow-auto max-h-[500px] mt-3 pr-1">
                    {sources.map((source, i) => (
                      <SourceCard
                        key={i}
                        source={source}
                        index={i}
                        showContent={true}
                      />
                    ))}
                  </div>
                </DialogPanel>
              </TransitionChild>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
};

export default MessageSources;
