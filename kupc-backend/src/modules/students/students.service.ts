import type { Express } from 'express';
import {
  buildProfileImageObjectPath,
  getProfileImageBucket,
  objectPathFromPublicUrl,
  profileImageStorage
} from '../../config/profileImageStorage';
import { resumesRepository } from '../../database/resumes.repository';
import { studentsRepository } from '../../database/students.repository';
import { assertValidImageBuffer } from '../../middleware/profileImageUpload';
import { AppError } from '../../utils/AppError';
import {
  toActiveResumeSummary,
  toStudentProfileDto,
  toStudentPublicCardDto
} from './students.mapper';
import { studentNotFoundError } from './students.errors';
import type { StudentProfileDto, StudentPublicCardDto, UpdateStudentProfileInput } from './students.types';

async function loadActiveResumeSummary(resumeId: string | null) {
  if (!resumeId) return null;

  const resume = await resumesRepository.findById(resumeId);
  return resume ? toActiveResumeSummary(resume) : null;
}

export const studentsService = {
  async getMe(userId: string): Promise<StudentProfileDto> {
    const student = await studentsRepository.findById(userId);

    if (!student) {
      throw studentNotFoundError();
    }

    const activeResume = await loadActiveResumeSummary(student.resume_id);
    return toStudentProfileDto(student, activeResume);
  },

  async updateMe(userId: string, input: UpdateStudentProfileInput): Promise<StudentProfileDto> {
    const existing = await studentsRepository.findById(userId);

    if (!existing) {
      throw studentNotFoundError();
    }

    const updated = await studentsRepository.updateProfile(userId, input);
    const activeResume = await loadActiveResumeSummary(updated.resume_id);
    return toStudentProfileDto(updated, activeResume);
  },

  async uploadAvatar(userId: string, file?: Express.Multer.File): Promise<StudentProfileDto> {
    if (!file) {
      throw new AppError('Image file is required', 400, 'VALIDATION_ERROR');
    }

    assertValidImageBuffer(file.buffer);

    const student = await studentsRepository.findById(userId);

    if (!student) {
      throw studentNotFoundError();
    }

    const objectPath = buildProfileImageObjectPath(userId, file.mimetype);

    let publicUrl: string;
    try {
      publicUrl = await profileImageStorage.uploadImage('avatar', objectPath, file.buffer, file.mimetype);
    } catch {
      throw new AppError('Failed to store avatar image', 500, 'STORAGE_UPLOAD_FAILED');
    }

    const updated = await studentsRepository.updateProfile(userId, { profilePictureUrl: publicUrl });

    // Best-effort cleanup of the previous avatar; never fail the request.
    if (student.profile_picture_url) {
      const previousPath = objectPathFromPublicUrl(
        student.profile_picture_url,
        getProfileImageBucket('avatar')
      );
      if (previousPath) {
        await profileImageStorage.deleteObject('avatar', previousPath).catch(() => undefined);
      }
    }

    const activeResume = await loadActiveResumeSummary(updated.resume_id);
    return toStudentProfileDto(updated, activeResume);
  },

  async getPublicById(id: string): Promise<StudentPublicCardDto> {
    const student = await studentsRepository.findById(id);

    if (!student) {
      throw studentNotFoundError();
    }

    return toStudentPublicCardDto(student);
  }
};
