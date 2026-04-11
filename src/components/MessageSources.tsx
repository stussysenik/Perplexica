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
      className="bg-light-100 hover:bg-light-200 dark:bg-dark-100 dark:hover:bg-dark-200 transition duration-200 rounded-lg flex flex-col font-medium"
      data-testid={`source-card-${index}`}
    >
      <a
        className="p-3 flex flex-col space-y-2"
        href={source.metadata.url}
        target="_blank"
      >
        <p className="dark:text-white text-xs overflow-hidden whitespace-nowrap text-ellipsis">
          {source.metadata.title}
        </p>
        <div className="flex flex-row items-center justify-between">
          <div className="flex flex-row items-center space-x-1">
            {source.metadata.url.includes('file_id://') ? (
              <div className="bg-dark-200 hover:bg-dark-100 transition duration-200 flex items-center justify-center w-6 h-6 rounded-full">
                <File size={12} className="text-white/70" />
              </div>
            ) : (
              <img
                src={`https://s2.googleusercontent.com/s2/favicons?domain_url=${source.metadata.url}`}
                width={16}
                height={16}
                alt="favicon"
                className="rounded-lg h-4 w-4"
              />
            )}
            <p className="text-xs text-black/50 dark:text-white/50 overflow-hidden whitespace-nowrap text-ellipsis">
              {source.metadata.url.includes('file_id://')
                ? 'Uploaded File'
                : source.metadata.url.replace(/.+\/\/|www.|\..+/g, '')}
            </p>
          </div>
          <div className="flex flex-row items-center space-x-1 text-black/50 dark:text-white/50 text-xs">
            <div className="bg-black/50 dark:bg-white/50 h-[4px] w-[4px] rounded-full" />
            <span>{index + 1}</span>
          </div>
        </div>
      </a>
      {showContent && hasContent && (
        <div className="px-3 pb-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
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
             className="mt-2 p-2 rounded bg-light-200/50 dark:bg-dark-200/50"
             data-testid={`source-content-${index}`}
            >
              <p className="text-[11px] leading-relaxed text-black/70 dark:text-white/70 whitespace-pre-wrap break-words">
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
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      {sources.slice(0, 3).map((source, i) => (
        <SourceCard key={i} source={source} index={i} showContent={true} />
      ))}
      {sources.length > 3 && (
        <button
          onClick={openModal}
          className="bg-light-100 hover:bg-light-200 dark:bg-dark-100 dark:hover:bg-dark-200 transition duration-200 rounded-lg p-3 flex flex-col space-y-2 font-medium"
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
          <p className="text-xs text-black/50 dark:text-white/50">
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
                <DialogPanel className="w-full max-w-2xl transform rounded-2xl bg-light-secondary dark:bg-dark-secondary border border-light-200 dark:border-dark-200 p-6 text-left align-middle shadow-xl transition-all">
                  <DialogTitle className="text-lg font-medium leading-6 dark:text-white">
                    Sources
                  </DialogTitle>
                  <div className="grid grid-cols-1 gap-2 overflow-auto max-h-[500px] mt-2 pr-2">
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
