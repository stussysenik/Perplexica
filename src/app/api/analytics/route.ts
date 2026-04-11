import db from '@/lib/db';
import { messages, chats } from '@/lib/db/schema';
import { sql, desc } from 'drizzle-orm';

export const GET = async (req: Request) => {
  try {
    const url = new URL(req.url);
    const range = url.searchParams.get('range') || '30d';

    let dateFilter = '';
    const days = parseInt(range.replace('d', ''));
    if (!isNaN(days)) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      dateFilter = ` AND "createdAt" >= '${cutoff.toISOString()}'`;
    }

    const totalChats = await db.select({ count: sql<number>`count(*)` }).from(chats);
    const totalMessages = await db.select({ count: sql<number>`count(*)` }).from(messages);
    const completedMessages = await db.select({ count: sql<number>`count(*)` }).from(messages).where(sql`status = 'completed'`);

    const modelUsage = await db
      .select({
        provider: messages.chatModelProvider,
        model: messages.chatModelKey,
        count: sql<number>`count(*)`,
        avgDuration: sql<number>`avg("responseDurationMs")`,
      })
      .from(messages)
      .where(sql`"chatModelKey" IS NOT NULL`)
      .groupBy(messages.chatModelProvider, messages.chatModelKey)
      .orderBy(sql`count(*) desc`);

    const modeUsage = await db
      .select({
        mode: messages.optimizationMode,
        count: sql<number>`count(*)`,
      })
      .from(messages)
      .where(sql`"optimizationMode" IS NOT NULL`)
      .groupBy(messages.optimizationMode);

    const recentMessages = await db
      .select({
        messageId: messages.messageId,
        query: messages.query,
        chatModelKey: messages.chatModelKey,
        optimizationMode: messages.optimizationMode,
        responseDurationMs: messages.responseDurationMs,
        createdAt: messages.createdAt,
        isRewrite: messages.isRewrite,
        version: messages.version,
      })
      .from(messages)
      .orderBy(desc(messages.createdAt))
      .limit(50);

    const rewriteStats = await db
      .select({
        totalRewrites: sql<number>`count(*) filter (WHERE "isRewrite" = 1)`,
        totalOriginals: sql<number>`count(*) filter (WHERE "isRewrite" = 0 OR "isRewrite" IS NULL)`,
      })
      .from(messages);

    return Response.json({
      summary: {
        totalChats: totalChats[0]?.count ?? 0,
        totalMessages: totalMessages[0]?.count ?? 0,
        completedMessages: completedMessages[0]?.count ?? 0,
        range,
      },
      modelUsage,
      modeUsage,
      rewriteStats: rewriteStats[0] ?? { totalRewrites: 0, totalOriginals: 0 },
      recentMessages,
      format: 'perplexica-analytics-v1',
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Error generating analytics:', err);
    return Response.json(
      { message: 'An error has occurred.' },
      { status: 500 },
    );
  }
};
