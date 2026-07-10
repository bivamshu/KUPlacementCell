import { supabaseAdmin } from '../config/supabase';

export type CompanyRecord = {
  id: string;
  company_name: string;
  website: string | null;
  verification_status: 'pending' | 'approved' | 'rejected';
  verified_at: string | null;
  industry: string | null;
  description: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyProfileUpdate = {
  companyName?: string;
  website?: string | null;
  industry?: string | null;
  description?: string | null;
  logoUrl?: string | null;
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
  },

  async findById(id: string): Promise<CompanyRecord | null> {
    return this.findByUserId(id);
  },

  async listByVerificationStatus(
    status: CompanyRecord['verification_status']
  ): Promise<CompanyRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .select('*')
      .eq('verification_status', status)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listPending(): Promise<CompanyRecord[]> {
    return this.listByVerificationStatus('pending');
  },

  async listApproved(): Promise<CompanyRecord[]> {
    return this.listByVerificationStatus('approved');
  },

  async updateProfile(id: string, input: CompanyProfileUpdate): Promise<CompanyRecord> {
    const patch: Record<string, unknown> = {};

    if (input.companyName !== undefined) patch.company_name = input.companyName;
    if (input.website !== undefined) patch.website = input.website;
    if (input.industry !== undefined) patch.industry = input.industry;
    if (input.description !== undefined) patch.description = input.description;
    if (input.logoUrl !== undefined) patch.logo_url = input.logoUrl;

    const { data, error } = await supabaseAdmin.from('companies').update(patch).eq('id', id).select().single();

    if (error) {
      throw error;
    }

    return data;
  },

  async setVerificationStatus(
    id: string,
    status: CompanyRecord['verification_status']
  ): Promise<CompanyRecord> {
    const { data, error } = await supabaseAdmin
      .from('companies')
      .update({
        verification_status: status,
        verified_at: status === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
