import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { RequireAuth, RequireGuest } from './guards';
import { AppShell } from './layout/AppShell';
import { screensForRole, toUiRole } from '../lib/auth/roleMap';
import { useAuth } from '../lib/auth';
import { LandingPage } from './screens/LandingPage';
import { LoginPage } from './screens/auth/LoginPage';
import { RegisterStudentPage } from './screens/auth/RegisterStudentPage';
import { RegisterCompanyPage } from './screens/auth/RegisterCompanyPage';
import { VerifyOtpPage } from './screens/auth/VerifyOtpPage';
import { AdminLoginPage } from './screens/auth/AdminLoginPage';
import { StudentProfilePage } from './screens/StudentProfilePage';
import { CompanyProfilePage } from './screens/CompanyProfilePage';
import { ResumeAnalyzerPage } from './screens/ResumeAnalyzerPage';
import { DiscoverPage } from './screens/DiscoverPage';
import { JobPostPage } from './screens/JobPostPage';
import { CompanyJobsPage } from './screens/CompanyJobsPage';
import { SavedJobsPage } from './screens/SavedJobsPage';
import { JobDetailPage } from './screens/JobDetailPage';
import { CompanyPublicPage } from './screens/CompanyPublicPage';
import {
  AdminAnalytics,
  AdminOverview,
  ApplicantKanban,
  ChatPage,
  CompanyApproval,
  CompanyDashboard,
  DiscoverStudents,
  MatchesPage,
  NotificationsPage,
  SettingsPage,
  StudentDashboard,
  UserManagement,
} from './prototypeScreens';
import type { ScreenId } from './prototypeNav';

function RoleGate({ screen, children }: { screen: ScreenId; children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!screensForRole(toUiRole(user.role)).has(screen)) {
    return <Navigate to="/app/dashboard" replace />;
  }
  return <>{children}</>;
}

function DashboardRoute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const go = (s: string) => navigate(`/app/${s}`);
  if (!user) return null;
  if (user.role === 'STUDENT') return <StudentDashboard onNavigate={go} />;
  if (user.role === 'COMPANY') return <CompanyDashboard onNavigate={go} />;
  return <AdminOverview onNavigate={go} />;
}

function MatchesRoute() {
  const navigate = useNavigate();
  return <MatchesPage onNavigate={(s) => navigate(`/app/${s}`)} />;
}

function SettingsRoute() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  return (
    <SettingsPage
      onLogout={() => {
        void logout().then(() => navigate('/', { replace: true }));
      }}
    />
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <RequireGuest>
            <LandingPage />
          </RequireGuest>
        }
      />
      <Route
        path="/login"
        element={
          <RequireGuest>
            <LoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/login/admin"
        element={
          <RequireGuest>
            <AdminLoginPage />
          </RequireGuest>
        }
      />
      <Route
        path="/register/student"
        element={
          <RequireGuest>
            <RegisterStudentPage />
          </RequireGuest>
        }
      />
      <Route
        path="/register/company"
        element={
          <RequireGuest>
            <RegisterCompanyPage />
          </RequireGuest>
        }
      />
      <Route
        path="/verify-otp"
        element={
          <RequireGuest>
            <VerifyOtpPage />
          </RequireGuest>
        }
      />

      <Route element={<RequireAuth />}>
        <Route path="/app" element={<AppShell />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardRoute />} />
          <Route
            path="discover"
            element={
              <RoleGate screen="discover">
                <DiscoverPage />
              </RoleGate>
            }
          />
          <Route
            path="matches"
            element={
              <RoleGate screen="matches">
                <MatchesRoute />
              </RoleGate>
            }
          />
          <Route
            path="chat"
            element={
              <RoleGate screen="chat">
                <ChatPage />
              </RoleGate>
            }
          />
          <Route
            path="resume"
            element={
              <RoleGate screen="resume">
                <ResumeAnalyzerPage />
              </RoleGate>
            }
          />
          <Route
            path="saved"
            element={
              <RoleGate screen="saved">
                <SavedJobsPage />
              </RoleGate>
            }
          />
          <Route
            path="jobs/:jobId"
            element={
              <RoleGate screen="discover">
                <JobDetailPage />
              </RoleGate>
            }
          />
          <Route
            path="companies/:companyId"
            element={
              <RoleGate screen="discover">
                <CompanyPublicPage />
              </RoleGate>
            }
          />
          <Route
            path="profile"
            element={
              <RoleGate screen="profile">
                <StudentProfilePage />
              </RoleGate>
            }
          />
          <Route
            path="company-profile"
            element={
              <RoleGate screen="company-profile">
                <CompanyProfilePage />
              </RoleGate>
            }
          />
          <Route
            path="discover-students"
            element={
              <RoleGate screen="discover-students">
                <DiscoverStudents />
              </RoleGate>
            }
          />
          <Route
            path="job-post"
            element={
              <RoleGate screen="job-post">
                <CompanyJobsPage />
              </RoleGate>
            }
          />
          <Route
            path="job-post/new"
            element={
              <RoleGate screen="job-post">
                <JobPostPage />
              </RoleGate>
            }
          />
          <Route
            path="job-post/:jobId"
            element={
              <RoleGate screen="job-post">
                <JobPostPage />
              </RoleGate>
            }
          />
          <Route
            path="applicants"
            element={
              <RoleGate screen="applicants">
                <ApplicantKanban />
              </RoleGate>
            }
          />
          <Route
            path="analytics"
            element={
              <RoleGate screen="analytics">
                <AdminAnalytics />
              </RoleGate>
            }
          />
          <Route
            path="company-approval"
            element={
              <RoleGate screen="company-approval">
                <CompanyApproval />
              </RoleGate>
            }
          />
          <Route
            path="users"
            element={
              <RoleGate screen="users">
                <UserManagement />
              </RoleGate>
            }
          />
          <Route path="settings" element={<SettingsRoute />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
