import {
  BarChart2,
  Bookmark,
  Briefcase,
  Building2,
  Compass,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
  User,
  Users,
} from 'lucide-react';

export type ScreenId =
  | 'dashboard'
  | 'discover'
  | 'matches'
  | 'chat'
  | 'resume'
  | 'saved'
  | 'profile'
  | 'settings'
  | 'notifications'
  | 'discover-students'
  | 'job-post'
  | 'applicants'
  | 'analytics'
  | 'company-approval'
  | 'users'
  | 'company-profile';

export type NavItem = {
  id: ScreenId;
  label: string;
  icon: React.ElementType;
};

export const STUDENT_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'matches', label: 'Matches', icon: Heart },
  { id: 'chat', label: 'Messages', icon: MessageSquare },
  { id: 'resume', label: 'Resume AI', icon: FileText },
  { id: 'saved', label: 'Saved', icon: Bookmark },
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const COMPANY_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'discover-students', label: 'Discover', icon: Compass },
  { id: 'matches', label: 'Matches', icon: Heart },
  { id: 'chat', label: 'Chats', icon: MessageSquare },
  { id: 'job-post', label: 'Job Posts', icon: Briefcase },
  { id: 'applicants', label: 'Applicants', icon: Users },
  { id: 'company-profile', label: 'Company Profile', icon: Building2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
  { id: 'company-approval', label: 'Company Requests', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'settings', label: 'Settings', icon: Settings },
];
