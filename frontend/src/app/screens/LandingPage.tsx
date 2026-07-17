import { Link } from 'react-router';
import {
  ArrowRight,
  CheckCircle,
  FileText,
  MessageSquare,
  Shield,
  Star,
  Zap,
} from 'lucide-react';

// MOCK: Phase 6+ — landing hero cards only
const HERO_COMPANIES = [
  {
    id: 1,
    name: 'Leapfrog Technology',
    industry: 'Software',
    logo: 'LF',
    color: '#2563EB',
    cover: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=200&fit=crop',
    skills: ['React', 'Node.js', 'AWS'],
  },
  {
    id: 2,
    name: 'F1Soft International',
    industry: 'FinTech',
    logo: 'F1',
    color: '#059669',
    cover: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&h=200&fit=crop',
    skills: ['Java', 'Spring', 'SQL'],
  },
  {
    id: 3,
    name: 'CloudFactory',
    industry: 'AI / Data',
    logo: 'CF',
    color: '#7C3AED',
    cover: 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&h=200&fit=crop',
    skills: ['Python', 'ML', 'ETL'],
  },
];

function SkillTag({ label }: { label: string }) {
  return (
    <span className="inline-flex rounded-lg border border-blue-100 bg-[#EFF6FF] px-2.5 py-1 text-xs font-medium text-[#2563EB]">
      {label}
    </span>
  );
}

export function LandingPage() {
  const features = [
    {
      icon: Zap,
      title: 'Swipe Matching',
      desc: 'Browse companies like never before. Swipe right on roles that excite you.',
      color: '#2563EB',
    },
    {
      icon: FileText,
      title: 'Resume Analyzer',
      desc: 'AI-powered resume scoring with ATS tips — wired to the real backend.',
      color: '#7C3AED',
    },
    {
      icon: Shield,
      title: 'Verified Companies',
      desc: 'Every company is vetted by admins before contacting students.',
      color: '#059669',
    },
    {
      icon: MessageSquare,
      title: 'Instant Chat',
      desc: 'Once matched, talk directly with recruiters in-app.',
      color: '#F59E0B',
    },
    {
      icon: Star,
      title: 'AI Recommendations',
      desc: 'Surfaces the most relevant companies for your profile.',
      color: '#DC2626',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-['Inter']">
      <nav className="sticky top-0 z-50 border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB]">
              <Zap size={16} className="text-white" />
            </div>
            <span className="text-lg font-bold text-[#111827]">KUPC</span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-medium text-[#6B7280] transition-colors hover:text-[#111827]"
            >
              Sign In
            </Link>
            <Link
              to="/register/student"
              className="rounded-lg bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#1D4ED8]"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">
              <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
              Exclusively for Kathmandu University
            </div>
            <h1 className="mb-4 text-5xl font-extrabold leading-tight text-[#111827]">
              Swipe Your Way to
              <br />
              <span className="text-[#2563EB]">Your Dream Career</span>
            </h1>
            <p className="mb-8 max-w-lg text-lg leading-relaxed text-[#6B7280]">
              Register with your KU email, verify OTP, and connect with verified employers — profiles and resume AI are live.
            </p>
            <div className="mb-10 flex flex-wrap items-center gap-4">
              <Link
                to="/register/student"
                className="flex items-center gap-2 rounded-xl bg-[#2563EB] px-6 py-3 font-semibold text-white transition-all hover:bg-[#1D4ED8] hover:shadow-lg hover:shadow-blue-200"
              >
                Student sign up <ArrowRight size={16} />
              </Link>
              <Link
                to="/register/company"
                className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-6 py-3 font-semibold text-[#111827] transition-all hover:border-[#2563EB] hover:text-[#2563EB]"
              >
                Register Company
              </Link>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-sm text-[#6B7280]">
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" /> Real auth + OTP
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" /> Live profiles
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle size={15} className="text-green-500" /> Resume AI pipeline
              </div>
            </div>
          </div>

          <div className="relative flex h-96 items-center justify-center">
            {[2, 1, 0].map((i) => {
              const c = HERO_COMPANIES[i];
              return (
                <div
                  key={c.id}
                  className="absolute overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-xl"
                  style={{
                    width: 300,
                    transform: `rotate(${(i - 1) * 5}deg) translateY(${(i - 1) * 8}px)`,
                    zIndex: 3 - i,
                  }}
                >
                  <div className="h-24 bg-cover bg-center" style={{ backgroundImage: `url(${c.cover})` }} />
                  <div className="p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white"
                        style={{ background: c.color }}
                      >
                        {c.logo}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{c.name}</p>
                        <p className="text-xs text-[#6B7280]">{c.industry}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {c.skills.map((s) => (
                        <SkillTag key={s} label={s} />
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-[#E5E7EB] bg-white py-16">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-3 text-3xl font-bold text-[#111827]">Everything you need to land your first role</h2>
            <p className="text-[#6B7280]">Built for KU students and verified employers.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[#E5E7EB] p-5 transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${f.color}15` }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <h3 className="mb-1.5 text-sm font-semibold text-[#111827]">{f.title}</h3>
                <p className="text-xs leading-relaxed text-[#6B7280]">{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link to="/login/admin" className="text-sm font-medium text-[#6B7280] hover:text-[#2563EB]">
              Admin sign in →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
