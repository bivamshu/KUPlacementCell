import { supabaseAdmin } from '../config/supabase';

export type SessionRecord = {
  id: string;
  user_id: string;
  device_info: string | null;
  ip_address: string | null;
  created_at: string;
  expires_at: string;
};

export const sessionsRepository = {
  async create(input: { userId: string; deviceInfo?: string; ipAddress?: string; expiresAt: Date }): Promise<SessionRecord> {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert({
        user_id: input.userId,
        device_info: input.deviceInfo ?? null,
        ip_address: input.ipAddress ?? null,
        expires_at: input.expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
