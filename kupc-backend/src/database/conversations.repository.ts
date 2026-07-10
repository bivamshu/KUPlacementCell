import { supabaseAdmin } from '../config/supabase';

export type ConversationRecord = {
  id: string;
  match_id: string;
  created_at: string;
};

export const conversationsRepository = {
  async createForMatch(matchId: string): Promise<ConversationRecord> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .insert({ match_id: matchId })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<ConversationRecord | null> {
    const { data, error } = await supabaseAdmin.from('conversations').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByMatchId(matchId: string): Promise<ConversationRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('match_id', matchId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
};
