import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import { Flame, Pencil, Loader2 } from 'lucide-react'
import { motion, useSpring, AnimatePresence } from 'framer-motion'

const fmt = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val ?? 0)

export function AnimatedNumber({ value }) {
  const animatedValue = useSpring(0, { stiffness: 60, damping: 15, mass: 1 })
  const ref = useRef(null)

  useEffect(() => {
    animatedValue.set(value)
  }, [value, animatedValue])

  useEffect(() => {
    return animatedValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
          maximumFractionDigits: 0,
        }).format(Math.round(latest));
      }
    })
  }, [animatedValue])

  return <span ref={ref}>{fmt(value)}</span>
}

export function StreakCounter({ streak }) {
  const isHot = streak > 0;
  return (
    <div 
      className={`relative flex items-center justify-center gap-1.5 px-3 py-2 rounded-2xl border transition-all ${
        isHot 
          ? 'bg-orange-500/15 border-orange-500/30 text-orange-500 shadow-[inset_0_1px_1px_rgba(255,165,0,0.2)]' 
          : 'bg-white/5 border-white/10 text-slate-500 backdrop-blur-xl'
      }`}
      title="Current Savings Streak"
    >
      {isHot && (
        <motion.div 
          className="absolute inset-0 rounded-2xl pointer-events-none"
          animate={{ boxShadow: ['0px 0px 0px rgba(249,115,22,0.4)', '0px 0px 20px rgba(249,115,22,0.1)', '0px 0px 0px rgba(249,115,22,0.4)'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      <Flame strokeWidth={1.5} size={16} className={isHot ? "fill-orange-500/30 text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] z-10 relative" : "text-slate-500"} />
      <span className="text-sm font-bold z-10 relative">{streak}</span>
    </div>
  )
}

export function EditableSalary({ salary, onUpdateSuccess }) {
  const [isEditing, setIsEditing] = useState(false)
  const [val, setVal] = useState(salary || '')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  useEffect(() => {
    if (!isEditing) setVal(salary || '')
  }, [salary, isEditing])

  const submit = async () => {
    if (saving) return
    const num = parseFloat(val)
    if (isNaN(num) || num <= 0) {
      setIsEditing(false)
      setVal(salary)
      return
    }
    
    if (num === parseFloat(salary)) {
      setIsEditing(false)
      return
    }

    setSaving(true)
    try {
      await axios.patch('http://127.0.0.1:8000/api/profile/update-salary/', { monthly_salary: num })
      if (onUpdateSuccess) onUpdateSuccess()
    } catch(e) {
      console.error("Failed to update salary", e)
      setVal(salary)
    } finally {
      setSaving(false)
      setIsEditing(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') {
      setIsEditing(false)
      setVal(salary)
    }
  }

  return (
    <div className="h-6 flex items-center mt-0.5">
      <AnimatePresence mode="wait">
        {isEditing ? (
          <motion.div 
            key="editing"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="flex items-center gap-2 relative overflow-hidden"
          >
            <span className="text-xs font-semibold text-slate-400 uppercase shrink-0">Salary: ₹</span>
            <input 
              ref={inputRef}
              type="number" 
              value={val} 
              onChange={e => setVal(e.target.value)}
              onBlur={submit}
              onKeyDown={handleKeyDown}
              disabled={saving}
              className="bg-slate-800/80 backdrop-blur border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)] rounded-lg text-xs px-2 py-0.5 text-white outline-none w-24 transition-all focus:border-emerald-400 focus:shadow-[0_0_15px_rgba(16,185,129,0.4)]"
            />
            {saving && <Loader2 strokeWidth={1.5} size={12} className="animate-spin text-emerald-400 shrink-0" />}
          </motion.div>
        ) : (
          <motion.div 
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 group cursor-pointer w-fit" 
            onClick={() => { setIsEditing(true); setVal(salary) }}
            title="Edit Salary"
          >
            <span className="text-xs text-slate-400">
              Salary: <span className="text-white font-semibold"><AnimatedNumber value={salary} /></span>
            </span>
            <button className="w-5 h-5 rounded-md hover:bg-white/10 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-all opacity-0 group-hover:opacity-100 backdrop-blur-sm">
              <Pencil strokeWidth={1.5} size={11} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
