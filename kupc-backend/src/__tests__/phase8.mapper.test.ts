import type { ConversationRecord } from '../database/conversations.repository';
import type { MessageRecord } from '../database/messages.repository';
import {
  toConversationDto,
  toCreateMessageServiceInput,
  toEnsureConversationServiceInput,
  toMessageDto
} from '../modules/conversations/conversations.mapper';

describe('Phase 8 B1 - conversation/message mappers', () => {
  it('toConversationDto maps repository row to snake_case DTO', () => {
    const row: ConversationRecord = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      match_id: '550e8400-e29b-41d4-a716-446655440010',
      created_at: '2026-07-18T12:00:00.000Z'
    };

    expect(toConversationDto(row)).toEqual({
      id: row.id,
      match_id: row.match_id,
      created_at: row.created_at
    });
  });

  it('toMessageDto maps repository row to snake_case DTO', () => {
    const row: MessageRecord = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      conversation_id: '550e8400-e29b-41d4-a716-446655440001',
      sender_id: '550e8400-e29b-41d4-a716-446655440099',
      content: 'Hello',
      sent_at: '2026-07-18T12:01:00.000Z',
      read_at: null
    };

    expect(toMessageDto(row)).toEqual({
      id: row.id,
      conversation_id: row.conversation_id,
      sender_id: row.sender_id,
      content: 'Hello',
      sent_at: row.sent_at,
      read_at: null
    });
  });

  it('toEnsureConversationServiceInput maps snake_case body to camelCase', () => {
    expect(
      toEnsureConversationServiceInput({
        match_id: '550e8400-e29b-41d4-a716-446655440010'
      })
    ).toEqual({
      matchId: '550e8400-e29b-41d4-a716-446655440010'
    });
  });

  it('toCreateMessageServiceInput maps snake_case body to camelCase', () => {
    expect(toCreateMessageServiceInput({ content: 'Hi there' })).toEqual({
      content: 'Hi there'
    });
  });
});
