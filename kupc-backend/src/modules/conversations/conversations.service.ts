import { Role } from '../auth';
import { conversationNotImplementedError } from './conversations.errors';
import type {
  ConversationDto,
  CreateMessageServiceInput,
  EnsureConversationServiceInput,
  MarkReadResult,
  MessageDto
} from './conversations.types';

export type ConversationViewer = {
  id: string;
  role: Role;
};

/**
 * Phase 8 B1 — contracts only. B2 ensure/list; B3 messages.
 */
export const conversationsService = {
  async listMine(_viewer: ConversationViewer): Promise<ConversationDto[]> {
    throw conversationNotImplementedError();
  },

  async ensure(
    _viewer: ConversationViewer,
    _input: EnsureConversationServiceInput
  ): Promise<ConversationDto> {
    throw conversationNotImplementedError();
  },

  async getById(_viewer: ConversationViewer, _conversationId: string): Promise<ConversationDto> {
    throw conversationNotImplementedError();
  },

  async listMessages(
    _viewer: ConversationViewer,
    _conversationId: string,
    _query?: { limit?: number; before?: string }
  ): Promise<MessageDto[]> {
    throw conversationNotImplementedError();
  },

  async sendMessage(
    _viewer: ConversationViewer,
    _conversationId: string,
    _input: CreateMessageServiceInput
  ): Promise<MessageDto> {
    throw conversationNotImplementedError();
  },

  async markRead(_viewer: ConversationViewer, _conversationId: string): Promise<MarkReadResult> {
    throw conversationNotImplementedError();
  }
};
