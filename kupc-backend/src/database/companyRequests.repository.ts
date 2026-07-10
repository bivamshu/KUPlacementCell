import { supabaseAdmin } from '../config/supabase';

export type CompanyRequestRecord = {
  id: string;
  company_id: string;
  document_type: string;
  file_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export const companyRequestsRepository = {
  async create(input: {
    companyId: string;
    documentType: string;
    fileUrl?: string;
  }): Promise<CompanyRequestRecord> {
    const { data, error } = await supabaseAdmin
      .from('company_verification_requests')
      .insert({
        company_id: input.companyId,
        document_type: input.documentType,
        file_url: input.fileUrl ?? null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByCompany(companyId: string): Promise<CompanyRequestRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('company_verification_requests')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async listPending(): Promise<CompanyRequestRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('company_verification_requests')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async setStatus(
    id: string,
    status: CompanyRequestRecord['status']
  ): Promise<CompanyRequestRecord> {
    const { data, error } = await supabaseAdmin
      .from('company_verification_requests')
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

/** Alias matching the Phase 3 table name. */
export const companyVerificationRequestsRepository = companyRequestsRepository;
