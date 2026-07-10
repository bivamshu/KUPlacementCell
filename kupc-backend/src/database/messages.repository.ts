import { supabaseAdmin } from '../config/supabase';

export type MessageRecord = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  sent_at: string;
};

export const messagesRepository = {
  async create(input: {
    conversationId: string;
    senderId: string;
    content: string;
  }): Promise<MessageRecord> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: input.conversationId,
        sender_id: input.senderId,
        content: input.content
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByConversation(conversationId: string): Promise<MessageRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('sent_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async markRead(messageId: string, readAt: Date = new Date()): Promise<MessageRecord> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .update({ read_at: readAt.toISOString() })
      .eq('id', messageId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
