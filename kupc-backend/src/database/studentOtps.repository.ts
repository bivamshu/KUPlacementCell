import { supabaseAdmin } from '../config/supabase';

export type StudentOtpRecord = {
  id: string;
  email: string;
  otp_hash: string;
  attempts: number;
  expires_at: string;
  consumed_at: string | null;
  created_at: string;
};

export const studentOtpsRepository = {
  async create(input: { email: string; otpHash: string; expiresAt: Date }): Promise<StudentOtpRecord> {
    const { data, error } = await supabaseAdmin
      .from('student_otps')
      .insert({
        email: input.email,
        otp_hash: input.otpHash,
        attempts: 0,
        expires_at: input.expiresAt.toISOString(),
        consumed_at: null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findLatestActiveByEmail(email: string): Promise<StudentOtpRecord | null> {
    const { data, error } = await supabaseAdmin
      .from('student_otps')
      .select('*')
      .eq('email', email)
      .is('consumed_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async incrementAttempts(id: string, attempts: number): Promise<void> {
    const { error } = await supabaseAdmin.from('student_otps').update({ attempts }).eq('id', id);

    if (error) {
      throw error;
    }
  },

  async consume(id: string): Promise<void> {
    const { error } = await supabaseAdmin.from('student_otps').update({ consumed_at: new Date().toISOString() }).eq('id', id);

    if (error) {
      throw error;
    }
  }
};
