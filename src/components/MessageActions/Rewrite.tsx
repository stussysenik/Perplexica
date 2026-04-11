import { ArrowLeftRight, Repeat } from 'lucide-react';

const Rewrite = ({
  rewrite,
  messageId,
}: {
  rewrite: (messageId: string) => void;
  messageId: string;
}) => {
  return (
    <button
      onClick={() => rewrite(messageId)}
      aria-label="Regenerate response"
      className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 hover:text-black dark:hover:text-white flex flex-row items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
    >
      <Repeat size={16} aria-hidden="true" />
    </button>
  );
};
1;
export default Rewrite;
