import { supabaseAdmin } from '../config/supabase';

export type CompanyRecord = {
  id: string;
  company_name: string;
  website: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
};

export const companiesRepository = {
  async create(input: { id: string; companyName: string; website?: string }): Promise<CompanyRecord> {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        id: input.id,
        company_name: input.companyName,
        website: input.website ?? null,
        verification_status: 'pending',
        verified_at: null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByUserId(userId: string): Promise<CompanyRecord | null> {
    const { data, error } = await supabaseAdmin.from('companies').select('*').eq('id', userId).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  }
};
