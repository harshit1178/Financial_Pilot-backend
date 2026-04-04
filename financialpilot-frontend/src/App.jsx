import { useState, useEffect, useCallback } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import axios from 'axios'
import { Wallet, LayoutDashboard, Target, TrendingUp } from 'lucide-react'
import { StreakCounter, EditableSalary } from './SharedUI'

const DASHBOARD_URL = 'http://127.0.0.1:8000/api/dashboard/'

const NAV_ITEMS = [
  { to: '/',      label: 'Dashboard',    Icon: LayoutDashboard, end: true },
  { to: '/goals', label: 'Goals',        Icon: Target,          end: false },
  { to: '/grow',  label: 'Grow Savings', Icon: TrendingUp,      end: false },
]

export default function App() {
  const [salary, setSalary]   = useState(0)
  const [streak, setStreak]   = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const location = useLocation()

  // Lightweight shared fetch: only salary + streak for the sidebar
  const refreshSharedData = useCallback(() => {
    axios.get(DASHBOARD_URL)
      .then(res => {
        setSalary(res.data.total_salary   ?? 0)
        setStreak(res.data.current_streak ?? 0)
      })
      .catch(() => {})
  }, [])

  // Called when salary is saved — refreshes sidebar AND signals child pages
  const onSalaryUpdate = useCallback(() => {
    refreshSharedData()
    setRefreshKey(k => k + 1)   // Dashboard/Goals can react via useOutletContext
  }, [refreshSharedData])

  useEffect(() => { refreshSharedData() }, [refreshSharedData])

  return (
    <div className="h-full flex overflow-hidden bg-[#07071C] text-white relative">

      {/* ── Ambient radial background ───────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,40,240,0.28) 0%, transparent 70%)',
        }}
      />
      <div className="absolute top-[-5%] right-[15%] w-[500px] h-[500px] bg-violet-700/10 rounded-full blur-[130px] pointer-events-none -z-10" />
      <div className="absolute bottom-[-10%] left-[10%] w-[450px] h-[450px] bg-teal-700/10 rounded-full blur-[120px] pointer-events-none -z-10" />

      {/* ── Fixed Sidebar ────────────────────────────────────────────────── */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col relative z-20">
        {/* Glass card wrapping the entire sidebar */}
        <div className="mx-3 my-3 flex-1 flex flex-col rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden">

          {/* Logo */}
          <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(16,185,129,0.45)] border border-emerald-300/30">
                <Wallet size={18} strokeWidth={1.5} className="text-slate-950" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-none tracking-tight">FinancialPilot</p>
                <p className="text-[10px] text-slate-500 mt-0.5 tracking-widest uppercase">Sandbox</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 pt-4 pb-2 space-y-1">
            {NAV_ITEMS.map(({ to, label, Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `relative flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 ${
                    isActive
                      ? 'bg-white/[0.09] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      size={16}
                      strokeWidth={1.5}
                      className={`shrink-0 transition-colors ${isActive ? 'text-emerald-400' : ''}`}
                    />
                    <span className="flex-1">{label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="nav-dot"
                        className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Bottom section: Streak + Salary edit */}
          <div className="px-5 pb-5 pt-4 border-t border-white/[0.06] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest">
                Streak
              </span>
              <StreakCounter streak={streak} />
            </div>
            <div>
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest block mb-1.5">
                Live Salary
              </span>
              <EditableSalary salary={salary} onUpdateSuccess={onSalaryUpdate} />
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main content column ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile header (hidden on md+) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-white/[0.08] bg-white/[0.03] backdrop-blur-xl shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center">
              <Wallet size={15} strokeWidth={1.5} className="text-slate-950" />
            </div>
            <span className="text-sm font-bold">FinancialPilot</span>
          </div>
          <div className="flex items-center gap-2">
            <StreakCounter streak={streak} />
          </div>
        </div>

        {/* Scrollable page content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="min-h-full"
            >
              <Outlet context={{ refreshKey, onSalaryUpdate }} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
