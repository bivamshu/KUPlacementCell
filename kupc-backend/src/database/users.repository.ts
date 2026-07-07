import { supabaseAdmin } from '../config/supabase';
import { Role } from '../modules/auth';

export type UserRecord = {
  id: string;
  email: string;
  role: Role;
  email_verified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
};

export const usersRepository = {
  async findById(id: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const { data, error } = await supabaseAdmin.from('users').select('*').eq('email', email).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async createStudentUser(input: { id: string; email: string }): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: input.id,
        email: input.email,
        role: Role.STUDENT,
        email_verified: false,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async createCompanyUser(input: { id: string; email: string; emailVerified?: boolean }): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: input.id,
        email: input.email,
        role: Role.COMPANY,
        email_verified: input.emailVerified ?? false,
        status: 'active'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async updateEmailVerified(id: string, emailVerified: boolean): Promise<UserRecord> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ email_verified: emailVerified, status: 'active' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async markEmailVerified(id: string): Promise<UserRecord> {
    return this.updateEmailVerified(id, true);
  }
};
