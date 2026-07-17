import { Navigate, Route, Routes, useNavigate } from 'react-router';
import { Bookmark, MapPin, DollarSign } from 'lucide-react';
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
import {
  AdminAnalytics,
  AdminOverview,
  ApplicantKanban,
  ChatPage,
  CompanyApproval,
  CompanyDashboard,
  DiscoverPage,
  DiscoverStudents,
  JobPosting,
  MatchesPage,
  NotificationsPage,
  SettingsPage,
  SkillTag,
  StudentDashboard,
  UserManagement,
} from './prototypeScreens';
import type { ScreenId } from './prototypeNav';

// MOCK: Phase 6+ — saved jobs still uses prototype company cards
import { MOCK_COMPANIES_FOR_SAVED } from './mockSavedJobs';

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

function SavedJobsPage() {
  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-[#111827]">Saved Jobs</h1>
      <p className="mb-4 text-xs text-[#9CA3AF]">MOCK: Phase 6+ — not wired to backend yet.</p>
      <div className="grid gap-4 md:grid-cols-2">
        {MOCK_COMPANIES_FOR_SAVED.map((c) => (
          <div
            key={c.id}
            className="rounded-2xl border border-[#E5E7EB] bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-3">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                style={{ background: c.color }}
              >
                {c.logo}
              </div>
              <div>
                <p className="font-semibold text-[#111827]">{c.name}</p>
                <p className="text-xs text-[#6B7280]">{c.industry}</p>
              </div>
              <Bookmark size={15} className="ml-auto fill-[#F59E0B] text-[#F59E0B]" />
            </div>
            <div className="mb-3 flex flex-wrap gap-1.5">
              {c.skills.slice(0, 3).map((s) => (
                <SkillTag key={s} label={s} />
              ))}
            </div>
            <div className="flex items-center gap-3 text-xs text-[#9CA3AF]">
              <span>
                <MapPin size={10} className="mr-1 inline" />
                {c.location}
              </span>
              <span>
                <DollarSign size={10} className="mr-1 inline" />
                {c.salary}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
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
                <JobPosting />
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
