import { Settings } from 'lucide-react';
import { useState } from 'react';
import SettingsDialogue from './SettingsDialogue';
import { AnimatePresence } from 'framer-motion';

const SettingsButton = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 rounded-full bg-light-200 text-black/70 dark:bg-dark-200 dark:text-white/70 hover:opacity-80 transition-colors duration-200 cursor-pointer active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
      >
        <Settings size={19} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen && <SettingsDialogue isOpen={isOpen} setIsOpen={setIsOpen} />}
      </AnimatePresence>
    </>
  );
};

export default SettingsButton;
