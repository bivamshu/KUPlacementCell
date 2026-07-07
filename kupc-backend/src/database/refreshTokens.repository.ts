import { supabaseAdmin } from '../config/supabase';

export type RefreshTokenRecord = {
  id: string;
  user_id: string;
  session_id: string;
  token_hash: string;
  expires_at: string;
  revoked: boolean;
  created_at: string;
};

export const refreshTokensRepository = {
  async create(input: { userId: string; sessionId: string; tokenHash: string; expiresAt: Date }): Promise<RefreshTokenRecord> {
    const { data, error } = await supabaseAdmin
      .from('refresh_tokens')
      .insert({
        user_id: input.userId,
        session_id: input.sessionId,
        token_hash: input.tokenHash,
        expires_at: input.expiresAt.toISOString(),
        revoked: false
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
