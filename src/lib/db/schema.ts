import { sql } from 'drizzle-orm';
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';
import { Block } from '../types';
import { SearchSources } from '../agents/search/types';

export const messages = sqliteTable('messages', {
  id: integer('id').primaryKey(),
  messageId: text('messageId').notNull(),
  chatId: text('chatId').notNull(),
  backendId: text('backendId').notNull(),
  query: text('query').notNull(),
  createdAt: text('createdAt').notNull(),
  responseBlocks: text('responseBlocks', { mode: 'json' })
    .$type<Block[]>()
    .default(sql`'[]'`),
  status: text({ enum: ['answering', 'completed', 'error'] }).default(
    'answering',
  ),

  originalQuery: text('originalQuery'),
  queryEdited: integer('queryEdited', { mode: 'boolean' }).default(false),

  chatModelProvider: text('chatModelProvider'),
  chatModelKey: text('chatModelKey'),
  embeddingModelProvider: text('embeddingModelProvider'),
  embeddingModelKey: text('embeddingModelKey'),
  optimizationMode: text('optimizationMode'),

  searchSources: text('searchSources', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'[]'`),
  sourceUrls: text('sourceUrls', { mode: 'json' })
    .$type<string[]>()
    .default(sql`'[]'`),

  responseDurationMs: integer('responseDurationMs'),
  responseTimestamp: text('responseTimestamp'),

  version: integer('version').default(1),
  previousVersionId: text('previousVersionId'),
  isRewrite: integer('isRewrite', { mode: 'boolean' }).default(false),

  parentId: text('parentId'),
  branchIndex: integer('branchIndex').default(0),
  isCompacted: integer('isCompacted', { mode: 'boolean' }).default(false),
  compactSummary: text('compactSummary'),

  systemInstructions: text('systemInstructions'),
});

interface DBFile {
  name: string;
  fileId: string;
}

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  createdAt: text('createdAt').notNull(),
  sources: text('sources', {
    mode: 'json',
  })
    .$type<SearchSources[]>()
    .default(sql`'[]'`),
  files: text('files', { mode: 'json' })
    .$type<DBFile[]>()
    .default(sql`'[]'`),
});
