import { supabaseAdmin } from '../config/supabase';

export type CompanyRequestRecord = {
  id: string;
  company_id: string;
  document_type: string;
  file_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export const companyRequestsRepository = {
  async create(input: { companyId: string; documentType: string; fileUrl: string }): Promise<CompanyRequestRecord> {
    const { data, error } = await supabaseAdmin
      .from('company_requests')
      .insert({
        company_id: input.companyId,
        document_type: input.documentType,
        file_url: input.fileUrl,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  }
};
