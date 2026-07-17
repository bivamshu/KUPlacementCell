import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Bell, LogOut, Menu, Zap } from 'lucide-react';
import { useAuth } from '../../lib/auth';
import { toUiRole, type UiRole } from '../../lib/auth/roleMap';
import { ADMIN_NAV, COMPANY_NAV, STUDENT_NAV } from '../prototypeNav';

export function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const role: UiRole = user ? toUiRole(user.role) : 'student';
  const nav = role === 'student' ? STUDENT_NAV : role === 'company' ? COMPANY_NAV : ADMIN_NAV;

  const initials = user?.email?.slice(0, 2).toUpperCase() ?? role.slice(0, 2).toUpperCase();

  async function onLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#F8FAFC] font-['Inter']">
      <aside
        className={`${sidebarOpen ? 'w-56' : 'w-14'} z-20 flex shrink-0 flex-col border-r border-[#E5E7EB] bg-white transition-all duration-200`}
      >
        <div className="flex h-14 items-center gap-2.5 border-b border-[#E5E7EB] px-4">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#2563EB]">
            <Zap size={13} className="text-white" />
          </div>
          {sidebarOpen && <span className="font-bold text-[#111827]">KUPC</span>}
        </div>

        {sidebarOpen && (
          <div className="px-3 pb-1 pt-3">
            <div className="flex items-center gap-1.5 rounded-lg border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B7280]">
                {role} portal
              </span>
            </div>
          </div>
        )}

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {nav.map((item) => (
            <NavLink
              key={item.id}
              to={`/app/${item.id}`}
              title={item.label}
              className={({ isActive }) =>
                `flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[#EFF6FF] text-[#2563EB]'
                    : 'text-[#6B7280] hover:bg-[#F8FAFC] hover:text-[#374151]'
                }`
              }
            >
              <item.icon size={16} className="shrink-0" />
              {sidebarOpen && <span>{item.label}</span>}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-1 border-t border-[#E5E7EB] p-2">
          <button
            type="button"
            onClick={() => void onLogout()}
            className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-[#6B7280] hover:bg-red-50 hover:text-red-600"
          >
            <LogOut size={16} />
            {sidebarOpen && <span>Sign out</span>}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#E5E7EB] bg-white px-4">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
            aria-label="Toggle sidebar"
          >
            <Menu size={18} />
          </button>
          <div className="flex items-center gap-3">
            <Link
              to="/app/notifications"
              className="rounded-lg p-2 text-[#6B7280] hover:bg-[#F3F4F6]"
              aria-label="Notifications"
            >
              <Bell size={18} />
            </Link>
            <Link
              to={
                role === 'company'
                  ? '/app/company-profile'
                  : role === 'student'
                    ? '/app/profile'
                    : '/app/settings'
              }
              className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-[#F8FAFC]"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2563EB] text-xs font-bold text-white">
                {initials}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-xs font-semibold text-[#111827]">{user?.email}</p>
                <p className="text-[10px] text-[#9CA3AF]">{user?.role}</p>
              </div>
            </Link>
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
