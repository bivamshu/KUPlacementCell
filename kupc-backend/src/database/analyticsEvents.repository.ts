import { supabaseAdmin } from '../config/supabase';

export type AnalyticsEventRecord = {
  id: string;
  user_id: string | null;
  event_type: string;
  metadata: unknown;
  created_at: string;
};

export const analyticsEventsRepository = {
  async create(input: {
    userId?: string | null;
    eventType: string;
    metadata?: unknown;
  }): Promise<AnalyticsEventRecord> {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .insert({
        user_id: input.userId ?? null,
        event_type: input.eventType,
        metadata: input.metadata ?? null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByUser(userId: string): Promise<AnalyticsEventRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listByEventType(eventType: string): Promise<AnalyticsEventRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('analytics_events')
      .select('*')
      .eq('event_type', eventType)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  }
};
