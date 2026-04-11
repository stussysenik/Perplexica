import db from '@/lib/db';
import { chats, messages } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { Block, SourceBlock, TextBlock } from '@/lib/types';

const formatMarkdown = (
  chat: any,
  chatMessages: any[],
): string => {
  let md = `# ${chat.title}\n\n`;
  md += `> Exported from Perplexica on ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  for (const msg of chatMessages) {
    md += `## ${msg.query}\n\n`;

    if (msg.createdAt) {
      md += `_Asked on ${new Date(msg.createdAt).toLocaleString()}_\n\n`;
    }

    if (msg.chatModelKey || msg.optimizationMode) {
      md += `<details><summary>Provenance</summary>\n\n`;
      if (msg.chatModelProvider && msg.chatModelKey) {
        md += `- **Model**: ${msg.chatModelProvider}/${msg.chatModelKey}\n`;
      }
      if (msg.embeddingModelProvider && msg.embeddingModelKey) {
        md += `- **Embedding**: ${msg.embeddingModelProvider}/${msg.embeddingModelKey}\n`;
      }
      if (msg.optimizationMode) {
        md += `- **Mode**: ${msg.optimizationMode}\n`;
      }
      if (msg.responseDurationMs) {
        md += `- **Duration**: ${(msg.responseDurationMs / 1000).toFixed(1)}s\n`;
      }
      if (msg.isRewrite) {
        md += `- **Rewrite**: yes (v${msg.version})\n`;
      }
      if (msg.originalQuery) {
        md += `- **Original query**: ${msg.originalQuery}\n`;
      }
      md += `\n</details>\n\n`;
    }

    const responseBlocks: Block[] = msg.responseBlocks || [];
    const textBlocks = responseBlocks.filter(
      (b): b is TextBlock => b.type === 'text',
    );
    const sourceBlocks = responseBlocks.filter(
      (b): b is SourceBlock => b.type === 'source' && b.data.length > 0,
    );

    for (const tb of textBlocks) {
      md += `${tb.data}\n\n`;
    }

    if (sourceBlocks.length > 0) {
      md += `### Sources\n\n`;
      const allSources = sourceBlocks.flatMap((b) => b.data);
      allSources.forEach((s, i) => {
        const url = s.metadata?.url?.startsWith('file_id://')
          ? s.metadata?.fileName || 'Uploaded File'
          : s.metadata?.url || '';
        const title = s.metadata?.title || url;
        md += `${i + 1}. [${title}](${url})\n`;
      });
      md += '\n';
    }

    md += `---\n\n`;
  }

  return md;
};

const formatJSON = (chat: any, chatMessages: any[]): string => {
  return JSON.stringify(
    {
      chat: {
        id: chat.id,
        title: chat.title,
        createdAt: chat.createdAt,
        sources: chat.sources,
        files: chat.files,
      },
      messages: chatMessages.map((msg) => ({
        messageId: msg.messageId,
        query: msg.query,
        originalQuery: msg.originalQuery,
        queryEdited: msg.queryEdited,
        createdAt: msg.createdAt,
        responseTimestamp: msg.responseTimestamp,
        responseDurationMs: msg.responseDurationMs,
        status: msg.status,
        provenance: {
          chatModel: msg.chatModelKey
            ? { provider: msg.chatModelProvider, model: msg.chatModelKey }
            : undefined,
          embeddingModel: msg.embeddingModelKey
            ? {
                provider: msg.embeddingModelProvider,
                model: msg.embeddingModelKey,
              }
            : undefined,
          optimizationMode: msg.optimizationMode,
          searchSources: msg.searchSources,
          isRewrite: msg.isRewrite,
          version: msg.version,
          previousVersionId: msg.previousVersionId,
          systemInstructions: msg.systemInstructions,
        },
        responseBlocks: msg.responseBlocks,
      })),
      exportedAt: new Date().toISOString(),
      format: 'perplexica-provenance-v1',
    },
    null,
    2,
  );
};

const formatCSV = (chat: any, chatMessages: any[]): string => {
  const headers = [
    'messageId',
    'query',
    'originalQuery',
    'queryEdited',
    'createdAt',
    'responseTimestamp',
    'responseDurationMs',
    'chatModelProvider',
    'chatModelKey',
    'optimizationMode',
    'isRewrite',
    'version',
    'status',
    'numSources',
    'responseText',
  ];

  const escape = (v: any): string => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const rows = chatMessages.map((msg) => {
    const responseBlocks: Block[] = msg.responseBlocks || [];
    const textBlocks = responseBlocks.filter(
      (b): b is TextBlock => b.type === 'text',
    );
    const sourceBlocks = responseBlocks.filter(
      (b): b is SourceBlock => b.type === 'source' && b.data.length > 0,
    );
    const text = textBlocks.map((b) => b.data).join('\n');
    const numSources = sourceBlocks.reduce(
      (acc, b) => acc + b.data.length,
      0,
    );

    return [
      msg.messageId,
      msg.query,
      msg.originalQuery ?? '',
      msg.queryEdited ?? false,
      msg.createdAt,
      msg.responseTimestamp ?? '',
      msg.responseDurationMs ?? '',
      msg.chatModelProvider ?? '',
      msg.chatModelKey ?? '',
      msg.optimizationMode ?? '',
      msg.isRewrite ?? false,
      msg.version ?? 1,
      msg.status,
      numSources,
      text,
    ]
      .map(escape)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const GET = async (
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const format = url.searchParams.get('format') || 'json';

    const chat = await db.query.chats.findFirst({
      where: eq(chats.id, id),
    });

    if (!chat) {
      return Response.json({ message: 'Chat not found' }, { status: 404 });
    }

    const chatMessages = await db.query.messages.findMany({
      where: eq(messages.chatId, id),
    });

    let body: string;
    let contentType: string;
    let filename: string;
    const slug = chat.title.substring(0, 40).replace(/[^a-zA-Z0-9]/g, '_');

    switch (format) {
      case 'markdown':
      case 'md':
        body = formatMarkdown(chat, chatMessages);
        contentType = 'text/markdown; charset=utf-8';
        filename = `${slug}.md`;
        break;
      case 'csv':
        body = formatCSV(chat, chatMessages);
        contentType = 'text/csv; charset=utf-8';
        filename = `${slug}.csv`;
        break;
      case 'json':
      default:
        body = formatJSON(chat, chatMessages);
        contentType = 'application/json';
        filename = `${slug}.json`;
        break;
    }

    return new Response(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error('Error exporting chat:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
