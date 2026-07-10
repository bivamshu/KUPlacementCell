import { supabaseAdmin } from '../config/supabase';

export type NotificationRecord = {
  id: string;
  user_id: string;
  type: string;
  payload: unknown;
  read_at: string | null;
  created_at: string;
};

export const notificationsRepository = {
  async create(input: {
    userId: string;
    type: string;
    payload?: unknown;
  }): Promise<NotificationRecord> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .insert({
        user_id: input.userId,
        type: input.type,
        payload: input.payload ?? null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByUser(userId: string): Promise<NotificationRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async markRead(id: string, readAt: Date = new Date()): Promise<NotificationRecord> {
    const { data, error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: readAt.toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async markAllReadForUser(userId: string, readAt: Date = new Date()): Promise<void> {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: readAt.toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);

    if (error) {
      throw error;
    }
  }
};
