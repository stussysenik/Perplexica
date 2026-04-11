import { Settings } from 'lucide-react';
import { useState } from 'react';
import SettingsDialogue from './SettingsDialogue';
import { AnimatePresence } from 'framer-motion';

const SettingsButtonMobile = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <>
      <button
        className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 text-black/50 dark:text-white/50 hover:text-black dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] lg:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="Open settings"
      >
        <Settings size={18} aria-hidden="true" />
      </button>
      <AnimatePresence>
        {isOpen && <SettingsDialogue isOpen={isOpen} setIsOpen={setIsOpen} />}
      </AnimatePresence>
    </>
  );
};

export default SettingsButtonMobile;
