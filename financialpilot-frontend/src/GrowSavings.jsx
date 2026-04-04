import { useState, useMemo } from 'react'
import { TrendingUp, ShieldCheck, LineChart, CheckCircle2, ArrowRight } from 'lucide-react'

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (val) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val ?? 0)

export default function GrowSavings() {
  const [incomeStr, setIncomeStr] = useState('')
  const [model, setModel] = useState('9:1 Model')
  const [generated, setGenerated] = useState(false)
  const [invested, setInvested] = useState(false)

  // Math Logic
  const { totalSavings, safeSavings, sipInvestment } = useMemo(() => {
    const income = parseFloat(incomeStr) || 0
    // Exactly 10% base savings calculation per instructions
    const savings = income * 0.10

    let safe = 0
    let sip = 0

    if (savings < 1000) {
      safe = savings * 1.00
      sip = 0
    } else if (savings < 5000) {
      safe = savings * 0.70
      sip = savings * 0.30
    } else {
      safe = savings * 0.50
      sip = savings * 0.50
    }

    return { totalSavings: savings, safeSavings: safe, sipInvestment: sip }
  }, [incomeStr])

  const handleGenerate = (e) => {
    e.preventDefault()
    if (parseFloat(incomeStr) > 0) {
      setGenerated(true)
      setInvested(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-fade-in">
      
      {/* ── Top Section: Input & Calculation ───────────────────────────────── */}
      <section className="text-center space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center justify-center gap-2">
            <TrendingUp size={14} className="text-emerald-400" /> Total Monthly Savings
          </p>
          <h1 className="text-5xl font-black tracking-tight leading-none text-white">
            {generated ? fmt(totalSavings) : '₹0'}
          </h1>
        </div>

        <form 
          onSubmit={handleGenerate}
          className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-3xl p-6 flex flex-col sm:flex-row items-center gap-4 max-w-xl mx-auto"
        >
          <div className="flex-1 w-full text-left space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Monthly Income (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              value={incomeStr}
              onChange={(e) => setIncomeStr(e.target.value)}
              placeholder="e.g., 50000"
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl px-4 py-3 placeholder-slate-600 outline-none transition-all font-semibold"
            />
          </div>

          <div className="flex-1 w-full text-left space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Budgeting Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 rounded-xl px-4 py-3 outline-none transition-all text-white appearance-none cursor-pointer"
            >
              <option>9:1 Model</option>
              <option>7:2:1 Model</option>
            </select>
          </div>

          <div className="w-full sm:w-auto pt-0 sm:pt-6">
            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold rounded-xl px-6 py-3 transition-all"
            >
              Generate Plan
            </button>
          </div>
        </form>
      </section>

      {generated && (
        <>
          {/* ── Smart Advice Section ───────────────────────────────────────── */}
          <section className="bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-6 text-emerald-100/90 text-sm leading-relaxed">
            <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2 text-base">
              <CheckCircle2 size={18} /> Recommended Allocation Strategy
            </h3>
            <p>
              Based on your monthly income, we’ve separated your mandatory {fmt(totalSavings)} baseline savings into distinct vehicles:
              Your <strong>Safe Savings</strong> allocation focuses on capital protection and liquidity via Fixed Deposits or low-risk liquid funds. 
              Meanwhile, your <strong>SIP Investment</strong> allocation captures long-term compounding by funneling cash into medium-risk mutual funds. 
              This split dynamically protects small portfolios while aggressively growing larger ones.
            </p>
          </section>

          {/* ── Investment Action Cards ─────────────────────────────────────── */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* Safe Savings */}
            <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10">
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[0_0_30px_rgba(52,211,153,0.1)]" />
              <div className="relative z-10 flex flex-col h-full space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                    <ShieldCheck size={20} className="text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">Safe Savings</h3>
                    <p className="text-xs text-slate-400 mt-1">Low Risk · High Liquidity</p>
                  </div>
                </div>
                
                <p className="text-3xl font-black text-white">{fmt(safeSavings)}</p>
                
                <p className="text-sm text-slate-500 flex-1">
                  Ideal for preserving capital. Put this into Fixed Deposits, recurring deposits, or liquid mutual funds to build your safety net.
                </p>

                <a
                  href="https://groww.in/fixed-deposits"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl px-4 py-3 text-sm font-semibold transition-colors group/btn"
                >
                  <span className="text-white">Invest via Groww</span>
                  <ArrowRight size={16} className="text-emerald-400 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

            {/* SIP Investment */}
            <div className="group relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 transition-all hover:bg-white/10">
              <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none shadow-[0_0_30px_rgba(167,139,250,0.1)]" />
              <div className="relative z-10 flex flex-col h-full space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/15 flex items-center justify-center border border-violet-500/30">
                    <LineChart size={20} className="text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white leading-none">SIP Investment</h3>
                    <p className="text-xs text-slate-400 mt-1">Medium Risk · Wealth Building</p>
                  </div>
                </div>
                
                <p className="text-3xl font-black text-white">{fmt(sipInvestment)}</p>
                
                <p className="text-sm text-slate-500 flex-1">
                  Leverage compounding. Direct this into an Equity or Hybrid Mutual Fund Systematic Investment Plan (SIP).
                </p>

                <a
                  href="https://groww.in/mutual-funds"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${sipInvestment <= 0 ? 'pointer-events-none opacity-50' : ''} mt-auto flex items-center justify-between bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] rounded-xl px-4 py-3 text-sm font-semibold transition-colors group/btn`}
                >
                  <span className="text-white">Invest via Groww</span>
                  <ArrowRight size={16} className="text-violet-400 group-hover/btn:translate-x-1 transition-transform" />
                </a>
              </div>
            </div>

          </section>

          {/* ── Investment Tracker ─────────────────────────────────────────── */}
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-white">Investment Progress</h3>
              <p className="text-sm text-slate-500 mt-1">Keep track of your monthly action plan.</p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className={`text-sm font-bold ${invested ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {invested ? fmt(totalSavings) : '₹0'} <span className="text-slate-500 font-normal">/ {fmt(totalSavings)} invested</span>
                </span>
                <div className="h-1.5 w-32 bg-slate-800 rounded-full mt-1.5 overflow-hidden ml-auto">
                  <div 
                    className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: invested ? '100%' : '0%' }}
                  />
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={invested} 
                  onChange={(e) => setInvested(e.target.checked)} 
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500 shadow-inner"></div>
              </label>
            </div>
          </section>
        </>
      )}

      {/* ── Footer Elements ────────────────────────────────────────────────── */}
      <footer className="pt-8 pb-4 space-y-4">
        <p className="text-xs text-slate-500/80 leading-relaxed text-justify px-2">
          Currently, this platform focuses on building saving discipline and guiding users to invest through trusted platforms like Groww. In the future, we plan to integrate official referral or partner programs with such platforms to sustain the product, ensuring scalability without charging users directly.
        </p>
        <p className="text-[10px] text-slate-600/70 text-center uppercase tracking-widest font-semibold border-t border-slate-800 pt-4">
          This platform does not provide financial advice. Investments are executed via external platforms like Groww. We do not handle user funds.
        </p>
      </footer>

    </div>
  )
}
