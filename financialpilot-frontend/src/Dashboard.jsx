import { useEffect, useState } from 'react'
import axios from 'axios'
import {
  Wallet,
  TrendingDown,
  ShoppingCart,
  Zap,
  Bus,
  MoreHorizontal,
  Utensils,
  Lightbulb,
  PlaneTakeoff,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'

const API_URL = 'http://127.0.0.1:8000/api/dashboard/'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val ?? 0)

const categoryIcon = (category) => {
  const map = {
    Food: <Utensils size={16} />,
    Transport: <Bus size={16} />,
    Utilities: <Zap size={16} />,
    Entertainment: <PlaneTakeoff size={16} />,
    Other: <MoreHorizontal size={16} />,
  }
  return map[category] ?? <MoreHorizontal size={16} />
}

const categoryColor = (category) => {
  const map = {
    Food: 'bg-amber-500/20 text-amber-400',
    Transport: 'bg-blue-500/20 text-blue-400',
    Utilities: 'bg-violet-500/20 text-violet-400',
    Entertainment: 'bg-pink-500/20 text-pink-400',
    Other: 'bg-slate-500/20 text-slate-400',
  }
  return map[category] ?? 'bg-slate-500/20 text-slate-400'
}

// ─── Loading / Error ──────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-4">
      <div className="relative w-14 h-14">
        <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
      <p className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">
        Loading your financial data…
      </p>
    </div>
  )
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center mb-2">
        <TrendingDown size={28} className="text-rose-400" />
      </div>
      <h2 className="text-xl font-bold text-white">Could not connect to API</h2>
      <p className="text-slate-400 text-sm max-w-xs">{message}</p>
      <p className="text-xs text-slate-600 mt-1">
        Make sure Django is running at{' '}
        <span className="text-emerald-500 font-mono">http://127.0.0.1:8000</span>
      </p>
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, children, className = '' }) {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col gap-2 ${className}`}
    >
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
        {label}
      </p>
      {children}
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx }) {
  const isExpense = tx.transaction_type === 'Expense'
  const label = tx.custom_name || tx.category
  const date = new Date(tx.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="flex items-center gap-4 py-3">
      <div
        className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${categoryColor(tx.category)}`}
      >
        {categoryIcon(tx.category)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        {isExpense ? (
          <ArrowUpRight size={14} className="text-rose-400" />
        ) : (
          <ArrowDownLeft size={14} className="text-emerald-400" />
        )}
        <span
          className={`text-sm font-semibold ${
            isExpense ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {fmt(tx.amount)}
        </span>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    axios
      .get(API_URL)
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message || 'An unexpected error occurred.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <LoadingScreen />
  if (error) return <ErrorScreen message={error} />

  const {
    total_salary = 0,
    total_spent = 0,
    remaining_balance = 0,
    daily_safe_limit = 0,
    days_left = 1,
    transactions = [],
  } = data

  const spentPercent =
    total_salary > 0 ? Math.round((total_spent / total_salary) * 100) : 0

  const isOverDSL = total_spent > daily_safe_limit
  const recent = [...(transactions ?? [])].slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
            <Wallet size={20} className="text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">
              FinancialPilot
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Your smart money co-pilot</p>
          </div>
        </header>

        {/* ── Primary Cards ─────────────────────────────────────────────────── */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Remaining Balance */}
          <StatCard label="Remaining Balance">
            <p className="text-4xl font-extrabold text-emerald-400 leading-none tracking-tight">
              {fmt(remaining_balance)}
            </p>
            <p className="text-xs text-slate-500">of {fmt(total_salary)} salary</p>
          </StatCard>

          {/* Total Spent */}
          <StatCard label="Total Spent">
            <p className="text-4xl font-extrabold text-rose-400 leading-none tracking-tight">
              {fmt(total_spent)}
            </p>
            <p className="text-xs text-slate-500">
              {spentPercent}% of monthly salary used
            </p>
          </StatCard>

          {/* Daily Safe Limit */}
          <StatCard
            label="Daily Safe Limit"
            className={isOverDSL ? 'border-rose-500/60 shadow-sm shadow-rose-500/10' : ''}
          >
            <p
              className={`text-4xl font-extrabold leading-none tracking-tight ${
                isOverDSL ? 'text-rose-400' : 'text-sky-400'
              }`}
            >
              {fmt(daily_safe_limit)}
            </p>
            <p className="text-xs text-slate-500">
              {isOverDSL ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <ShieldAlert size={11} />
                  You've exceeded today's limit
                </span>
              ) : (
                <>Your budget for today · {days_left}d left</>
              )}
            </p>
          </StatCard>
        </section>

        {/* ── Pilot Insight ─────────────────────────────────────────────────── */}
        <section>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl px-6 py-5 flex items-start gap-4">
            <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center shrink-0 mt-0.5">
              <Lightbulb size={15} className="text-violet-400" />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              To stay on track, keep today's spending below{' '}
              <span className="font-bold text-emerald-400">{fmt(daily_safe_limit)}</span>.
              {' '}You have{' '}
              <span className="font-semibold text-white">{days_left}</span>{' '}
              {days_left === 1 ? 'day' : 'days'} left this month.
            </p>
          </div>
        </section>

        {/* ── Recent Transactions ────────────────────────────────────────────── */}
        <section>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-white">Recent Transactions</h2>
              <span className="text-xs text-slate-500">Last 5 entries</span>
            </div>

            {recent.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <ShoppingCart size={34} className="text-slate-700" />
                <p className="text-slate-500 text-sm">No transactions yet</p>
                <p className="text-xs text-slate-600">
                  Add some via the Django admin panel
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recent.map((tx) => (
                  <TransactionRow key={tx.id} tx={tx} />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="text-center text-xs text-slate-700 pb-2">
          FinancialPilot &bull; Hackathon MVP &bull; {new Date().getFullYear()}
        </footer>

      </div>
    </div>
  )
}
