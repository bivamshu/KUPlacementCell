import type { Express } from 'express';
import {
  buildProfileImageObjectPath,
  getProfileImageBucket,
  objectPathFromPublicUrl,
  profileImageStorage
} from '../../config/profileImageStorage';
import { companiesRepository } from '../../database/companies.repository';
import { assertValidImageBuffer } from '../../middleware/profileImageUpload';
import { AppError } from '../../utils/AppError';
import { companyNotFoundError } from './companies.errors';
import { toCompanyProfileDto, toCompanyPublicCardDto } from './companies.mapper';
import type { CompanyProfileDto, CompanyPublicCardDto, UpdateCompanyProfileInput } from './companies.types';

export const companiesService = {
  async getMe(userId: string): Promise<CompanyProfileDto> {
    const company = await companiesRepository.findByUserId(userId);

    if (!company) {
      throw companyNotFoundError();
    }

    return toCompanyProfileDto(company);
  },

  async updateMe(userId: string, input: UpdateCompanyProfileInput): Promise<CompanyProfileDto> {
    const existing = await companiesRepository.findByUserId(userId);

    if (!existing) {
      throw companyNotFoundError();
    }

    const updated = await companiesRepository.updateProfile(userId, input);
    return toCompanyProfileDto(updated);
  },

  async uploadLogo(userId: string, file?: Express.Multer.File): Promise<CompanyProfileDto> {
    if (!file) {
      throw new AppError('Image file is required', 400, 'VALIDATION_ERROR');
    }

    assertValidImageBuffer(file.buffer);

    const company = await companiesRepository.findByUserId(userId);

    if (!company) {
      throw companyNotFoundError();
    }

    const objectPath = buildProfileImageObjectPath(userId, file.mimetype);

    let publicUrl: string;
    try {
      publicUrl = await profileImageStorage.uploadImage('logo', objectPath, file.buffer, file.mimetype);
    } catch {
      throw new AppError('Failed to store logo image', 500, 'STORAGE_UPLOAD_FAILED');
    }

    const updated = await companiesRepository.updateProfile(userId, { logoUrl: publicUrl });

    // Best-effort cleanup of the previous logo; never fail the request.
    if (company.logo_url) {
      const previousPath = objectPathFromPublicUrl(company.logo_url, getProfileImageBucket('logo'));
      if (previousPath) {
        await profileImageStorage.deleteObject('logo', previousPath).catch(() => undefined);
      }
    }

    return toCompanyProfileDto(updated);
  },

  async getPublicById(id: string): Promise<CompanyPublicCardDto> {
    const company = await companiesRepository.findById(id);

    // Pending/rejected companies return the same 404 as unknown ids so their
    // existence is never leaked to students.
    if (!company || company.verification_status !== 'approved') {
      throw companyNotFoundError();
    }

    return toCompanyPublicCardDto(company);
  }
};
