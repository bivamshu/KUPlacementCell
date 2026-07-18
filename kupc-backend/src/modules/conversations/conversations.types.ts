/** Wire DTO — snake_case. Nested cards filled in B2+. */
export type ConversationDto = {
  id: string;
  match_id: string;
  created_at: string;
  job?: {
    id: string;
    title: string;
    status: string;
  };
  student?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  company?: {
    id: string;
    company_name: string;
    logo_url: string | null;
  };
  last_message?: MessageDto | null;
  unread_count?: number;
};

export type MessageDto = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  sent_at: string;
  read_at: string | null;
};

/** Service ensure input (camelCase) from POST /conversations/ensure body. */
export type EnsureConversationServiceInput = {
  matchId: string;
};

/** Service create-message input (camelCase). */
export type CreateMessageServiceInput = {
  content: string;
};

export type MarkReadResult = {
  updated: number;
};
