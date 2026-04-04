import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import confetti from 'canvas-confetti'
import {
  Wallet, ArrowLeft, Plus, X, Trophy, PiggyBank,
  Lock, Unlock, Loader2, CheckCircle2, AlertTriangle,
  ShieldAlert, Trash2, Target, ChevronDown, Calendar,
  TrendingUp, Flame, Star,
} from 'lucide-react'

// ─── API ──────────────────────────────────────────────────────────────────────
const API = 'http://127.0.0.1:8000/api'
const GOALS_URL = `${API}/goals/`
const WITHDRAW_URL = `${API}/goals/withdraw/`
const BUDGETS_URL = `${API}/weekly-budgets/`
const PLEDGES_URL = `${API}/pledges/`
const SETTLE_URL = `${API}/pledges/settle/`
const DASHBOARD_URL = `${API}/dashboard/`

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (v) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', maximumFractionDigits: 0,
  }).format(v ?? 0)

const todayISO = () => new Date().toISOString().slice(0, 10)

/** Return the Monday of the current week as YYYY-MM-DD */
const thisWeekStart = () => {
  const d = new Date()
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  return d.toISOString().slice(0, 10)
}

const CATEGORIES = [
  'Food', 'Travel', 'Groceries', 'Rent', 'Loan', 'Services', 'Subscription', 'Others',
]

// ─── Confetti burst ───────────────────────────────────────────────────────────
function fireConfetti() {
  const opts = { particleCount: 140, spread: 90, origin: { y: 0.55 } }
  confetti({ ...opts, colors: ['#10b981', '#34d399', '#6ee7b7'] })
  setTimeout(() =>
    confetti({ ...opts, angle: 120, colors: ['#8b5cf6', '#a78bfa', '#fbbf24'] }), 200)
  setTimeout(() =>
    confetti({ ...opts, angle: 60, colors: ['#f59e0b', '#fcd34d', '#10b981'] }), 400)
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }) {
  if (!toast) return null
  const isSuccess = toast.type === 'success'
  const isVictory = toast.type === 'victory'
  return (
    <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3
      font-semibold text-sm rounded-2xl px-5 py-3.5 shadow-2xl max-w-sm w-[90vw] border
      transition-all animate-bounce-in ${isVictory
        ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/40 border-emerald-400'
        : isSuccess
          ? 'bg-emerald-500 text-slate-950 shadow-emerald-500/30 border-emerald-400'
          : 'bg-orange-500 text-white shadow-orange-500/30 border-orange-400'
      }`}
    >
      {isVictory
        ? <Trophy size={18} className="shrink-0" />
        : isSuccess
          ? <CheckCircle2 size={16} className="shrink-0" />
          : <AlertTriangle size={16} className="shrink-0" />}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 shrink-0">
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Modal Backdrop ───────────────────────────────────────────────────────────
function Backdrop({ onClose, children, zIndex = 'z-50' }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex items-end sm:items-center justify-center`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm" />
      {children}
    </div>
  )
}

// ─── Add Goal Modal ───────────────────────────────────────────────────────────
function AddGoalModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [amount, setAmt] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const valid = name.trim() && parseFloat(amount) > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setErr(null)
    try {
      await axios.post(GOALS_URL, { name: name.trim(), target_amount: parseFloat(amount) })
      onCreated()
      onClose()
    } catch (ex) {
      setErr(ex.response?.data?.target_amount?.[0] || ex.response?.data?.detail || 'Failed to create goal.')
    } finally { setBusy(false) }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">New Goal</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add a dream to your priority queue</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Goal Name</label>
            <input
              autoFocus
              placeholder="e.g. New Laptop, Trip to Goa"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-2xl px-4 py-3 text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Target Amount (₹)</label>
            <input
              type="number" min="1" step="any"
              placeholder="e.g. 50000"
              value={amount}
              onChange={(e) => setAmt(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          {err && (
            <div className="flex items-start gap-2 bg-rose-500/10 border border-rose-500/20 rounded-2xl px-4 py-3">
              <ShieldAlert size={15} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-400">{err}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={!valid || busy}
            className="w-full flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-400 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl py-3.5 transition-all"
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Adding…</> : <><Plus size={16} /> Add to Queue</>}
          </button>
        </form>
      </div>
    </Backdrop>
  )
}

// ─── Set Weekly Budget Modal ──────────────────────────────────────────────────
function SetBudgetModal({ onClose, onCreated }) {
  const [category, setCat] = useState('Food')
  const [limit, setLimit] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  const valid = parseFloat(limit) > 0

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setBusy(true); setErr(null)
    try {
      await axios.post(BUDGETS_URL, { category_name: category, weekly_limit: parseFloat(limit) })
      onCreated(); onClose()
    } catch (ex) {
      setErr(ex.response?.data?.weekly_limit?.[0] || ex.response?.data?.detail || 'Already exists. Edit instead.')
    } finally { setBusy(false) }
  }

  return (
    <Backdrop onClose={onClose}>
      <div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Weekly Challenge</h2>
            <p className="text-xs text-slate-500 mt-0.5">Set a spending limit for a category</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={category} onChange={(e) => setCat(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3 text-white outline-none transition-colors appearance-none cursor-pointer"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Weekly Limit (₹)</label>
            <input
              autoFocus type="number" min="1" step="any"
              placeholder="e.g. 2000"
              value={limit} onChange={(e) => setLimit(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 focus:border-amber-500 rounded-2xl px-4 py-3 text-white text-lg font-bold placeholder-slate-600 outline-none transition-colors"
            />
          </div>
          {err && <p className="text-sm text-rose-400">{err}</p>}
          <button
            type="submit" disabled={!valid || busy}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-50 text-slate-950 font-bold rounded-2xl py-3.5 transition-all"
          >
            {busy ? <><Loader2 size={16} className="animate-spin" /> Saving…</> : <><Flame size={16} /> Start Challenge</>}
          </button>
        </form>
      </div>
    </Backdrop>
  )
}

// ─── Savings Destination Modal ────────────────────────────────────────────────
function DestinationModal({ saved, pledgeId, onClose, onSettled }) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState(null)

  // handleChoice: sends destination string ('piggybank' or 'general') to backend
  const handleChoice = async (destination) => {
    setBusy(true); setErr(null)
    try {
      const res = await axios.post(SETTLE_URL, { pledge_id: pledgeId, destination })
      // Pass full API response to parent for authoritative state update
      onSettled(destination, saved, res.data)
      onClose()
    } catch (ex) {
      setErr(ex.response?.data?.error || 'Settlement failed.')
    } finally { setBusy(false) }
  }

  return (
    <Backdrop onClose={onClose} zIndex="z-[60]">
      <div className="relative w-full sm:max-w-sm bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 space-y-5">
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Star size={26} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white">You Saved {fmt(saved)}!</h2>
          <p className="text-sm text-slate-400">Where should your savings go?</p>
        </div>

        {err && <p className="text-sm text-rose-400 text-center">{err}</p>}

        <div className="grid grid-cols-2 gap-3">
          <button
            disabled={busy}
            onClick={() => handleChoice('general')}
            className="flex flex-col items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl px-4 py-5 transition-all group"
          >
            <TrendingUp size={22} className="text-cyan-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-white">General Savings</span>
            <span className="text-xs text-slate-500 text-center leading-tight">Boosts your Total Life Savings</span>
          </button>
          <button
            disabled={busy}
            onClick={() => handleChoice('piggybank')}
            className="flex flex-col items-center gap-2 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 hover:border-violet-400 rounded-2xl px-4 py-5 transition-all group"
          >
            <PiggyBank size={22} className="text-violet-400 group-hover:scale-110 transition-transform" />
            <span className="text-sm font-bold text-white">Goal Piggybank</span>
            <span className="text-xs text-slate-500 text-center leading-tight">Funds your dream queue</span>
          </button>
        </div>

        {busy && (
          <div className="flex items-center justify-center gap-2 text-slate-400 text-sm">
            <Loader2 size={15} className="animate-spin" /> Saving your choice…
          </div>
        )}
      </div>
    </Backdrop>
  )
}

// ─── Goal Card ────────────────────────────────────────────────────────────────
function GoalCard({ goal, index, piggybank, onDelete }) {
  const progress = Math.min(100, (piggybank / goal.target_amount) * 100)
  const isFunded = piggybank >= goal.target_amount

  return (
    <div className={`relative bg-slate-900 border rounded-3xl p-5 transition-all ${isFunded && index === 0
        ? 'border-emerald-500/60 shadow-lg shadow-emerald-500/10'
        : 'border-slate-800'
      }`}>
      {/* Priority badge */}
      <div className={`absolute -top-3 -left-1 w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-md ${index === 0
          ? 'bg-emerald-500 text-slate-950'
          : 'bg-slate-700 text-slate-300'
        }`}>
        {index + 1}
      </div>

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="ml-4">
          <h3 className="font-bold text-white text-base leading-tight">{goal.name}</h3>
          <p className="text-xs text-slate-500 mt-0.5">Target: {fmt(goal.target_amount)}</p>
        </div>
        <button
          onClick={() => onDelete(goal)}
          className="w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition-colors shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="space-y-1.5">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${isFunded ? 'bg-emerald-500' : 'bg-violet-500'
              }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {fmt(Math.min(piggybank, goal.target_amount))} funded
          </span>
          <span className={`text-xs font-bold ${isFunded ? 'text-emerald-400' : 'text-slate-400'}`}>
            {Math.round(progress)}%
          </span>
        </div>
      </div>

      {isFunded && index === 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 size={12} /> Ready to withdraw!
        </div>
      )}
    </div>
  )
}

// ─── Pledge Row ───────────────────────────────────────────────────────────────
function PledgeRow({ pledge, onSettle, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-800 last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
          <Flame size={14} className="text-amber-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">{pledge.category_name}</p>
          <p className="text-xs text-slate-500">
            Limit {fmt(pledge.weekly_limit)} · wk of {pledge.week_start_date}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {pledge.is_settled ? (
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
            <CheckCircle2 size={12} /> Settled
          </span>
        ) : (
          <button
            onClick={() => onSettle(pledge)}
            className="text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl px-3 py-1.5 transition-all"
          >
            Finish Week
          </button>
        )}
        <button
          onClick={() => onDelete(pledge)}
          className="w-6 h-6 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 flex items-center justify-center text-rose-400 transition-colors"
        >
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function GoalsPage() {
  const [goals, setGoals] = useState([])
  const [budgets, setBudgets] = useState([])
  const [pledges, setPledges] = useState([])
  const [piggybank, setPiggybank] = useState(0)

  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  // Modals
  const [showAddGoal, setShowAddGoal] = useState(false)
  const [showAddBudget, setShowAddBudget] = useState(false)
  const [destModal, setDestModal] = useState(null) // { pledgeId, saved }
  const [withdrawing, setWithdrawing] = useState(false)

  // ── Global dashboard refresh callback (passed via URL/state) ────────────────
  const showToast = (type, message, duration = 4000) => {
    setToast({ type, message })
    if (duration) setTimeout(() => setToast(null), duration)
  }

  // ── Fetch all data ──────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [gRes, bRes, pRes, dRes] = await Promise.all([
        axios.get(GOALS_URL),
        axios.get(BUDGETS_URL),
        axios.get(PLEDGES_URL),
        axios.get(DASHBOARD_URL),
      ])
      setGoals(gRes.data)
      setBudgets(bRes.data)
      setPledges(pRes.data)
      setPiggybank(dRes.data.goal_piggybank_balance ?? 0)
    } catch {
      showToast('warning', 'Could not load data. Is Django running?', 5000)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Withdraw top goal ───────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    setWithdrawing(true)
    try {
      const res = await axios.post(WITHDRAW_URL)
      setPiggybank(res.data.piggybank_balance)
      setGoals((prev) => prev.filter((g) => g.name !== res.data.goal_name))
      fireConfetti()
      showToast('victory', `🏆 Goal Accomplished! "${res.data.goal_name}" — Dream fulfilled!`, 6000)
      // re-fetch for re-indexed priorities
      setTimeout(fetchAll, 800)
    } catch (ex) {
      const msg = ex.response?.data?.error || 'Withdrawal failed.'
      showToast('warning', msg, 5000)
    } finally {
      setWithdrawing(false)
    }
  }

  // ── Settle a pledge ─────────────────────────────────────────────────────────
  const handleSettle = async (pledge) => {
    try {
      const res = await axios.post(SETTLE_URL, { pledge_id: pledge.id })
      if (res.data.status === 'overspent') {
        showToast('warning', res.data.message, 5000)
      } else if (res.data.status === 'saved') {
        // Show destination choice modal
        setDestModal({ pledgeId: pledge.id, saved: res.data.savings_available })
      }
    } catch (ex) {
      showToast('warning', ex.response?.data?.error || 'Settlement failed.', 4000)
    }
  }

  // handleSettled: receives the authoritative API response for immediate state sync
  // fetchAll() then refreshes ALL dashboard cards (monthly budget, savings, piggybank)
  const handleSettled = async (destination, saved, apiResponse) => {
    // Use server's authoritative piggybank balance (prevents stale optimistic math)
    if (apiResponse?.piggybank_balance !== undefined) {
      setPiggybank(apiResponse.piggybank_balance)
    } else if (destination === 'piggybank') {
      setPiggybank((prev) => +prev + +saved)
    }

    if (destination === 'piggybank') {
      showToast('success', `\u{1F4B0} \u20b9${Number(saved).toLocaleString('en-IN')} added to your Goal Piggybank!`)
    } else {
      showToast('success', `\u{1F4C8} \u20b9${Number(saved).toLocaleString('en-IN')} locked into General Savings \u2014 Budget updated!`)
    }

    // Full re-fetch: syncs Monthly Budget Left, Total Life Savings, pledge list
    fetchAll()
  }

  // ── Delete goal ─────────────────────────────────────────────────────────────
  const handleDeleteGoal = async (goal) => {
    try {
      await axios.delete(`${GOALS_URL}${goal.id}/`)
      setGoals((prev) => prev.filter((g) => g.id !== goal.id))
      showToast('success', `Goal "${goal.name}" removed.`)
      fetchAll() // re-index
    } catch { showToast('warning', 'Delete failed.', 3000) }
  }

  // ── Delete pledge ───────────────────────────────────────────────────────────
  const handleDeletePledge = async (pledge) => {
    try {
      await axios.delete(`${PLEDGES_URL}${pledge.id}/`)
      setPledges((prev) => prev.filter((p) => p.id !== pledge.id))
      showToast('success', 'Pledge removed.')
    } catch { showToast('warning', 'Delete failed.', 3000) }
  }

  // ── Add pledge for a budget (auto week) ─────────────────────────────────────
  const handleAddPledge = async (budget) => {
    try {
      await axios.post(PLEDGES_URL, {
        category: budget.id,
        week_start_date: thisWeekStart(),
      })
      fetchAll()
      showToast('success', `Challenge accepted for ${budget.category_name}! 🔥`)
    } catch (ex) {
      showToast('warning', ex.response?.data?.non_field_errors?.[0] || 'Pledge already exists for this week.', 4000)
    }
  }

  // ── Derived state ───────────────────────────────────────────────────────────
  const topGoal = goals[0] ?? null
  const canWithdraw = topGoal && parseFloat(piggybank) >= parseFloat(topGoal.target_amount)

  // ── Page render ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin" />
          </div>
          <p className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">Loading goals…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link to="/" className="w-9 h-9 rounded-2xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-all">
              <ArrowLeft size={17} />
            </Link>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <PiggyBank size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white leading-none">Goal Piggybank</h1>
              <p className="text-xs text-slate-500 mt-0.5">Your dream queue & weekly challenges</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddGoal(true)}
            className="flex items-center gap-2 bg-violet-500 hover:bg-violet-400 active:scale-95 text-white font-bold text-sm rounded-2xl px-4 py-2.5 shadow-lg shadow-violet-500/30 transition-all"
          >
            <Plus size={17} />
            <span className="hidden sm:inline">Add Goal</span>
          </button>
        </header>

        {/* ── Piggybank Card ──────────────────────────────────────────────── */}
        <section>
          <div className={`relative rounded-3xl border p-7 overflow-hidden transition-all ${canWithdraw
              ? 'bg-gradient-to-br from-emerald-950 to-slate-900 border-emerald-500/50 shadow-xl shadow-emerald-500/10'
              : 'bg-gradient-to-br from-slate-900 to-slate-950 border-slate-800'
            }`}>
            {/* Background glow */}
            {canWithdraw && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
              </div>
            )}

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Goal Piggybank</p>
                <p className={`text-5xl font-black tracking-tight leading-none ${canWithdraw ? 'text-emerald-400' : 'text-violet-400'
                  }`}>
                  {fmt(piggybank)}
                </p>
                {topGoal && (
                  <p className="text-sm text-slate-400 mt-2">
                    Next goal: <span className="text-white font-semibold">{topGoal.name}</span>
                    {' '}· needs <span className="font-semibold">{fmt(topGoal.target_amount)}</span>
                  </p>
                )}
              </div>

              {/* Withdraw button */}
              <div className="shrink-0">
                {canWithdraw ? (
                  <button
                    id="withdraw-goal-btn"
                    onClick={handleWithdraw}
                    disabled={withdrawing}
                    className="relative flex items-center gap-2.5 bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-70
                      text-slate-950 font-black text-sm rounded-2xl px-6 py-3.5 shadow-lg shadow-emerald-500/40
                      transition-all animate-pulse-slow"
                  >
                    {withdrawing
                      ? <><Loader2 size={17} className="animate-spin" /> Processing…</>
                      : <><Unlock size={17} /> Withdraw for Goal</>}
                  </button>
                ) : (
                  <button
                    disabled
                    className="flex items-center gap-2.5 bg-slate-800 text-slate-500 font-bold text-sm rounded-2xl px-6 py-3.5 cursor-not-allowed border border-slate-700"
                  >
                    <Lock size={17} /> Locked
                  </button>
                )}
                {!canWithdraw && topGoal && (
                  <p className="text-xs text-slate-600 mt-2 text-center">
                    {fmt(parseFloat(topGoal.target_amount) - parseFloat(piggybank))} more needed
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── Goal Queue ──────────────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Target size={15} className="text-violet-400" />
              Dream Queue
            </h2>
            <span className="text-xs text-slate-500">{goals.length} {goals.length === 1 ? 'goal' : 'goals'}</span>
          </div>

          {goals.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                <Trophy size={26} className="text-violet-400" />
              </div>
              <p className="text-slate-400 font-semibold">No goals yet</p>
              <p className="text-xs text-slate-600">Tap <span className="text-violet-400 font-bold">+ Add Goal</span> to start dreaming</p>
            </div>
          ) : (
            <div className="space-y-4">
              {goals.map((goal, i) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  index={i}
                  piggybank={parseFloat(piggybank)}
                  onDelete={handleDeleteGoal}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Weekly Challenges ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Flame size={15} className="text-amber-400" />
              Weekly Challenges
            </h2>
            <button
              onClick={() => setShowAddBudget(true)}
              className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl px-3 py-1.5 transition-colors"
            >
              <Plus size={13} /> New Challenge
            </button>
          </div>

          {budgets.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                <Flame size={22} className="text-amber-400" />
              </div>
              <p className="text-slate-400 font-semibold text-sm">No challenges set</p>
              <p className="text-xs text-slate-600">Set a weekly category limit to start saving</p>
            </div>
          ) : (
            <div className="space-y-3">
              {budgets.map((b) => {
                const activePledge = pledges.find(
                  (p) => p.category === b.id && p.week_start_date === thisWeekStart() && !p.is_settled
                )
                return (
                  <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-2xl bg-amber-500/15 flex items-center justify-center">
                          <Flame size={16} className="text-amber-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-white text-sm">{b.category_name}</p>
                          <p className="text-xs text-slate-500">Weekly limit: {fmt(b.weekly_limit)}</p>
                        </div>
                      </div>
                      {activePledge ? (
                        <button
                          onClick={() => handleSettle(activePledge)}
                          className="text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl px-3 py-2 transition-all"
                        >
                          Finish Week
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAddPledge(b)}
                          className="text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl px-3 py-2 transition-all"
                        >
                          Accept Challenge
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Past pledges */}
          {pledges.filter(p => p.is_settled).length > 0 && (
            <div className="mt-5">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Settled This Month</p>
              <div className="bg-slate-900 border border-slate-800 rounded-3xl px-5 py-2">
                {pledges.filter(p => p.is_settled).map((p) => (
                  <PledgeRow key={p.id} pledge={p} onSettle={handleSettle} onDelete={handleDeletePledge} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="text-center text-xs text-slate-700 pb-2">
          FinancialPilot · Goal Engine · {new Date().getFullYear()}
        </footer>
      </div>

      {/* ── Modals & Overlays ─────────────────────────────────────────────── */}
      {showAddGoal && <AddGoalModal onClose={() => setShowAddGoal(false)} onCreated={fetchAll} />}
      {showAddBudget && <SetBudgetModal onClose={() => setShowAddBudget(false)} onCreated={fetchAll} />}
      {destModal && (
        <DestinationModal
          saved={destModal.saved}
          pledgeId={destModal.pledgeId}
          onClose={() => setDestModal(null)}
          onSettled={handleSettled}
        />
      )}

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  )
}
