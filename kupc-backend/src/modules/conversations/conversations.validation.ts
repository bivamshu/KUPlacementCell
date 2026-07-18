import { z } from 'zod';
import { MESSAGE_CONTENT_MAX_LENGTH } from './conversations.constants';

export const ensureConversationSchema = z.object({
  body: z
    .object({
      match_id: z.string().uuid()
    })
    .strip(),
  params: z.object({}).optional(),
  query: z.object({}).optional()
});

export const conversationIdParamsSchema = z.object({
  body: z.object({}).optional(),
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip(),
  query: z.object({}).optional()
});

export const listMessagesQuerySchema = z.object({
  body: z.object({}).optional(),
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip(),
  query: z
    .object({
      limit: z.coerce.number().int().min(1).max(100).default(50),
      before: z.string().uuid().optional()
    })
    .strip()
});

export const createMessageSchema = z.object({
  body: z
    .object({
      content: z.string().trim().min(1).max(MESSAGE_CONTENT_MAX_LENGTH)
    })
    .strip(),
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip(),
  query: z.object({}).optional()
});

export const markReadSchema = z.object({
  body: z.object({}).optional(),
  params: z
    .object({
      id: z.string().uuid()
    })
    .strip(),
  query: z.object({}).optional()
});

export type EnsureConversationBody = {
  match_id: string;
};

export type CreateMessageBody = {
  content: string;
};
