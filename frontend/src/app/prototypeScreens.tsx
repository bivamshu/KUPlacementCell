import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass, Heart, MessageSquare, FileText, Bookmark,
  User, Settings, Briefcase, Users, Bell, Search, X, Check,
  Star, ChevronRight, Send, Paperclip, Phone, Video,
  Building2, MapPin, DollarSign, Clock, TrendingUp,
  ArrowRight, Filter, MoreHorizontal,
  AlertCircle, CheckCircle, XCircle, Eye, Trash2, RotateCcw,
  Calendar, ExternalLink, PlusCircle, SlidersHorizontal
} from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
export type Role = "student" | "company" | "admin";
export type Screen =
  | "landing" | "dashboard" | "discover" | "matches" | "chat"
  | "resume" | "saved" | "profile" | "settings" | "notifications"
  | "discover-students" | "job-post" | "applicants" | "analytics"
  | "company-approval" | "users" | "company-profile";

// ─── Mock Data ─────────────────────────────────────────────────────────────────
// MOCK: Phase 6+ — discover / saved / landing demos only
const COMPANIES = [
  {
    id: 1, name: "Leapfrog Technology", industry: "Software & IT", location: "Lalitpur, Nepal",
    logo: "LT", color: "#2563EB", cover: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=300&fit=crop&auto=format",
    roles: ["Full Stack Engineer", "React Developer"], salary: "NPR 80K–150K/mo",
    skills: ["React", "Node.js", "AWS", "TypeScript"], about: "Nepal's leading tech company building world-class software products for global clients. 500+ engineers, 15+ years of excellence.",
    size: "500+", remote: true, type: "Full-time", score: 95
  },
  {
    id: 2, name: "Fusemachines", industry: "AI & Machine Learning", location: "Kathmandu, Nepal",
    logo: "FM", color: "#7C3AED", cover: "https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=300&fit=crop&auto=format",
    roles: ["ML Engineer", "Data Scientist"], salary: "NPR 100K–200K/mo",
    skills: ["Python", "TensorFlow", "PyTorch", "SQL"], about: "Democratizing AI education and building cutting-edge ML solutions across industries.",
    size: "200+", remote: false, type: "Full-time", score: 91
  },
  {
    id: 3, name: "CloudFactory", industry: "Data & AI Services", location: "Kathmandu, Nepal",
    logo: "CF", color: "#059669", cover: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&h=300&fit=crop&auto=format",
    roles: ["Data Analyst", "QA Engineer"], salary: "NPR 60K–120K/mo",
    skills: ["Python", "Data Labeling", "QA Tools", "Excel"], about: "Global technology company with deep expertise in data work, connecting a skilled global workforce.",
    size: "1000+", remote: true, type: "Contract", score: 87
  },
  {
    id: 4, name: "Docsumo", industry: "FinTech / AI", location: "Remote (Nepal-friendly)",
    logo: "DS", color: "#DC2626", cover: "https://images.unsplash.com/photo-1563986768609-322da13575f3?w=800&h=300&fit=crop&auto=format",
    roles: ["Frontend Developer", "Product Designer"], salary: "NPR 90K–180K/mo",
    skills: ["React", "Figma", "CSS", "APIs"], about: "Intelligent document processing startup backed by YC. Building the future of automated data extraction.",
    size: "50–200", remote: true, type: "Full-time", score: 89
  },
];

// MOCK: Phase 6+ — discover-students / kanban demos only
const STUDENTS = [
  {
    id: 1, name: "Priya Sharma", degree: "B.E. Computer Engineering", year: "Final Year",
    photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&auto=format",
    skills: ["React", "Node.js", "Python", "AWS"], resumeScore: 87, availability: "June 2025",
    gpa: "3.8/4.0", experience: "2 internships", projects: ["E-commerce Platform", "AI Chatbot"],
    about: "Full-stack dev passionate about building scalable web applications. Open source contributor."
  },
  {
    id: 2, name: "Anil Thapa", degree: "B.E. Electronics Engineering", year: "Final Year",
    photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&auto=format",
    skills: ["Embedded C", "FPGA", "IoT", "PCB Design"], resumeScore: 82, availability: "August 2025",
    gpa: "3.6/4.0", experience: "1 internship", projects: ["Smart Home System", "Weather Station"],
    about: "Hardware enthusiast with a passion for IoT and embedded systems innovation."
  },
  {
    id: 3, name: "Samiksha Rai", degree: "B.E. Computer Engineering", year: "Final Year",
    photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&auto=format",
    skills: ["ML", "Python", "Data Analysis", "TensorFlow"], resumeScore: 91, availability: "May 2025",
    gpa: "3.9/4.0", experience: "3 internships", projects: ["NLP Sentiment Analyzer", "Image Classifier"],
    about: "ML researcher with publications. Top of class. Looking for impactful AI roles."
  },
];

const MATCHES = [
  { id: 1, name: "Leapfrog Technology", role: "React Developer", matchDate: "2 days ago", lastMsg: "We reviewed your profile and would love to schedule...", unread: 2, logo: "LT", color: "#2563EB" },
  { id: 2, name: "Fusemachines", role: "ML Engineer", matchDate: "5 days ago", lastMsg: "Hi! Thanks for matching with us. Your resume score...", unread: 0, logo: "FM", color: "#7C3AED" },
  { id: 3, name: "Docsumo", role: "Frontend Developer", matchDate: "1 week ago", lastMsg: "Would you be available for a quick call this Friday?", unread: 1, logo: "DS", color: "#DC2626" },
];

// MOCK: Phase 6+ — chat demo only
const MESSAGES = [
  { id: 1, from: "them", text: "Hi Priya! We reviewed your profile and we're really impressed with your React experience.", time: "10:32 AM" },
  { id: 2, from: "them", text: "Would you be open to a quick 30-minute screening call this week?", time: "10:33 AM" },
  { id: 3, from: "me", text: "Hi! Thank you so much — I'd love that! I'm available Thursday or Friday afternoon.", time: "10:45 AM" },
  { id: 4, from: "them", text: "Perfect. Let's do Friday at 3 PM. I'll send a Google Meet link shortly.", time: "10:47 AM" },
  { id: 5, from: "me", text: "Sounds great, looking forward to it! 🙌", time: "10:48 AM" },
];

// MOCK: Phase 6+ — notifications demo only
const NOTIFICATIONS = [
  { id: 1, icon: "match", text: "Leapfrog Technology liked your profile!", sub: "You have a new match", time: "2 min ago", unread: true },
  { id: 2, icon: "msg", text: "New message from Fusemachines", sub: "Would you be available for a call?", time: "1 hr ago", unread: true },
  { id: 3, icon: "resume", text: "Your resume score improved to 87", sub: "AI detected improvements in formatting", time: "3 hrs ago", unread: true },
  { id: 4, icon: "alert", text: "Interview reminder: Docsumo — Tomorrow 3 PM", sub: "Google Meet link sent to your email", time: "5 hrs ago", unread: false },
  { id: 5, icon: "match", text: "CloudFactory liked your profile!", sub: "You have a new match", time: "Yesterday", unread: false },
  { id: 6, icon: "msg", text: "Leapfrog sent you a message", sub: "We'd love to schedule a technical interview...", time: "Yesterday", unread: false },
];

const KANBAN_COLS = [
  { id: "applied", label: "Applied", color: "#6B7280", count: 8 },
  { id: "matched", label: "Matched", color: "#2563EB", count: 5 },
  { id: "interview", label: "Interview", color: "#F59E0B", count: 3 },
  { id: "offer", label: "Offer", color: "#22C55E", count: 1 },
  { id: "rejected", label: "Rejected", color: "#EF4444", count: 2 },
];

const KANBAN_CARDS: Record<string, typeof STUDENTS> = {
  applied: [STUDENTS[0], STUDENTS[1]],
  matched: [STUDENTS[2], STUDENTS[0]],
  interview: [STUDENTS[1]],
  offer: [STUDENTS[2]],
  rejected: [STUDENTS[0]],
};

const DAILY_USERS = [
  { day: "Mon", students: 420, companies: 38 },
  { day: "Tue", students: 510, companies: 42 },
  { day: "Wed", students: 488, companies: 45 },
  { day: "Thu", students: 632, companies: 51 },
  { day: "Fri", students: 701, companies: 60 },
  { day: "Sat", students: 380, companies: 29 },
  { day: "Sun", students: 290, companies: 21 },
];

const GROWTH = [
  { month: "Jan", matches: 120, jobs: 45 },
  { month: "Feb", matches: 180, jobs: 62 },
  { month: "Mar", matches: 240, jobs: 80 },
  { month: "Apr", matches: 310, jobs: 95 },
  { month: "May", matches: 450, jobs: 128 },
  { month: "Jun", matches: 620, jobs: 160 },
];

const TOP_SKILLS = [
  { skill: "React", count: 312 },
  { skill: "Python", count: 289 },
  { skill: "Node.js", count: 201 },
  { skill: "ML/AI", count: 178 },
  { skill: "AWS", count: 145 },
  { skill: "Figma", count: 122 },
];

const PIE_DATA = [
  { name: "Matched", value: 42, color: "#2563EB" },
  { name: "Applied", value: 31, color: "#F59E0B" },
  { name: "Hired", value: 15, color: "#22C55E" },
  { name: "Rejected", value: 12, color: "#EF4444" },
];

const COMPANY_REQUESTS = [
  { id: 1, name: "TechBridge Nepal", industry: "Software", submitted: "Dec 12, 2024", status: "pending", docs: 3 },
  { id: 2, name: "NepAI Solutions", industry: "AI/ML", submitted: "Dec 10, 2024", status: "pending", docs: 4 },
  { id: 3, name: "PayGo Nepal", industry: "FinTech", submitted: "Dec 8, 2024", status: "more_info", docs: 2 },
  { id: 4, name: "EduTech Hub", industry: "EdTech", submitted: "Dec 5, 2024", status: "approved", docs: 5 },
  { id: 5, name: "CloudNine Labs", industry: "Cloud", submitted: "Dec 3, 2024", status: "rejected", docs: 3 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function Badge({ children, variant = "default" }: { children: React.ReactNode; variant?: "default" | "success" | "warning" | "danger" | "info" | "neutral" }) {
  const v = {
    default: "bg-blue-50 text-blue-700 border border-blue-100",
    success: "bg-green-50 text-green-700 border border-green-100",
    warning: "bg-amber-50 text-amber-700 border border-amber-100",
    danger: "bg-red-50 text-red-700 border border-red-100",
    info: "bg-purple-50 text-purple-700 border border-purple-100",
    neutral: "bg-gray-100 text-gray-600 border border-gray-200",
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${v[variant]}`}>{children}</span>;
}

export function StatCard({ icon: Icon, label, value, change, color = "#2563EB" }: { icon: React.ElementType; label: string; value: string; change?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-[#E5E7EB] hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: color + "15" }}>
          <Icon size={18} style={{ color }} />
        </div>
        {change && <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">↑ {change}</span>}
      </div>
      <p className="text-2xl font-bold text-[#111827]">{value}</p>
      <p className="text-sm text-[#6B7280] mt-0.5">{label}</p>
    </div>
  );
}

export function SkillTag({ label }: { label: string }) {
  return <span className="inline-flex text-xs font-medium px-2.5 py-1 rounded-lg bg-[#EFF6FF] text-[#2563EB] border border-blue-100">{label}</span>;
}

// ─── Screens ──────────────────────────────────────────────────────────────────
export function StudentDashboard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const upcoming = [
    { company: "Leapfrog Technology", role: "Technical Interview", date: "Fri, Dec 20", time: "3:00 PM", color: "#2563EB" },
    { company: "Fusemachines", role: "HR Screening", date: "Mon, Dec 23", time: "11:00 AM", color: "#7C3AED" },
  ];
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Good morning, Priya 👋</h1>
        <p className="text-[#6B7280] mt-0.5">Here's what's happening with your job search today.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Star} label="Resume Score" value="87/100" change="4pts" color="#2563EB" />
        <StatCard icon={Heart} label="Total Matches" value="12" change="3 new" color="#EC4899" />
        <StatCard icon={MessageSquare} label="Unread Messages" value="5" color="#F59E0B" />
        <StatCard icon={Eye} label="Profile Views" value="48" change="12%" color="#059669" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Recommended companies */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-[#111827]">Recommended Companies</h2>
            <button onClick={() => onNavigate("discover")} className="text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1">
              View all <ChevronRight size={12} />
            </button>
          </div>
          <div className="space-y-3">
            {COMPANIES.slice(0, 3).map(c => (
              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors cursor-pointer group">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ background: c.color }}>{c.logo}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-[#111827] truncate">{c.name}</p>
                  <p className="text-xs text-[#6B7280] truncate">{c.roles[0]} · {c.location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{c.score}% match</span>
                  <button onClick={() => onNavigate("discover")} className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight size={14} className="text-[#2563EB]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming interviews */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Upcoming Interviews</h2>
          <div className="space-y-3">
            {upcoming.map((u, i) => (
              <div key={i} className="p-3 rounded-xl border border-[#E5E7EB]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: u.color }} />
                  <p className="text-sm font-medium text-[#111827]">{u.company}</p>
                </div>
                <p className="text-xs text-[#6B7280] mb-2">{u.role}</p>
                <div className="flex items-center gap-3 text-xs text-[#6B7280]">
                  <span className="flex items-center gap-1"><Calendar size={10} />{u.date}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{u.time}</span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 text-xs text-[#2563EB] font-medium text-center hover:underline">View calendar</button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <h2 className="font-semibold text-[#111827] mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Analyze Resume", icon: FileText, screen: "resume" as Screen, color: "#2563EB" },
            { label: "Discover Companies", icon: Compass, screen: "discover" as Screen, color: "#7C3AED" },
            { label: "Edit Profile", icon: User, screen: "profile" as Screen, color: "#059669" },
            { label: "View Matches", icon: Heart, screen: "matches" as Screen, color: "#EC4899" },
          ].map(a => (
            <button key={a.label} onClick={() => onNavigate(a.screen)}
              className="flex items-center gap-3 p-3.5 rounded-xl border border-[#E5E7EB] hover:border-blue-200 hover:bg-[#F8FAFC] transition-all group text-left">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: a.color + "15" }}>
                <a.icon size={16} style={{ color: a.color }} />
              </div>
              <span className="text-sm font-medium text-[#111827]">{a.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Activity */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <h2 className="font-semibold text-[#111827] mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { icon: Heart, text: "Matched with Leapfrog Technology", time: "2h ago", color: "#EC4899" },
            { icon: Eye, text: "Your profile was viewed by 5 companies", time: "4h ago", color: "#2563EB" },
            { icon: FileText, text: "Resume score updated to 87/100", time: "Yesterday", color: "#059669" },
            { icon: MessageSquare, text: "New message from Fusemachines", time: "Yesterday", color: "#F59E0B" },
          ].map((a, i) => (
            <div key={i} className="flex items-center gap-3 py-2 border-b border-[#F3F4F6] last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: a.color + "15" }}>
                <a.icon size={14} style={{ color: a.color }} />
              </div>
              <p className="text-sm text-[#374151] flex-1">{a.text}</p>
              <span className="text-xs text-[#9CA3AF]">{a.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function DiscoverPage() {
  const [cardIndex, setCardIndex] = useState(0);
  const [, setDragging] = useState(false);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const [dragX, setDragX] = useState(0);
  const company = COMPANIES[cardIndex % COMPANIES.length];

  const handleSwipe = (dir: "left" | "right") => {
    setDirection(dir);
    setTimeout(() => {
      setCardIndex(i => i + 1);
      setDirection(null);
      setDragX(0);
    }, 350);
  };

  const rotation = dragX / 20;
  const likeOpacity = Math.max(0, dragX / 80);
  const nopeOpacity = Math.max(0, -dragX / 80);

  return (
    <div className="h-full flex gap-4 p-4 overflow-hidden">
      {/* Left panel */}
      <div className="w-56 shrink-0 space-y-3">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Recent Matches</h3>
          <div className="space-y-2.5">
            {MATCHES.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 cursor-pointer group">
                <div className="w-8 h-8 rounded-lg text-white text-xs font-bold flex items-center justify-center shrink-0" style={{ background: m.color }}>{m.logo}</div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-[#111827] truncate">{m.name}</p>
                  <p className="text-xs text-[#9CA3AF] truncate">{m.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider mb-3">Saved</h3>
          <div className="space-y-2">
            {COMPANIES.slice(0, 2).map(c => (
              <div key={c.id} className="flex items-center gap-2">
                <Bookmark size={12} className="text-[#F59E0B]" />
                <p className="text-xs text-[#374151] truncate">{c.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Center swipe area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-5 relative">
        {/* Card stack */}
        <div className="relative" style={{ width: 360, height: 520 }}>
          {/* Background cards */}
          {[2, 1].map(offset => {
            const c = COMPANIES[(cardIndex + offset) % COMPANIES.length];
            return (
              <div key={offset} className="absolute inset-0 bg-white rounded-2xl border border-[#E5E7EB] shadow-md overflow-hidden"
                style={{ transform: `scale(${1 - offset * 0.04}) translateY(${offset * 14}px)`, zIndex: 3 - offset }}>
                <div className="h-44 bg-cover bg-center" style={{ backgroundImage: `url(${c.cover})` }} />
                <div className="p-5">
                  <p className="font-bold text-[#111827]">{c.name}</p>
                  <p className="text-sm text-[#6B7280]">{c.industry}</p>
                </div>
              </div>
            );
          })}

          {/* Main swipeable card */}
          <AnimatePresence>
            <motion.div
              key={cardIndex}
              className="absolute inset-0 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden cursor-grab active:cursor-grabbing"
              style={{ zIndex: 10 }}
              drag="x"
              dragConstraints={{ left: -200, right: 200 }}
              onDrag={(_, info) => { setDragX(info.offset.x); setDragging(true); }}
              onDragEnd={(_, info) => {
                setDragging(false);
                if (info.offset.x > 80) handleSwipe("right");
                else if (info.offset.x < -80) handleSwipe("left");
                else setDragX(0);
              }}
              animate={direction ? { x: direction === "right" ? 500 : -500, opacity: 0, rotate: direction === "right" ? 20 : -20 } : { x: dragX, rotate: rotation }}
              transition={direction ? { duration: 0.35 } : { type: "spring", stiffness: 400, damping: 40 }}
            >
              {/* Like / Nope overlays */}
              <div className="absolute top-6 left-6 z-20 rotate-[-12deg] border-4 border-green-500 rounded-lg px-3 py-1" style={{ opacity: likeOpacity }}>
                <span className="text-green-500 font-black text-xl tracking-widest">LIKE</span>
              </div>
              <div className="absolute top-6 right-6 z-20 rotate-12 border-4 border-red-500 rounded-lg px-3 py-1" style={{ opacity: nopeOpacity }}>
                <span className="text-red-500 font-black text-xl tracking-widest">NOPE</span>
              </div>

              <div className="h-44 bg-cover bg-center relative" style={{ backgroundImage: `url(${company.cover})` }}>
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                {company.remote && (
                  <div className="absolute top-3 right-3 bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Remote</div>
                )}
              </div>

              <div className="p-5 overflow-y-auto" style={{ maxHeight: 280 }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: company.color }}>{company.logo}</div>
                  <div>
                    <h2 className="font-bold text-[#111827]">{company.name}</h2>
                    <p className="text-sm text-[#6B7280]">{company.industry}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-[#6B7280] mb-3">
                  <span className="flex items-center gap-1"><MapPin size={11} />{company.location}</span>
                  <span className="flex items-center gap-1"><DollarSign size={11} />{company.salary}</span>
                  <span className="flex items-center gap-1"><Users size={11} />{company.size}</span>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <Briefcase size={12} className="text-[#6B7280]" />
                  <p className="text-xs font-medium text-[#374151]">{company.roles.join(", ")}</p>
                </div>

                <div className="flex gap-1.5 flex-wrap mb-3">
                  {company.skills.map(s => <SkillTag key={s} label={s} />)}
                </div>

                <p className="text-xs text-[#6B7280] leading-relaxed">{company.about}</p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-5">
          <button onClick={() => handleSwipe("left")} className="w-14 h-14 rounded-full bg-white border-2 border-[#EF4444] flex items-center justify-center text-[#EF4444] hover:bg-red-50 transition-all hover:scale-105 shadow-md">
            <X size={22} />
          </button>
          <button onClick={() => handleSwipe("right")} className="w-10 h-10 rounded-full bg-white border-2 border-[#F59E0B] flex items-center justify-center text-[#F59E0B] hover:bg-amber-50 transition-all shadow-md">
            <Star size={16} />
          </button>
          <button onClick={() => handleSwipe("right")} className="w-14 h-14 rounded-full bg-white border-2 border-[#22C55E] flex items-center justify-center text-[#22C55E] hover:bg-green-50 transition-all hover:scale-105 shadow-md">
            <Heart size={22} />
          </button>
        </div>

        <p className="text-xs text-[#9CA3AF]">Drag card or use buttons · {COMPANIES.length - (cardIndex % COMPANIES.length)} companies left</p>
      </div>

      {/* Right filters panel */}
      <div className="w-56 shrink-0">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-4">
          <div className="flex items-center gap-2 mb-4">
            <SlidersHorizontal size={14} className="text-[#6B7280]" />
            <h3 className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Filters</h3>
          </div>
          <div className="space-y-4">
            {[
              { label: "Industry", options: ["All", "Software", "AI/ML", "FinTech", "EdTech"] },
              { label: "Job Type", options: ["All", "Full-time", "Internship", "Contract"] },
              { label: "Work Mode", options: ["All", "Remote", "Hybrid", "On-site"] },
            ].map(f => (
              <div key={f.label}>
                <p className="text-xs font-medium text-[#374151] mb-1.5">{f.label}</p>
                <select className="w-full text-xs border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 text-[#374151] bg-white focus:outline-none focus:border-[#2563EB]">
                  {f.options.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}
            <div>
              <p className="text-xs font-medium text-[#374151] mb-1.5">Min Salary</p>
              <input type="range" min="20000" max="200000" defaultValue="60000" className="w-full accent-[#2563EB]" />
              <p className="text-xs text-[#9CA3AF] mt-1">NPR 60,000+</p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#374151] mb-1.5">Company Size</p>
              <div className="flex gap-1 flex-wrap">
                {["All", "1–50", "50–200", "200+"].map(s => (
                  <button key={s} className="text-xs px-2 py-0.5 rounded-full border border-[#E5E7EB] text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors first:bg-blue-50 first:border-blue-200 first:text-blue-700">{s}</button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MatchesPage({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Your Matches</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">12 companies have matched with you</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 text-sm text-[#6B7280] border border-[#E5E7EB] px-3 py-1.5 rounded-lg hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
            <Filter size={14} /> Filter
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...MATCHES, ...MATCHES.slice(0, 2)].map((m, i) => (
          <div key={i} className="bg-white rounded-2xl border border-[#E5E7EB] p-5 hover:shadow-md transition-all group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold" style={{ background: m.color }}>{m.logo}</div>
                <div>
                  <p className="font-semibold text-[#111827]">{m.name}</p>
                  <p className="text-xs text-[#6B7280]">{m.role}</p>
                </div>
              </div>
              {m.unread > 0 && (
                <div className="w-5 h-5 rounded-full bg-[#2563EB] flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">{m.unread}</span>
                </div>
              )}
            </div>
            <p className="text-xs text-[#9CA3AF] truncate mb-4">{m.lastMsg}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#9CA3AF]">Matched {m.matchDate}</span>
              <button onClick={() => onNavigate("chat")} className="flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline">
                Open Chat <MessageSquare size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChatPage() {
  const [active, setActive] = useState(0);
  const [text, setText] = useState("");
  const [messages, setMessages] = useState(MESSAGES);

  const send = () => {
    if (!text.trim()) return;
    setMessages(m => [...m, { id: m.length + 1, from: "me", text, time: "Now" }]);
    setText("");
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-[#E5E7EB] flex flex-col bg-white shrink-0">
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input placeholder="Search conversations..." className="w-full pl-8 pr-3 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {[...MATCHES, ...MATCHES.slice(0, 1)].map((m, i) => (
            <button key={i} onClick={() => setActive(i)}
              className={`w-full p-4 flex items-start gap-3 hover:bg-[#F8FAFC] transition-colors border-b border-[#F3F4F6] text-left ${active === i ? "bg-[#EFF6FF]" : ""}`}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0" style={{ background: m.color }}>{m.logo}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-sm font-semibold text-[#111827] truncate">{m.name}</p>
                  <span className="text-xs text-[#9CA3AF] shrink-0 ml-1">{m.matchDate}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] truncate">{m.lastMsg}</p>
              </div>
              {m.unread > 0 && <div className="w-4 h-4 rounded-full bg-[#2563EB] flex items-center justify-center shrink-0 mt-0.5"><span className="text-[9px] text-white font-bold">{m.unread}</span></div>}
            </button>
          ))}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-16 border-b border-[#E5E7EB] px-5 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ background: MATCHES[active % MATCHES.length].color }}>
              {MATCHES[active % MATCHES.length].logo}
            </div>
            <div>
              <p className="font-semibold text-sm text-[#111827]">{MATCHES[active % MATCHES.length].name}</p>
              <p className="text-xs text-green-500 font-medium">Online</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg hover:bg-[#F8FAFC] flex items-center justify-center text-[#6B7280] transition-colors"><Phone size={14} /></button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F8FAFC] flex items-center justify-center text-[#6B7280] transition-colors"><Video size={14} /></button>
            <button className="w-8 h-8 rounded-lg hover:bg-[#F8FAFC] flex items-center justify-center text-[#6B7280] transition-colors"><MoreHorizontal size={14} /></button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#F8FAFC]">
          {messages.map(msg => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-xs rounded-2xl px-4 py-2.5 ${msg.from === "me" ? "bg-[#2563EB] text-white rounded-br-sm" : "bg-white border border-[#E5E7EB] text-[#111827] rounded-bl-sm"}`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <p className={`text-[10px] mt-1 ${msg.from === "me" ? "text-blue-200" : "text-[#9CA3AF]"}`}>{msg.time}</p>
              </div>
            </motion.div>
          ))}
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
            <div className="flex gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: "0ms" }} /><span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: "150ms" }} /><span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF] animate-bounce" style={{ animationDelay: "300ms" }} /></div>
            Recruiter is typing…
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#E5E7EB] bg-white shrink-0">
          <div className="flex items-center gap-2">
            <button className="w-8 h-8 rounded-lg hover:bg-[#F8FAFC] flex items-center justify-center text-[#9CA3AF] transition-colors shrink-0"><Paperclip size={14} /></button>
            <input value={text} onChange={e => setText(e.target.value)} onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Type a message…" className="flex-1 px-4 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB]" />
            <button onClick={send} className="w-9 h-9 rounded-xl bg-[#2563EB] flex items-center justify-center text-white hover:bg-[#1D4ED8] transition-colors shrink-0">
              <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyDashboard({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Dashboard</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Leapfrog Technology — Recruiter Portal</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Briefcase} label="Open Jobs" value="8" change="2 new" color="#2563EB" />
        <StatCard icon={Users} label="Total Applicants" value="124" change="18%" color="#7C3AED" />
        <StatCard icon={Heart} label="Matches" value="42" change="7 new" color="#EC4899" />
        <StatCard icon={TrendingUp} label="Response Rate" value="73%" change="5%" color="#059669" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Weekly Applicants</h2>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={DAILY_USERS}>
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Area type="monotone" dataKey="students" stroke="#2563EB" strokeWidth={2} fill="url(#grad1)" name="Applicants" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Hiring Funnel</h2>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={2} dataKey="value">
                {PIE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {PIE_DATA.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-xs">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: d.color }} />
                <span className="text-[#6B7280]">{d.name}</span>
                <span className="font-semibold text-[#111827] ml-auto">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent applicants */}
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#111827]">Recent Applicants</h2>
          <button onClick={() => onNavigate("applicants")} className="text-xs text-[#2563EB] font-medium hover:underline flex items-center gap-1">View all <ChevronRight size={12} /></button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6]">
                {["Student", "Degree", "Skills", "Resume Score", "Status", ""].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s, i) => (
                <tr key={i} className="border-b border-[#F9FAFB] hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2.5">
                      <img src={s.photo} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{s.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{s.year}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-[#6B7280]">{s.degree.replace("B.E. ", "")}</td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-1">
                      {s.skills.slice(0, 2).map(sk => <SkillTag key={sk} label={sk} />)}
                    </div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${s.resumeScore}%` }} />
                      </div>
                      <span className="text-xs font-medium text-[#374151]">{s.resumeScore}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4"><Badge variant={i === 2 ? "success" : i === 1 ? "warning" : "default"}>{i === 2 ? "Matched" : i === 1 ? "Interview" : "Applied"}</Badge></td>
                  <td className="py-3">
                    <button className="text-xs text-[#2563EB] font-medium hover:underline">View</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ApplicantKanban() {
  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Applicant Pipeline</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Drag applicants across stages to update their status.</p>
        </div>
        <button className="flex items-center gap-2 bg-[#2563EB] text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-[#1D4ED8] transition-colors">
          <PlusCircle size={14} /> Add Job Post
        </button>
      </div>

      <div className="flex gap-4 flex-1 overflow-x-auto pb-2">
        {KANBAN_COLS.map(col => (
          <div key={col.id} className="shrink-0 w-60 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
              <span className="text-sm font-semibold text-[#374151]">{col.label}</span>
              <span className="ml-auto text-xs font-medium text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded-full">{col.count}</span>
            </div>
            <div className="flex-1 bg-[#F3F4F6] rounded-xl p-2 space-y-2 min-h-[300px]">
              {(KANBAN_CARDS[col.id] || []).map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-3 border border-[#E5E7EB] hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                  <div className="flex items-center gap-2 mb-2">
                    <img src={s.photo} alt={s.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#111827] truncate">{s.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] truncate">{s.degree.replace("B.E. ", "")}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap mb-2">
                    {s.skills.slice(0, 2).map(sk => (
                      <span key={sk} className="text-[10px] px-1.5 py-0.5 bg-[#EFF6FF] text-[#2563EB] rounded-md">{sk}</span>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <div className="h-1 w-12 bg-[#F3F4F6] rounded-full overflow-hidden">
                        <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${s.resumeScore}%` }} />
                      </div>
                      <span className="text-[10px] text-[#9CA3AF]">{s.resumeScore}</span>
                    </div>
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal size={12} className="text-[#9CA3AF]" />
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF] hover:text-[#6B7280] py-2 rounded-lg hover:bg-white transition-colors border-2 border-dashed border-transparent hover:border-[#E5E7EB]">
                <PlusCircle size={12} /> Add card
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminAnalytics() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Platform Analytics</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Real-time data across all users, matches, and jobs.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value="2,418" change="142" color="#2563EB" />
        <StatCard icon={Building2} label="Active Companies" value="183" change="12" color="#7C3AED" />
        <StatCard icon={Heart} label="Total Matches" value="1,240" change="89" color="#EC4899" />
        <StatCard icon={Briefcase} label="Jobs Posted" value="376" change="24" color="#059669" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Daily active users */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Daily Active Users</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={DAILY_USERS} barSize={10} barGap={4}>
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Bar dataKey="students" fill="#2563EB" name="Students" radius={[4, 4, 0, 0]} />
              <Bar dataKey="companies" fill="#F59E0B" name="Companies" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Growth */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Monthly Growth</h2>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={GROWTH}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              <Line type="monotone" dataKey="matches" stroke="#2563EB" strokeWidth={2} dot={false} name="Matches" />
              <Line type="monotone" dataKey="jobs" stroke="#22C55E" strokeWidth={2} dot={false} name="Jobs" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Top skills */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Top Skills in Demand</h2>
          <div className="space-y-3">
            {TOP_SKILLS.map((s, i) => (
              <div key={s.skill}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#9CA3AF] w-4">{i + 1}</span>
                    <span className="font-medium text-[#374151]">{s.skill}</span>
                  </div>
                  <span className="text-xs text-[#9CA3AF]">{s.count} mentions</span>
                </div>
                <div className="h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${(s.count / 320) * 100}%` }} transition={{ duration: 0.7, delay: i * 0.08 }}
                    className="h-full rounded-full bg-[#2563EB]" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pie */}
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5">
          <h2 className="font-semibold text-[#111827] mb-4">Outcome Distribution</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={PIE_DATA} cx="50%" cy="50%" outerRadius={70} paddingAngle={3} dataKey="value">
                  {PIE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3 flex-1">
              {PIE_DATA.map(d => (
                <div key={d.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                    <span className="text-sm text-[#374151]">{d.name}</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827]">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CompanyApproval() {
  const [selected, setSelected] = useState<typeof COMPANY_REQUESTS[0] | null>(null);

  const statusMap: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "neutral" }> = {
    pending: { label: "Pending Review", variant: "warning" },
    more_info: { label: "Info Requested", variant: "info" as any },
    approved: { label: "Approved", variant: "success" },
    rejected: { label: "Rejected", variant: "danger" },
  };

  return (
    <div className="p-6 h-full flex gap-4">
      <div className="flex-1 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#111827]">Company Requests</h1>
            <p className="text-[#6B7280] text-sm mt-0.5">Review and approve company registrations.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
              <input placeholder="Search companies…" className="pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] w-48" />
            </div>
            <button className="flex items-center gap-1.5 text-sm border border-[#E5E7EB] px-3 py-2 rounded-lg text-[#6B7280] hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">
              <Filter size={14} /> Filter
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                {["Company", "Industry", "Submitted", "Docs", "Status", "Actions"].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPANY_REQUESTS.map((c) => {
                const s = statusMap[c.status];
                return (
                  <tr key={c.id} onClick={() => setSelected(c)}
                    className={`border-b border-[#F9FAFB] hover:bg-[#F8FAFC] transition-colors cursor-pointer ${selected?.id === c.id ? "bg-[#EFF6FF]" : ""}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center">
                          <Building2 size={14} className="text-[#6B7280]" />
                        </div>
                        <span className="text-sm font-medium text-[#111827]">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-[#6B7280]">{c.industry}</td>
                    <td className="px-5 py-4 text-sm text-[#6B7280]">{c.submitted}</td>
                    <td className="px-5 py-4 text-sm text-[#6B7280]">{c.docs} files</td>
                    <td className="px-5 py-4"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {c.status === "pending" && (
                          <>
                            <button onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 px-2.5 py-1 rounded-lg border border-green-200 hover:bg-green-50 transition-colors">
                              <Check size={11} /> Approve
                            </button>
                            <button onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-600 px-2.5 py-1 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">
                              <X size={11} /> Reject
                            </button>
                          </>
                        )}
                        <button onClick={e => { e.stopPropagation(); setSelected(c); }} className="text-xs text-[#6B7280] hover:text-[#2563EB] px-2 py-1 rounded-lg border border-[#E5E7EB] hover:border-[#2563EB] transition-colors">
                          <Eye size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail drawer */}
      <AnimatePresence>
        {selected && (
          <motion.div initial={{ x: 340, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 340, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="w-80 shrink-0 bg-white rounded-2xl border border-[#E5E7EB] p-5 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-[#111827]">Company Details</h3>
              <button onClick={() => setSelected(null)} className="w-7 h-7 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center text-[#9CA3AF] transition-colors">
                <X size={14} />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-[#F8FAFC] rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-[#E5E7EB] flex items-center justify-center">
                <Building2 size={20} className="text-[#6B7280]" />
              </div>
              <div>
                <p className="font-semibold text-[#111827]">{selected.name}</p>
                <p className="text-xs text-[#6B7280]">{selected.industry}</p>
              </div>
            </div>
            <div className="space-y-3 mb-5">
              {[
                { label: "Submitted", value: selected.submitted },
                { label: "Documents", value: `${selected.docs} files uploaded` },
                { label: "Status", value: statusMap[selected.status].label },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-[#9CA3AF]">{r.label}</span>
                  <span className="font-medium text-[#374151]">{r.value}</span>
                </div>
              ))}
            </div>
            <div className="mb-5">
              <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-2">Documents</p>
              <div className="space-y-1.5">
                {["Registration Certificate", "Tax Clearance", "Company Profile", "HR Contact"].slice(0, selected.docs).map(d => (
                  <div key={d} className="flex items-center gap-2 text-xs text-[#374151] hover:text-[#2563EB] cursor-pointer">
                    <FileText size={12} className="text-[#9CA3AF]" />
                    {d}
                    <ExternalLink size={10} className="ml-auto text-[#9CA3AF]" />
                  </div>
                ))}
              </div>
            </div>
            {selected.status === "pending" && (
              <div className="space-y-2">
                <button className="w-full flex items-center justify-center gap-2 bg-[#22C55E] text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-green-600 transition-colors">
                  <Check size={14} /> Approve Company
                </button>
                <button className="w-full flex items-center justify-center gap-2 bg-[#F3F4F6] text-[#374151] text-sm font-medium py-2.5 rounded-xl hover:bg-[#E5E7EB] transition-colors">
                  <AlertCircle size={14} /> Request More Info
                </button>
                <button className="w-full flex items-center justify-center gap-2 text-[#EF4444] text-sm font-medium py-2.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
                  <X size={14} /> Reject Application
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function NotificationsPage() {
  const groups = [
    { label: "Today", items: NOTIFICATIONS.slice(0, 3) },
    { label: "Yesterday", items: NOTIFICATIONS.slice(3) },
  ];
  const iconMap: Record<string, React.ReactNode> = {
    match: <Heart size={14} className="text-[#EC4899]" />,
    msg: <MessageSquare size={14} className="text-[#2563EB]" />,
    resume: <FileText size={14} className="text-[#059669]" />,
    alert: <Bell size={14} className="text-[#F59E0B]" />,
  };
  const bgMap: Record<string, string> = { match: "#FCE7F3", msg: "#EFF6FF", resume: "#DCFCE7", alert: "#FEF3C7" };

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Notifications</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">3 unread notifications</p>
        </div>
        <button className="text-xs text-[#2563EB] font-medium hover:underline">Mark all read</button>
      </div>
      <div className="space-y-6">
        {groups.map(g => (
          <div key={g.label}>
            <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-3">{g.label}</p>
            <div className="space-y-1">
              {g.items.map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-4 rounded-xl transition-colors ${n.unread ? "bg-white border border-[#E5E7EB]" : "hover:bg-white"}`}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: bgMap[n.icon] }}>
                    {iconMap[n.icon]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[#111827]">{n.text}</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">{n.sub}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[#9CA3AF]">{n.time}</span>
                    {n.unread && <div className="w-2 h-2 rounded-full bg-[#2563EB]" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SettingsPage({ onLogout }: { onLogout?: () => void } = {}) {
  const tabs = ["Profile", "Password", "Notifications", "Privacy", "Theme", "Connected Accounts"];
  const [tab, setTab] = useState(0);

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#111827]">Settings</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Manage your account preferences.</p>
      </div>

      <div className="flex gap-1 border-b border-[#E5E7EB] mb-6 overflow-x-auto">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === i ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#6B7280] hover:text-[#374151]"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6">
        {tab === 0 && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <img src={STUDENTS[0].photo} alt="" className="w-16 h-16 rounded-full object-cover" />
              <div>
                <button className="text-sm font-medium text-[#2563EB] hover:underline">Change photo</button>
                <p className="text-xs text-[#9CA3AF] mt-0.5">JPG, PNG up to 5MB</p>
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {[["Full Name", "Priya Sharma"], ["Email", "priya@ku.edu.np"], ["Phone", "+977-98XXXXXXXX"], ["Location", "Lalitpur, Nepal"]].map(([l, v]) => (
                <div key={l}>
                  <label className="block text-sm font-medium text-[#374151] mb-1">{l}</label>
                  <input defaultValue={v} className="w-full px-3 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB]" />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-sm font-medium text-[#374151] mb-1">Bio</label>
              <textarea rows={3} defaultValue="Full-stack dev passionate about building scalable web applications." className="w-full px-3 py-2 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] resize-none" />
            </div>
            <button className="bg-[#2563EB] text-white text-sm font-semibold px-6 py-2.5 rounded-lg hover:bg-[#1D4ED8] transition-colors">Save Changes</button>
          </div>
        )}
        {tab === 2 && (
          <div className="space-y-4">
            {[
              { label: "New matches", sub: "When a company likes your profile" },
              { label: "New messages", sub: "When you receive a chat message" },
              { label: "Interview reminders", sub: "24 hours before scheduled interviews" },
              { label: "Profile views", sub: "When companies view your profile" },
              { label: "Resume score updates", sub: "When your AI resume score changes" },
            ].map(n => (
              <div key={n.label} className="flex items-start justify-between py-3 border-b border-[#F3F4F6] last:border-0">
                <div>
                  <p className="text-sm font-medium text-[#111827]">{n.label}</p>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">{n.sub}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4 shrink-0">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-[#E5E7EB] peer-checked:bg-[#2563EB] rounded-full transition-colors after:content-[''] after:absolute after:left-0.5 after:top-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:left-4"></div>
                </label>
              </div>
            ))}
          </div>
        )}
        {(tab !== 0 && tab !== 2) && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Settings size={32} className="text-[#E5E7EB] mb-3" />
            <p className="font-medium text-[#374151]">{tabs[tab]} Settings</p>
            <p className="text-sm text-[#9CA3AF] mt-1">Configuration panel for {tabs[tab].toLowerCase()}.</p>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="mt-4 bg-white rounded-2xl border border-red-100 p-5">
        <h3 className="font-semibold text-red-600 text-sm mb-1">Danger Zone</h3>
        <p className="text-xs text-[#9CA3AF] mb-3">Deleting your account is permanent and cannot be undone.</p>
        <button className="text-xs font-medium text-red-500 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 transition-colors">Delete Account</button>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            className="ml-3 text-xs font-medium text-[#374151] border border-[#E5E7EB] px-4 py-2 rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            Sign out
          </button>
        )}
      </div>
    </div>
  );
}

export function DiscoverStudents() {
  const [idx, setIdx] = useState(0);
  const student = STUDENTS[idx % STUDENTS.length];
  const [dir, setDir] = useState<"left" | "right" | null>(null);

  const swipe = (d: "left" | "right") => {
    setDir(d);
    setTimeout(() => { setIdx(i => i + 1); setDir(null); }, 350);
  };

  return (
    <div className="h-full flex items-center justify-center p-6 gap-8">
      <div className="relative" style={{ width: 360, height: 540 }}>
        {[1, 0].map(offset => {
          const s = STUDENTS[(idx + offset + 1) % STUDENTS.length];
          return (
            <div key={offset} className="absolute inset-0 bg-white rounded-2xl border border-[#E5E7EB] shadow-md overflow-hidden"
              style={{ transform: `scale(${1 - offset * 0.04}) translateY(${offset * 14}px)`, zIndex: 2 - offset }}>
              <img src={s.photo} alt={s.name} className="w-full h-52 object-cover" />
              <div className="p-5"><p className="font-bold text-[#111827]">{s.name}</p></div>
            </div>
          );
        })}
        <AnimatePresence>
          <motion.div key={idx} className="absolute inset-0 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden cursor-grab z-10"
            drag="x" dragConstraints={{ left: -200, right: 200 }}
            animate={dir ? { x: dir === "right" ? 500 : -500, opacity: 0 } : {}}
            transition={dir ? { duration: 0.35 } : { type: "spring", stiffness: 400, damping: 40 }}
            onDragEnd={(_, info) => { if (info.offset.x > 80) swipe("right"); else if (info.offset.x < -80) swipe("left"); }}>
            <img src={student.photo} alt={student.name} className="w-full h-52 object-cover" />
            <div className="p-5 space-y-3">
              <div>
                <h2 className="font-bold text-lg text-[#111827]">{student.name}</h2>
                <p className="text-sm text-[#6B7280]">{student.degree} · {student.year}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-[#6B7280]">
                <span>GPA {student.gpa}</span>
                <span>{student.experience}</span>
                <span className="text-green-600 font-medium">Available {student.availability}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {student.skills.map(s => <SkillTag key={s} label={s} />)}
              </div>
              <div>
                <p className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider mb-1.5">Projects</p>
                <div className="flex flex-wrap gap-1">
                  {student.projects.map(p => (
                    <span key={p} className="text-xs px-2 py-0.5 bg-[#F3F4F6] text-[#374151] rounded-md">{p}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${student.resumeScore}%` }} />
                  </div>
                  <span className="text-xs text-[#6B7280]">Resume {student.resumeScore}/100</span>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button onClick={() => swipe("left")} className="w-14 h-14 rounded-full bg-white border-2 border-[#EF4444] flex items-center justify-center text-[#EF4444] hover:bg-red-50 transition-all hover:scale-105 shadow-md">
          <X size={22} />
        </button>
        <button className="w-10 h-10 rounded-full bg-white border-2 border-[#2563EB] flex items-center justify-center text-[#2563EB] hover:bg-blue-50 transition-all shadow-md">
          <Eye size={16} />
        </button>
        <button onClick={() => swipe("right")} className="w-14 h-14 rounded-full bg-white border-2 border-[#22C55E] flex items-center justify-center text-[#22C55E] hover:bg-green-50 transition-all hover:scale-105 shadow-md">
          <Heart size={22} />
        </button>
      </div>
    </div>
  );
}

export function AdminOverview({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#111827]">Admin Overview</h1>
        <p className="text-[#6B7280] text-sm mt-0.5">Platform health and pending actions.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Students" value="2,418" change="142" color="#2563EB" />
        <StatCard icon={Building2} label="Active Companies" value="183" change="12" color="#7C3AED" />
        <StatCard icon={Heart} label="Total Matches" value="1,240" change="89" color="#EC4899" />
        <StatCard icon={AlertCircle} label="Pending Approvals" value="5" color="#F59E0B" />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("company-approval")}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-[#111827]">Pending Company Approvals</h3>
            <Badge variant="warning">5 pending</Badge>
          </div>
          <div className="space-y-2">
            {COMPANY_REQUESTS.filter(c => c.status === "pending").map(c => (
              <div key={c.id} className="flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-[#F8FAFC]">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                  <Building2 size={13} className="text-[#6B7280]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111827] truncate">{c.name}</p>
                  <p className="text-xs text-[#9CA3AF]">{c.industry} · {c.submitted}</p>
                </div>
                <ChevronRight size={14} className="text-[#9CA3AF]" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-[#E5E7EB] p-5 cursor-pointer hover:shadow-md transition-shadow" onClick={() => onNavigate("analytics")}>
          <h3 className="font-semibold text-[#111827] mb-3">Platform Growth</h3>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={GROWTH}>
              <defs>
                <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.12} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 11 }} />
              <Area type="monotone" dataKey="matches" stroke="#2563EB" strokeWidth={2} fill="url(#g2)" name="Matches" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export function UserManagement() {
  const allUsers = [
    ...STUDENTS.map(s => ({ ...s, type: "student", status: "active", verified: true })),
    ...STUDENTS.map(s => ({ ...s, name: s.name + " (C)", type: "company", status: "active", verified: false })),
  ];
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">User Management</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Manage all platform users.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input placeholder="Search users…" className="pl-8 pr-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:border-[#2563EB] w-48" />
          </div>
          <select className="text-sm border border-[#E5E7EB] px-3 py-2 rounded-lg focus:outline-none text-[#374151]">
            <option>All Types</option>
            <option>Student</option>
            <option>Company</option>
          </select>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
              {["User", "Type", "Status", "Verified", "Actions"].map(h => (
                <th key={h} className="text-left text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider px-5 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allUsers.map((u, i) => (
              <tr key={i} className="border-b border-[#F9FAFB] hover:bg-[#F8FAFC] transition-colors">
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <img src={u.photo} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{u.name}</p>
                      <p className="text-xs text-[#9CA3AF]">{u.degree.replace("B.E. ", "")}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3"><Badge variant={u.type === "student" ? "default" : "info"}>{u.type}</Badge></td>
                <td className="px-5 py-3"><Badge variant="success">Active</Badge></td>
                <td className="px-5 py-3">{u.verified ? <CheckCircle size={15} className="text-green-500" /> : <XCircle size={15} className="text-[#D1D5DB]" />}</td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <button className="w-7 h-7 rounded-lg hover:bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] transition-colors"><Eye size={13} /></button>
                    <button className="w-7 h-7 rounded-lg hover:bg-amber-50 flex items-center justify-center text-[#F59E0B] transition-colors"><RotateCcw size={13} /></button>
                    <button className="w-7 h-7 rounded-lg hover:bg-red-50 flex items-center justify-center text-[#EF4444] transition-colors"><Trash2 size={13} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function JobPosting() {
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#111827]">Post a New Job</h1>
          <p className="text-[#6B7280] text-sm mt-0.5">Fill in the details to publish a new opening.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-sm font-medium text-[#6B7280] border border-[#E5E7EB] px-4 py-2 rounded-lg hover:border-[#2563EB] hover:text-[#2563EB] transition-colors">Preview</button>
          <button className="text-sm font-semibold bg-[#2563EB] text-white px-4 py-2 rounded-lg hover:bg-[#1D4ED8] transition-colors">Publish</button>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-[#E5E7EB] p-6 space-y-5">
        {[["Job Title", "e.g. Senior React Developer"], ["Location", "e.g. Lalitpur, Nepal"]].map(([l, p]) => (
          <div key={l}>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">{l}</label>
            <input placeholder={p} className="w-full px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB]" />
          </div>
        ))}
        <div className="grid md:grid-cols-3 gap-4">
          {[["Employment Type", ["Full-time", "Part-time", "Internship", "Contract"]], ["Work Mode", ["On-site", "Hybrid", "Remote"]], ["Experience Level", ["Entry", "Mid", "Senior"]]].map(([l, opts]) => (
            <div key={l as string}>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">{l}</label>
              <select className="w-full px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB] text-[#374151]">
                {(opts as string[]).map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {[["Min Salary (NPR)", "e.g. 80000"], ["Max Salary (NPR)", "e.g. 150000"]].map(([l, p]) => (
            <div key={l}>
              <label className="block text-sm font-medium text-[#374151] mb-1.5">{l}</label>
              <input placeholder={p} className="w-full px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB]" />
            </div>
          ))}
        </div>
        {[["Job Description", "Describe the role, day-to-day responsibilities, and team culture..."], ["Requirements", "List required qualifications and experience..."], ["Responsibilities", "Outline key duties and deliverables..."]].map(([l, p]) => (
          <div key={l}>
            <label className="block text-sm font-medium text-[#374151] mb-1.5">{l}</label>
            <textarea rows={4} placeholder={p} className="w-full px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB] resize-none" />
          </div>
        ))}
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Required Skills</label>
          <div className="flex flex-wrap gap-2 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl">
            {["React", "TypeScript", "Node.js"].map(s => (
              <div key={s} className="flex items-center gap-1.5 bg-[#EFF6FF] text-[#2563EB] text-xs font-medium px-2.5 py-1 rounded-lg border border-blue-100">
                {s} <X size={10} className="cursor-pointer" />
              </div>
            ))}
            <input placeholder="Add skill…" className="text-xs bg-transparent focus:outline-none text-[#374151] min-w-20" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-[#374151] mb-1.5">Application Deadline</label>
          <input type="date" className="px-3 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#2563EB] text-[#374151]" />
        </div>
      </div>
    </div>
  );
}
