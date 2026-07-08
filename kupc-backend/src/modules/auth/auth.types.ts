import { Role } from './auth.constants';

//Comphrehensive Authenticated User Payload Session State
export type AuthenticatedUser = {
  id: string;
  sessionId: string;
  role: Role;
  email: string;
  emailVerified: boolean;
  status: 'active' | 'suspended' | 'deleted';
  verificationStatus?: 'pending' | 'approved' | 'rejected';
};

//Global augmentation to safely sttach the typed user context to Express requests
declare global{
  namespace Express {
    interface Request {
      //Binds the upstream aunthenticate middleware results directly to req.iser
      user? : AuthenticatedUser;
    }
  }
}
