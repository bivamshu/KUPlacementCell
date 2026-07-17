import type { Role as ApiRole } from '../api/types';

/** UI portal role used by the sidebar (lowercase). */
export type UiRole = 'student' | 'company' | 'admin';

export function toUiRole(role: ApiRole): UiRole {
  switch (role) {
    case 'STUDENT':
      return 'student';
    case 'COMPANY':
      return 'company';
    case 'ADMIN':
      return 'admin';
  }
}

export function screensForRole(role: UiRole): Set<string> {
  if (role === 'student') {
    return new Set([
      'dashboard',
      'discover',
      'matches',
      'chat',
      'resume',
      'saved',
      'profile',
      'settings',
      'notifications',
    ]);
  }
  if (role === 'company') {
    return new Set([
      'dashboard',
      'discover-students',
      'job-post',
      'applicants',
      'matches',
      'chat',
      'company-profile',
      'settings',
      'notifications',
    ]);
  }
  return new Set([
    'dashboard',
    'company-approval',
    'users',
    'analytics',
    'settings',
    'notifications',
  ]);
}
