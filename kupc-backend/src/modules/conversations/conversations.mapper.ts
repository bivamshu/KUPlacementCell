import type { ConversationRecord } from '../../database/conversations.repository';
import type { MessageRecord } from '../../database/messages.repository';
import type {
  CreateMessageBody,
  EnsureConversationBody
} from './conversations.validation';
import type {
  ConversationDto,
  CreateMessageServiceInput,
  EnsureConversationServiceInput,
  MessageDto
} from './conversations.types';

export function toConversationDto(conversation: ConversationRecord): ConversationDto {
  return {
    id: conversation.id,
    match_id: conversation.match_id,
    created_at: conversation.created_at
  };
}

export function toMessageDto(message: MessageRecord): MessageDto {
  return {
    id: message.id,
    conversation_id: message.conversation_id,
    sender_id: message.sender_id,
    content: message.content,
    sent_at: message.sent_at,
    read_at: message.read_at
  };
}

export function toEnsureConversationServiceInput(
  body: EnsureConversationBody
): EnsureConversationServiceInput {
  return {
    matchId: body.match_id
  };
}

export function toCreateMessageServiceInput(body: CreateMessageBody): CreateMessageServiceInput {
  return {
    content: body.content
  };
}
