import { useEffect, useState, useCallback } from 'react'
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
  Plus,
  X,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

const API_BASE   = 'http://127.0.0.1:8000/api'
const DASHBOARD_URL = `${API_BASE}/dashboard/`
const ADD_TXN_URL   = `${API_BASE}/transactions/add/`

const CATEGORIES = [
  'Food', 'Travel', 'Groceries', 'Rent',
  'Loan', 'Services', 'Subscription', 'Others',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val ?? 0)

const todayISO = () => new Date().toISOString().slice(0, 10)

const categoryIcon = (category) => {
  const map = {
    Food: <Utensils size={16} />,
    Travel: <PlaneTakeoff size={16} />,
    Groceries: <ShoppingCart size={16} />,
    Rent: <Zap size={16} />,
    Loan: <Zap size={16} />,
    Services: <Zap size={16} />,
    Subscription: <Bus size={16} />,
    Others: <MoreHorizontal size={16} />,
  }
  return map[category] ?? <MoreHorizontal size={16} />
}

const categoryColor = (category) => {
  const map = {
    Food: 'bg-amber-500/20 text-amber-400',
    Travel: 'bg-blue-500/20 text-blue-400',
    Groceries: 'bg-green-500/20 text-green-400',
    Rent: 'bg-rose-500/20 text-rose-400',
    Loan: 'bg-orange-500/20 text-orange-400',
    Services: 'bg-violet-500/20 text-violet-400',
    Subscription: 'bg-pink-500/20 text-pink-400',
    Others: 'bg-slate-500/20 text-slate-400',
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

// ─── Add Expense Modal ────────────────────────────────────────────────────────

const EMPTY_FORM = { amount: '', category: 'Food', date: todayISO(), custom_name: '' }

function AddExpenseModal({ onClose, onSuccess }) {
  const [form, setForm]       = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]     = useState(null)
  const [done, setDone]       = useState(false)

  // Close on Escape key
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    // Client-side validation
    const amount = parseFloat(form.amount)
    if (!form.amount || isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than ₹0.')
      return
    }

    setSubmitting(true)
    try {
      await axios.post(ADD_TXN_URL, {
        amount,
        category: form.category,
        custom_name: form.custom_name || undefined,
        transaction_type: 'Expense',
        date: new Date(form.date).toISOString(),
      })
      setDone(true)
      setTimeout(() => {
        onSuccess()   // refresh dashboard
        onClose()
      }, 900)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        // Surface first validation error from DRF
        const firstKey = Object.keys(data)[0]
        const firstVal = data[firstKey]
        setError(
          Array.isArray(firstVal) ? firstVal[0] : (firstVal ?? 'Something went wrong.')
        )
      } else {
        setError('Could not reach the server. Is Django running?')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />

      {/* Sheet / Dialog */}
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 space-y-5 animate-[slide-up_0.22s_ease-out]">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Add Expense</h2>
            <p className="text-xs text-slate-500 mt-0.5">Log a new expense to track your spending</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Amount */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Amount (₹)
            </label>
            <input
              id="expense-amount"
              type="number"
              min="1"
              step="any"
              placeholder="Enter amount"
              value={form.amount}
              onChange={set('amount')}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Category
            </label>
            <select
              id="expense-category"
              value={form.category}
              onChange={set('category')}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white outline-none transition-colors appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Note (optional) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Note <span className="text-slate-600 normal-case font-normal">(optional)</span>
            </label>
            <input
              id="expense-note"
              type="text"
              placeholder="e.g. Lunch at office"
              maxLength={50}
              value={form.custom_name}
              onChange={set('custom_name')}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Date */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={set('date')}
              max={todayISO()}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white outline-none transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          {/* Success Toast (inside modal) */}
          {done && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} />
              Expense saved! Dashboard is updating…
            </div>
          )}

          {/* Submit */}
          <button
            id="expense-submit"
            type="submit"
            disabled={submitting || done}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm transition-all ${
              done
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950'
            } disabled:opacity-70`}
          >
            {done ? (
              <>
                <CheckCircle2 size={18} />
                Expense Added!
              </>
            ) : submitting ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Plus size={18} />
                Add Expense
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [toast, setToast]     = useState(false)

  // silent=true → background refresh (no full-page loading flash)
  const fetchDashboardData = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    axios
      .get(DASHBOARD_URL)
      .then((res) => { setData(res.data); setError(null) })
      .catch((err) => setError(err.message || 'An unexpected error occurred.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { fetchDashboardData() }, [fetchDashboardData])

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} />

  const {
    total_salary      = 0,
    total_spent       = 0,
    remaining_balance = 0,
    daily_safe_limit  = 0,
    days_left         = 1,
    transactions      = [],
  } = data

  const spentPercent =
    total_salary > 0 ? Math.round((total_spent / total_salary) * 100) : 0
  const isOverDSL = total_spent > daily_safe_limit
  const recent    = [...(transactions ?? [])].slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Wallet size={20} className="text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">
                FinancialPilot
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">Your smart money co-pilot</p>
            </div>
          </div>

          {/* ── Floating + button ─────────────────────────────────────────── */}
          <button
            id="open-add-expense"
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-500/30 transition-all"
          >
            <Plus size={18} />
            Add Expense
          </button>
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
                  Hit the <span className="text-emerald-400 font-semibold">+ Add Expense</span> button to log one
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

      {/* ── Success Toast (Dashboard level) ─────────────────────────────── */}
      {toast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-emerald-500 text-slate-950 font-bold text-sm rounded-2xl px-5 py-3 shadow-xl shadow-emerald-500/30 pointer-events-none">
          <CheckCircle2 size={16} />
          Expense added &amp; dashboard updated!
        </div>
      )}

      {/* ── Add Expense Modal ──────────────────────────────────────────────── */}
      {showModal && (
        <AddExpenseModal
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            fetchDashboardData(true)   // silent refresh — no loading flash
            setToast(true)
            setTimeout(() => setToast(false), 3000)
          }}
        />
      )}
    </div>
  )
}
