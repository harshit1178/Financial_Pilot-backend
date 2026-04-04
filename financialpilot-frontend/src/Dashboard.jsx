import { useEffect, useState, useCallback, useRef } from 'react'
import axios from 'axios'
import {
  Wallet,
  TrendingDown,
  ShoppingCart,
  Zap,
  Scale,
  PiggyBank,
  Settings2,
  Bus,
  MoreHorizontal,
  Utensils,
  Lightbulb,
  PlaneTakeoff,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldAlert,
  AlertTriangle,
  Trash2,
  Pencil,
  Plus,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react'

const API_BASE      = 'http://127.0.0.1:8000/api'
const DASHBOARD_URL = `${API_BASE}/dashboard/`
const ADD_TXN_URL   = `${API_BASE}/transactions/add/`
const TXN_BASE_URL  = `${API_BASE}/transactions/`     // for PATCH / DELETE /<id>/
const PROFILE_URL   = `${API_BASE}/profile/`

const CATEGORIES = [
  'Food', 'Travel', 'Groceries', 'Rent',
  'Loan', 'Services', 'Subscription', 'Others',
]

const GOAL_MODES = [
  { key: 'Freestyle', label: 'Freestyle', pct: 10,   Icon: Zap,       color: 'text-amber-400',   bg: 'bg-amber-500/20'   },
  { key: 'Balanced',  label: 'Balanced',  pct: 25,   Icon: Scale,     color: 'text-sky-400',     bg: 'bg-sky-500/20'     },
  { key: 'Savings',   label: 'Savings',   pct: 50,   Icon: PiggyBank, color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  { key: 'Custom',    label: 'Custom',    pct: null, Icon: Settings2, color: 'text-violet-400',  bg: 'bg-violet-500/20'  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val ?? 0)

const todayISO = () => new Date().toISOString().slice(0, 10)

const categoryIcon = (category) => {
  const map = {
    Food:         <Utensils size={16} />,
    Travel:       <PlaneTakeoff size={16} />,
    Groceries:    <ShoppingCart size={16} />,
    Rent:         <Zap size={16} />,
    Loan:         <Zap size={16} />,
    Services:     <Zap size={16} />,
    Subscription: <Bus size={16} />,
    Others:       <MoreHorizontal size={16} />,
  }
  return map[category] ?? <MoreHorizontal size={16} />
}

const categoryColor = (category) => {
  const map = {
    Food:         'bg-amber-500/20 text-amber-400',
    Travel:       'bg-blue-500/20 text-blue-400',
    Groceries:    'bg-green-500/20 text-green-400',
    Rent:         'bg-rose-500/20 text-rose-400',
    Loan:         'bg-orange-500/20 text-orange-400',
    Services:     'bg-violet-500/20 text-violet-400',
    Subscription: 'bg-pink-500/20 text-pink-400',
    Others:       'bg-slate-500/20 text-slate-400',
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
    <div className={`bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col gap-2 ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest leading-none">
        {label}
      </p>
      {children}
    </div>
  )
}

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, onDelete, onEdit }) {
  const isExpense = tx.transaction_type === 'Expense'
  const label     = tx.custom_name || tx.category
  const date      = new Date(tx.date).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short',
  })

  return (
    <div className="flex items-center gap-3 py-3 group">
      {/* Category icon */}
      <div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${categoryColor(tx.category)}`}>
        {categoryIcon(tx.category)}
      </div>

      {/* Label + date */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{label}</p>
        <p className="text-xs text-slate-500">{date}</p>
      </div>

      {/* Amount */}
      <div className="flex items-center gap-1.5 shrink-0">
        {isExpense
          ? <ArrowUpRight size={14} className="text-rose-400" />
          : <ArrowDownLeft size={14} className="text-emerald-400" />}
        <span className={`text-sm font-semibold ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}>
          {fmt(tx.amount)}
        </span>
      </div>

      {/* Action buttons — appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <button
          id={`edit-tx-${tx.id}`}
          onClick={() => onEdit(tx)}
          title="Edit transaction"
          className="w-7 h-7 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 flex items-center justify-center text-sky-400 transition-colors"
        >
          <Pencil size={13} />
        </button>
        <button
          id={`delete-tx-${tx.id}`}
          onClick={() => onDelete(tx)}
          title="Delete transaction"
          className="w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 flex items-center justify-center text-rose-400 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}


// ─── Confirm Delete Modal ─────────────────────────────────────────────────────

function ConfirmDeleteModal({ tx, onConfirm, onCancel, loading }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-rose-500/15 flex items-center justify-center shrink-0">
            <Trash2 size={20} className="text-rose-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white leading-none">Delete Transaction?</h2>
            <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
          </div>
        </div>

        {/* Transaction preview */}
        <div className="bg-slate-800 rounded-2xl px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">{tx.custom_name || tx.category}</p>
            <p className="text-xs text-slate-500 mt-0.5">{tx.category}</p>
          </div>
          <span className="text-rose-400 font-bold text-sm">{fmt(tx.amount)}</span>
        </div>

        {/* Info note */}
        <p className="text-xs text-slate-500 leading-relaxed px-1">
          Deleting this will recalculate your monthly budget, savings, and daily safe limit.
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            id="delete-cancel"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-2xl py-3 transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            id="delete-confirm"
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rose-500 hover:bg-rose-400 disabled:opacity-60 active:scale-[0.98] text-white font-bold text-sm rounded-2xl py-3 transition-all flex items-center justify-center gap-2"
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Deleting…</>
              : <><Trash2 size={15} /> Delete</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Goal Mode Selector ───────────────────────────────────────────────────────

function GoalModeSelector({ currentMode, onSelect, saving }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const current = GOAL_MODES.find((m) => m.key === currentMode) ?? GOAL_MODES[1]
  const { Icon: CurIcon } = current

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        id="goal-mode-selector"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold rounded-2xl px-3 py-2.5 transition-all disabled:opacity-60"
      >
        {saving
          ? <Loader2 size={15} className="animate-spin text-slate-400" />
          : <CurIcon size={15} className={current.color} />}
        <span className="hidden sm:inline">{current.label}</span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-40">
          {GOAL_MODES.map((mode) => {
            const { Icon } = mode
            const active   = mode.key === currentMode
            return (
              <button
                key={mode.key}
                onClick={() => { onSelect(mode.key); setOpen(false) }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${mode.bg}`}>
                  <Icon size={14} className={mode.color} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold leading-none">{mode.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mode.pct !== null ? `${mode.pct}% to savings` : 'Set your own %'}
                  </p>
                </div>
                {active && <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Custom % Modal ───────────────────────────────────────────────────────────

function CustomPercentModal({ onConfirm, onCancel }) {
  const [pct, setPct]     = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onCancel])

  const handleConfirm = () => {
    const n = parseInt(pct, 10)
    if (isNaN(n) || n < 1 || n > 99) {
      setError('Enter a whole number between 1 and 99.')
      return
    }
    onConfirm(n)
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Custom Savings %</h2>
            <p className="text-xs text-slate-500 mt-0.5">Pick your personal savings rate</p>
          </div>
          <button
            onClick={onCancel}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Savings Percentage
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max="99"
              autoFocus
              placeholder="e.g. 30"
              value={pct}
              onChange={(e) => setPct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
              className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 outline-none transition-colors pr-10"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">%</span>
          </div>
          {pct && !isNaN(parseInt(pct)) && (
            <p className="text-xs text-slate-500 pl-1">
              Budget: <span className="text-white font-semibold">{100 - parseInt(pct)}%</span>
              {' '}· Savings: <span className="text-violet-400 font-semibold">{pct}%</span>
            </p>
          )}
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}

        <button
          onClick={handleConfirm}
          className="w-full bg-violet-500 hover:bg-violet-400 active:scale-[0.98] text-white font-bold text-sm rounded-2xl py-3.5 transition-all"
        >
          Apply Custom Mode
        </button>
      </div>
    </div>
  )
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

const EMPTY_FORM = { amount: '', category: 'Food', date: todayISO(), custom_name: '' }

function AddExpenseModal({ onClose, onSuccess, initialTx = null }) {
  const isEdit   = !!initialTx
  const initForm = isEdit
    ? {
        amount:      String(initialTx.amount),
        category:    initialTx.category ?? 'Food',
        date:        initialTx.date
                       ? new Date(initialTx.date).toISOString().slice(0, 10)
                       : todayISO(),
        custom_name: initialTx.custom_name ?? '',
      }
    : EMPTY_FORM

  const [form, setForm]             = useState(initForm)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState(null)
  const [done, setDone]             = useState(false)

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }))

  // Derived: is the typed amount a positive number?
  const isValidAmount = form.amount !== '' && !isNaN(parseFloat(form.amount)) && parseFloat(form.amount) > 0

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    const amount = parseFloat(form.amount)
    if (!isValidAmount) {
      setError('Please enter a valid amount greater than ₹0.')
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        amount,
        category:         form.category,
        custom_name:      form.custom_name || undefined,
        transaction_type: 'Expense',
        date:             new Date(form.date).toISOString(),
      }
      const res = isEdit
        ? await axios.patch(`${TXN_BASE_URL}${initialTx.id}/`, payload)
        : await axios.post(ADD_TXN_URL, payload)
      setDone(true)
      const warning = res.data?.warning ?? null
      setTimeout(() => { onSuccess(warning); onClose() }, 900)
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object') {
        const msg = data.error
          ?? (Object.values(data)[0] instanceof Array ? Object.values(data)[0][0] : Object.values(data)[0])
          ?? 'Something went wrong.'
        setError(typeof msg === 'string' ? msg : JSON.stringify(msg))
      } else {
        setError('Could not reach the server. Is Django running?')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">
              {isEdit ? 'Edit Expense' : 'Add Expense'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEdit ? 'Update the details below' : 'Log a new expense to track your spending'}
            </p>
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₹)</label>
            <input
              id="expense-amount"
              type="number" min="1" step="any"
              placeholder="Enter amount"
              value={form.amount}
              onChange={set('amount')}
              autoFocus
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              id="expense-category"
              value={form.category}
              onChange={set('category')}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white outline-none transition-colors appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Note */}
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
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <input
              id="expense-date"
              type="date"
              value={form.date}
              onChange={set('date')}
              max={todayISO()}
              className="w-full bg-slate-800 border border-slate-700 focus:border-emerald-500 rounded-2xl px-4 py-3 text-white outline-none transition-colors [color-scheme:dark]"
            />
          </div>

          {/* Error — prominent red alert with icon */}
          {error && (
            <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-4 py-3">
              <ShieldAlert size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-400 leading-snug">{error}</p>
            </div>
          )}

          {/* Success (inside modal) */}
          {done && (
            <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3">
              <CheckCircle2 size={16} />
              {isEdit ? 'Transaction updated! Refreshing…' : 'Expense saved! Dashboard is updating…'}
            </div>
          )}

          {/* Submit — disabled when amount invalid */}
          <button
            id="expense-submit"
            type="submit"
            disabled={submitting || done || !isValidAmount}
            className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm transition-all ${
              done
                ? 'bg-emerald-600 text-white'
                : !isValidAmount && !submitting
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : isEdit
                ? 'bg-sky-500 hover:bg-sky-400 active:scale-[0.98] text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950'
            } disabled:opacity-70`}
          >
            {done ? (
              <><CheckCircle2 size={18} /> {isEdit ? 'Updated!' : 'Expense Added!'}</>
            ) : submitting ? (
              <><Loader2 size={18} className="animate-spin" /> {isEdit ? 'Updating…' : 'Saving…'}</>
            ) : isEdit ? (
              <><Pencil size={18} /> Update Expense</>
            ) : (
              <><Plus size={18} /> Add Expense</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData]               = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [showModal, setShowModal]     = useState(false)
  const [toast, setToast]             = useState(null)   // null | { type: 'success'|'warning', message: string }
  const [savingMode, setSavingMode]   = useState(false)
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)  // tx object to confirm delete
  const [editTarget,   setEditTarget]   = useState(null)  // tx object to edit
  const [deleting,     setDeleting]     = useState(false) // delete in progress

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

  // PATCH goal mode then silently refresh
  const handleModeChange = useCallback(async (mode, customPct = null) => {
    setSavingMode(true)
    try {
      const payload = { goal_mode: mode }
      if (mode === 'Custom' && customPct !== null) payload.custom_savings_percent = customPct
      await axios.patch(PROFILE_URL, payload)
      fetchDashboardData(true)
    } catch (err) {
      console.error('Failed to update goal mode:', err)
    } finally {
      setSavingMode(false)
    }
  }, [fetchDashboardData])

  const handleModeSelect = (mode) => {
    if (mode === 'Custom') {
      setShowCustomModal(true)   // open custom % modal first
    } else {
      handleModeChange(mode)
    }
  }

  // DELETE transaction — called from ConfirmDeleteModal
  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await axios.delete(`${TXN_BASE_URL}${deleteTarget.id}/`)
      setDeleteTarget(null)
      fetchDashboardData(true)   // silent refresh — all 4 cards update
      setToast({ type: 'success', message: 'Transaction removed. Savings restored!' })
      setTimeout(() => setToast(null), 3500)
    } catch (err) {
      console.error('Delete failed:', err)
      setToast({ type: 'warning', message: 'Delete failed. Please try again.' })
      setTimeout(() => setToast(null), 3000)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, fetchDashboardData])

  if (loading) return <LoadingScreen />
  if (error)   return <ErrorScreen message={error} />

  const {
    goal_mode               = 'Balanced',
    savings_percent         = 25,
    total_salary            = 0,
    monthly_budget          = 0,
    total_spent             = 0,
    monthly_remaining_budget = 0,
    daily_safe_limit        = 0,
    days_left               = 1,
    total_savings_all_time  = 0,
    transactions            = [],
  } = data

  const currentMode  = GOAL_MODES.find((m) => m.key === goal_mode) ?? GOAL_MODES[1]
  const { Icon: ModeIcon } = currentMode
  const spentPercent = monthly_budget > 0 ? Math.round((total_spent / monthly_budget) * 100) : 0
  const isOverDSL    = daily_safe_limit < 0
  const recent       = [...(transactions ?? [])].slice(0, 5)

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Wallet size={20} className="text-slate-950" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">FinancialPilot</h1>
              <p className="text-xs text-slate-500 mt-0.5">Your smart money co-pilot</p>
            </div>
          </div>

          {/* Right side: Goal Mode selector + Add Expense */}
          <div className="flex items-center gap-2">
            <GoalModeSelector
              currentMode={goal_mode}
              onSelect={handleModeSelect}
              saving={savingMode}
            />
            <button
              id="open-add-expense"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-500/30 transition-all"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Add Expense</span>
            </button>
          </div>
        </header>

        {/* ── 4 Stat Cards ────────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">

          {/* Monthly Remaining Budget */}
          <StatCard label="Monthly Budget Left">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 leading-none tracking-tight">
              {fmt(monthly_remaining_budget)}
            </p>
            <p className="text-xs text-slate-500">of {fmt(monthly_budget)} budget</p>
          </StatCard>

          {/* Total Spent */}
          <StatCard label="Total Spent">
            <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 leading-none tracking-tight">
              {fmt(total_spent)}
            </p>
            <p className="text-xs text-slate-500">{spentPercent}% of budget used</p>
          </StatCard>

          {/* Total Life Savings */}
          <StatCard label="Total Life Savings">
            <p className="text-2xl sm:text-3xl font-extrabold text-cyan-400 leading-none tracking-tight">
              {fmt(total_savings_all_time)}
            </p>
            <p className="text-xs text-slate-500">{savings_percent}% savings rate</p>
          </StatCard>

          {/* Safe Budget for Today */}
          <StatCard
            label="Safe Budget for Today"
            className={isOverDSL ? 'border-rose-500/60 shadow-sm shadow-rose-500/10' : ''}
          >
            <p className={`text-2xl sm:text-3xl font-extrabold leading-none tracking-tight ${
              isOverDSL ? 'text-rose-400' : 'text-sky-400'
            }`}>
              {fmt(daily_safe_limit)}
            </p>
            <p className="text-xs text-slate-500">
              {isOverDSL ? (
                <span className="text-rose-400 flex items-center gap-1">
                  <ShieldAlert size={11} />
                  Over budget today
                </span>
              ) : (
                <>{days_left}d left this month</>
              )}
            </p>
          </StatCard>
        </section>

        {/* ── Pilot Insight ───────────────────────────────────────────────── */}
        <section>
          <div className="bg-slate-900 border border-slate-800 rounded-3xl px-6 py-5 flex items-start gap-4">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${currentMode.bg}`}>
              <ModeIcon size={15} className={currentMode.color} />
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              You are in{' '}
              <span className={`font-bold ${currentMode.color}`}>{goal_mode} Mode</span>
              {' '}({savings_percent}% to savings).{' '}
              To reach your savings goal, stay under{' '}
              <span className="font-bold text-emerald-400">{fmt(daily_safe_limit)}</span>{' '}
              today.{' '}
              <span className="text-slate-500">{days_left} {days_left === 1 ? 'day' : 'days'} left this month.</span>
            </p>
          </div>
        </section>

        {/* ── Recent Transactions ──────────────────────────────────────────── */}
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
                  <TransactionRow
                    key={tx.id}
                    tx={tx}
                    onDelete={(t) => setDeleteTarget(t)}
                    onEdit={(t)   => setEditTarget(t)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="text-center text-xs text-slate-700 pb-2">
          FinancialPilot &bull; Hackathon MVP &bull; {new Date().getFullYear()}
        </footer>

      </div>

      {/* ── Toast (success = green, warning = orange) ──────────────────────── */}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 font-semibold text-sm rounded-2xl px-5 py-3 shadow-xl max-w-sm ${
          toast.type === 'warning'
            ? 'bg-orange-500 text-white shadow-orange-500/30'
            : 'bg-emerald-500 text-slate-950 shadow-emerald-500/30'
        }`}>
          {toast.type === 'warning'
            ? <AlertTriangle size={16} className="shrink-0" />
            : <CheckCircle2 size={16} className="shrink-0" />}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-1 opacity-60 hover:opacity-100 transition-opacity shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── Custom % Modal ──────────────────────────────────────────────────── */}
      {showCustomModal && (
        <CustomPercentModal
          onConfirm={(pct) => {
            setShowCustomModal(false)
            handleModeChange('Custom', pct)
          }}
          onCancel={() => setShowCustomModal(false)}
        />
      )}

      {/* ── Confirm Delete Modal ───────────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmDeleteModal
          tx={deleteTarget}
          onConfirm={handleConfirmDelete}
          onCancel={() => !deleting && setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* ── Add Expense / Edit Expense Modal ────────────────────────── */}
      {(showModal || editTarget) && (
        <AddExpenseModal
          onClose={() => { setShowModal(false); setEditTarget(null) }}
          initialTx={editTarget ?? null}
          onSuccess={(warning) => {
            const wasEditing = !!editTarget
            fetchDashboardData(true)   // silent refresh — no loading flash
            setEditTarget(null)
            if (warning) {
              setToast({ type: 'warning', message: 'Using Savings: Your monthly budget is ₹0. Stay safe!' })
            } else {
              const msg = wasEditing
                ? 'Transaction updated. Savings recalculated!'
                : 'Expense added & dashboard updated!'
              setToast({ type: 'success', message: msg })
              setTimeout(() => setToast(null), 3000)
            }
          }}
        />
      )}
    </div>
  )
}
