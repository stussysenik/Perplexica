import { Message } from '@/components/ChatWindow';

const MAX_UNCOMPACTED_MESSAGES = 10;

export const shouldCompact = (messages: Message[]): boolean => {
  const uncompacted = messages.filter((m) => !m.isCompacted);
  return uncompacted.length > MAX_UNCOMPACTED_MESSAGES;
};

export const compactMessages = (
  messages: Message[],
  summaryPrefix: string = 'Previous conversation summary:\n',
): Message[] => {
  if (!shouldCompact(messages)) return messages;

  const cutoff = messages.length - MAX_UNCOMPACTED_MESSAGES;
  const toCompact = messages.slice(0, cutoff);
  const toKeep = messages.slice(cutoff);

  const summaryParts = toCompact.map((msg, i) => {
    const textBlocks = msg.responseBlocks
      .filter((b) => b.type === 'text')
      .map((b) => (b as { type: 'text'; data: string }).data)
      .join('\n');

    return `Q${i + 1}: ${msg.query}\nA${i + 1}: ${textBlocks.slice(0, 500)}`;
  });

  const compactSummary = summaryPrefix + summaryParts.join('\n\n');

  const compactedMessage: Message = {
    chatId: toCompact[0]?.chatId ?? '',
    messageId: `compacted-${Date.now()}`,
    createdAt: toCompact[0]?.createdAt ?? new Date(),
    backendId: `compacted`,
    query: '[Conversation summary]',
    responseBlocks: [
      {
        id: `compact-${Date.now()}`,
        type: 'text',
        data: compactSummary,
      },
    ],
    status: 'completed',
    parentId: null,
    branchIndex: 0,
    isCompacted: true,
    compactSummary,
  };

  return [compactedMessage, ...toKeep];
};

export const buildCompactedHistory = (
  messages: Message[],
): [string, string][] => {
  const history: [string, string][] = [];

  for (const msg of messages) {
    if (msg.isCompacted && msg.compactSummary) {
      history.push(['assistant', msg.compactSummary]);
    } else {
      history.push(['human', msg.query]);
      const text = msg.responseBlocks
        .filter((b) => b.type === 'text')
        .map((b) => (b as { type: 'text'; data: string }).data)
        .join('\n');
      if (text) history.push(['assistant', text]);
    }
  }

  return history;
};
