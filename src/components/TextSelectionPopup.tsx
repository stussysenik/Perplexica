'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquareQuote } from 'lucide-react';

interface TextSelectionPopupProps {
  containerRef: React.RefObject<HTMLElement | null>;
  onAskFollowUp: (selectedText: string) => void;
}

const TextSelectionPopup = ({ containerRef, onAskFollowUp }: TextSelectionPopupProps) => {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const popupRef = useRef<HTMLDivElement>(null);

  const handleSelectionChange = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) {
      setPosition(null);
      setSelectedText('');
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 5) {
      setPosition(null);
      setSelectedText('');
      return;
    }

    // Check if selection is within our container
    if (!containerRef.current.contains(selection.anchorNode)) {
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();

    setSelectedText(text);
    setPosition({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 12,
    });
  }, [containerRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', handleSelectionChange);
    document.addEventListener('mousedown', (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setPosition(null);
      }
    });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [handleSelectionChange]);

  if (!position || !selectedText) return null;

  return (
    <div
      ref={popupRef}
      className="absolute z-50 animate-in fade-in-0 zoom-in-95 duration-150"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)',
      }}
    >
      <button
        onClick={() => {
          onAskFollowUp(selectedText);
          setPosition(null);
          setSelectedText('');
          window.getSelection()?.removeAllRanges();
        }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--accent)] text-white text-xs font-medium rounded-full shadow-lg shadow-[var(--accent)]/25 hover:opacity-90 transition-colors duration-150 whitespace-nowrap"
      >
        <MessageSquareQuote size={12} />
        Ask follow-up
      </button>
    </div>
  );
};

export default TextSelectionPopup;
