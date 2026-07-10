import { supabaseAdmin } from '../config/supabase';

export type ReportStatus = 'open' | 'reviewed' | 'dismissed';

export type ReportRecord = {
  id: string;
  reporter_id: string;
  target_user_id: string;
  reason: string;
  status: ReportStatus;
  created_at: string;
};

export const reportsRepository = {
  async create(input: {
    reporterId: string;
    targetUserId: string;
    reason: string;
  }): Promise<ReportRecord> {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .insert({
        reporter_id: input.reporterId,
        target_user_id: input.targetUserId,
        reason: input.reason,
        status: 'open'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByReporter(reporterId: string): Promise<ReportRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('reporter_id', reporterId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listOpen(): Promise<ReportRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async setStatus(id: string, status: ReportStatus): Promise<ReportRecord> {
    const { data, error } = await supabaseAdmin
      .from('reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
