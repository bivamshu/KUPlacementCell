import { supabaseAdmin } from '../config/supabase';

export type StudentRecord = {
  id: string;
  ku_id: string;
  full_name: string;
  graduation_year: number | null;
  department: string | null;
  phone: string | null;
  degree: string | null;
  cgpa: number | null;
  bio: string | null;
  profile_picture_url: string | null;
  resume_id: string | null;
  created_at: string;
  updated_at: string;
};

export type StudentProfileUpdate = {
  fullName?: string;
  phone?: string | null;
  degree?: string | null;
  cgpa?: number | null;
  bio?: string | null;
  profilePictureUrl?: string | null;
  department?: string | null;
  graduationYear?: number | null;
  resumeId?: string | null;
};

export const studentsRepository = {
  async create(input: { id: string; kuId: string; fullName: string }): Promise<StudentRecord> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .insert({
        id: input.id,
        ku_id: input.kuId,
        full_name: input.fullName,
        graduation_year: null,
        department: null
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  async findById(id: string): Promise<StudentRecord | null> {
    const { data, error } = await supabaseAdmin.from('students').select('*').eq('id', id).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async findByIds(ids: string[]): Promise<StudentRecord[]> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) {
      return [];
    }

    const { data, error } = await supabaseAdmin.from('students').select('*').in('id', unique);

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async findByKuId(kuId: string): Promise<StudentRecord | null> {
    const { data, error } = await supabaseAdmin.from('students').select('*').eq('ku_id', kuId).maybeSingle();

    if (error) {
      throw error;
    }

    return data;
  },

  async listByDepartment(department: string): Promise<StudentRecord[]> {
    const { data, error } = await supabaseAdmin
      .from('students')
      .select('*')
      .eq('department', department)
      .order('full_name', { ascending: true });

    if (error) {
      throw error;
    }

    return data ?? [];
  },

  async updateProfile(id: string, input: StudentProfileUpdate): Promise<StudentRecord> {
    const patch: Record<string, unknown> = {};

    if (input.fullName !== undefined) patch.full_name = input.fullName;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.degree !== undefined) patch.degree = input.degree;
    if (input.cgpa !== undefined) patch.cgpa = input.cgpa;
    if (input.bio !== undefined) patch.bio = input.bio;
    if (input.profilePictureUrl !== undefined) patch.profile_picture_url = input.profilePictureUrl;
    if (input.department !== undefined) patch.department = input.department;
    if (input.graduationYear !== undefined) patch.graduation_year = input.graduationYear;
    if (input.resumeId !== undefined) patch.resume_id = input.resumeId;

    const { data, error } = await supabaseAdmin.from('students').update(patch).eq('id', id).select().single();

    if (error) {
      throw error;
    }

    return data;
  },

  async setActiveResume(id: string, resumeId: string | null): Promise<StudentRecord> {
    return this.updateProfile(id, { resumeId });
  }
};
