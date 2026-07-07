import { Role } from './auth.constants';

export type AuthenticatedUser = {
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
};
