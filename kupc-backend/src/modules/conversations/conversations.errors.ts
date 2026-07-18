import { AppError } from '../../utils/AppError';
import { CONVERSATION_ERROR_CODES } from './conversations.constants';

export function conversationNotFoundError(message = 'Conversation not found'): AppError {
  return new AppError(message, 404, CONVERSATION_ERROR_CODES.CONVERSATION_NOT_FOUND);
}

export function conversationForbiddenError(message = 'Conversation access forbidden'): AppError {
  return new AppError(message, 403, CONVERSATION_ERROR_CODES.CONVERSATION_FORBIDDEN);
}

export function messageNotFoundError(message = 'Message not found'): AppError {
  return new AppError(message, 404, CONVERSATION_ERROR_CODES.MESSAGE_NOT_FOUND);
}

export function invalidMessagePayloadError(message = 'Invalid message payload'): AppError {
  return new AppError(message, 400, CONVERSATION_ERROR_CODES.INVALID_MESSAGE_PAYLOAD);
}

export function invalidConversationPayloadError(message = 'Invalid conversation payload'): AppError {
  return new AppError(message, 400, CONVERSATION_ERROR_CODES.INVALID_CONVERSATION_PAYLOAD);
}

export function conversationNotImplementedError(
  message = 'Conversations handler not implemented yet (Phase 8 B2+)'
): AppError {
  return new AppError(message, 501, CONVERSATION_ERROR_CODES.NOT_IMPLEMENTED);
}
