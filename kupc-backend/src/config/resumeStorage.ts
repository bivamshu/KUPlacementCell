import { env } from './env';
import { supabaseAdmin } from './supabase';

export function getResumeStorageBucket(): string {
  return env.RESUME_STORAGE_BUCKET;
}

export function buildResumeObjectPath(studentId: string, resumeId: string, fileName: string): string {
  return `${studentId}/${resumeId}/${fileName}`;
}

export const resumeStorage = {
  async uploadPdf(objectPath: string, buffer: Buffer): Promise<string> {
    const { data, error } = await supabaseAdmin.storage
      .from(getResumeStorageBucket())
      .upload(objectPath, buffer, {
        contentType: 'application/pdf',
        upsert: false
      });

    if (error) {
      throw error;
    }

    return data.path;
  },

  async deleteObject(objectPath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(getResumeStorageBucket()).remove([objectPath]);

    if (error) {
      throw error;
    }
  },

  async downloadPdf(objectPath: string): Promise<Buffer> {
    const { data, error } = await supabaseAdmin.storage.from(getResumeStorageBucket()).download(objectPath);

    if (error) {
      throw error;
    }

    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
};
