import { env } from './env';
import { supabaseAdmin } from './supabase';

export type ProfileImageKind = 'avatar' | 'logo';

const EXTENSION_BY_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp'
};

export function getProfileImageBucket(kind: ProfileImageKind): string {
  return kind === 'avatar' ? env.AVATAR_STORAGE_BUCKET : env.COMPANY_LOGO_STORAGE_BUCKET;
}

export function buildProfileImageObjectPath(ownerId: string, mimeType: string): string {
  const ext = EXTENSION_BY_MIME[mimeType] ?? 'jpg';
  return `${ownerId}/${Date.now()}.${ext}`;
}

/** Derive the object path from a stored public URL (for best-effort cleanup). */
export function objectPathFromPublicUrl(publicUrl: string, bucket: string): string | null {
  const marker = `/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  return index === -1 ? null : publicUrl.slice(index + marker.length);
}

export const profileImageStorage = {
  async uploadImage(
    kind: ProfileImageKind,
    objectPath: string,
    buffer: Buffer,
    mimeType: string
  ): Promise<string> {
    const bucket = getProfileImageBucket(kind);

    const { error } = await supabaseAdmin.storage.from(bucket).upload(objectPath, buffer, {
      contentType: mimeType,
      upsert: false
    });

    if (error) {
      throw error;
    }

    const { data } = supabaseAdmin.storage.from(bucket).getPublicUrl(objectPath);
    return data.publicUrl;
  },

  async deleteObject(kind: ProfileImageKind, objectPath: string): Promise<void> {
    const { error } = await supabaseAdmin.storage.from(getProfileImageBucket(kind)).remove([objectPath]);

    if (error) {
      throw error;
    }
  }
};
