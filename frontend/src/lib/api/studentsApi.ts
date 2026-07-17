import { apiRequest } from './client';
import type { StudentProfile, StudentPublicCard, UpdateStudentProfileBody } from './types';

export const studentsApi = {
  getMe() {
    return apiRequest<StudentProfile>('/students/me', { method: 'GET' });
  },

  updateMe(body: UpdateStudentProfileBody) {
    return apiRequest<StudentProfile>('/students/me', {
      method: 'PATCH',
      body,
    });
  },

  uploadAvatar(file: File) {
    const form = new FormData();
    form.append('file', file);
    return apiRequest<StudentProfile>('/students/me/avatar', {
      method: 'POST',
      body: form,
    });
  },

  getPublicById(id: string) {
    return apiRequest<StudentPublicCard>(`/students/${id}`, { method: 'GET' });
  },
};
