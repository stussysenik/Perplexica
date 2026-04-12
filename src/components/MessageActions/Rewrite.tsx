import { Repeat } from 'lucide-react';

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
      className="p-1.5 text-[var(--text-muted)] rounded-md hover:bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] transition-colors duration-150 flex flex-row items-center space-x-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-1"
    >
      <Repeat size={14} aria-hidden="true" />
    </button>
  );
};
1;
export default Rewrite;
