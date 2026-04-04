import re

with open('src/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Imports
content = content.replace("import { StreakCounter, EditableSalary } from './SharedUI'", 
"import { motion, AnimatePresence } from 'framer-motion'\nimport { StreakCounter, EditableSalary, AnimatedNumber } from './SharedUI'")

# 2. Add strokeWidth to all Lucide icons
icon_names = ["Wallet", "TrendingDown", "ShoppingCart", "Zap", "Scale", "PiggyBank", 
              "Settings2", "Bus", "MoreHorizontal", "Utensils", "Lightbulb", 
              "PlaneTakeoff", "ArrowDownLeft", "ArrowUpRight", "ShieldAlert", 
              "AlertTriangle", "Trash2", "Pencil", "Plus", "X", "Loader2", 
              "CheckCircle2", "ChevronDown"]

for icon in icon_names:
    content = re.sub(fr'<{icon}([^>]*)>', 
                    lambda m: f'<{icon} strokeWidth={{1.5}}{m.group(1)}>' if 'strokeWidth' not in m.group(1) else m.group(0), 
                    content)

# 3. StatCard
stat_card_new = """function StatCard({ label, children, className = '', glowColor = 'shadow-[0_0_30px_rgba(255,255,255,0.05)]' }) {
  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      className={`relative group bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-3xl p-5 flex flex-col gap-2 transition-all ${className}`}
    >
      <div className={`absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none ${glowColor}`} />
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest leading-none relative z-10">
        {label}
      </p>
      <div className="relative z-10">
        {children}
      </div>
    </motion.div>
  )
}
"""
content = re.sub(r'function StatCard\(\{[^\}]*\}\) \{.*?(?=\n// ─── )', stat_card_new, content, flags=re.DOTALL)

# 4. Background and Stats Render
content = content.replace('<div className="min-h-screen bg-slate-950 text-white">',
"""<div className="min-h-screen relative overflow-hidden bg-[#0A0A1A] text-white selection:bg-emerald-500/30">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0A0A1A] to-[#0A0A1A] -z-20" />
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-violet-600/20 blur-[120px] rounded-full -z-10 mix-blend-screen animate-pulse-slow pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-teal-600/10 blur-[150px] rounded-full -z-10 mix-blend-screen pointer-events-none" />""")

content = content.replace('{fmt(monthly_remaining_budget)}', '<AnimatedNumber value={monthly_remaining_budget} />')
content = content.replace('{fmt(total_spent)}', '<AnimatedNumber value={total_spent} />')
content = content.replace('{fmt(total_savings_all_time)}', '<AnimatedNumber value={total_savings_all_time} />')
content = content.replace('{fmt(daily_safe_limit)}', '<AnimatedNumber value={daily_safe_limit} />')

content = content.replace('<StatCard label="Monthly Budget Left">', '<StatCard label="Monthly Budget Left" glowColor="shadow-[0_0_30px_rgba(52,211,153,0.15)]">')
content = content.replace('<StatCard label="Total Spent">', '<StatCard label="Total Spent" glowColor="shadow-[0_0_30px_rgba(251,113,133,0.15)]">')
content = content.replace('<StatCard label="Total Life Savings">', '<StatCard label="Total Life Savings" glowColor="shadow-[0_0_30px_rgba(34,211,238,0.15)]">')
content = content.replace('className={isOverDSL ? \'border-rose-500/60 shadow-sm shadow-rose-500/10\' : \'\'}', 
  'className={isOverDSL ? \'border-rose-500/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05),0_0_15px_rgba(244,63,94,0.2)]\' : \'\'} glowColor={isOverDSL ? "shadow-[0_0_30px_rgba(244,63,94,0.3)]" : "shadow-[0_0_30px_rgba(56,189,248,0.15)]"}')

# 5. Buttons & Badges
btn_old = """<button
              id="open-add-expense"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-sm rounded-2xl px-4 py-2.5 shadow-lg shadow-emerald-500/30 transition-all"
            >"""
btn_new = """<motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              id="open-add-expense"
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm rounded-2xl px-4 py-2.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all"
            >"""
content = content.replace(btn_old, btn_new)
content = content.replace('</button>\n          </div>\n        </header>', '</motion.button>\n          </div>\n        </header>')

gbtn_old = """<button
        id="goal-mode-selector"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-sm font-semibold rounded-2xl px-3 py-2.5 transition-all disabled:opacity-60"
      >"""
gbtn_new = """<motion.button
        animate={currentMode.key === 'Freestyle' ? { scale: [1, 1.02, 1], boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 15px rgba(251,191,36,0.2)', '0 0 0px rgba(251,191,36,0)'] } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        id="goal-mode-selector"
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-white text-sm font-semibold rounded-2xl px-3 py-2.5 transition-all disabled:opacity-60"
      >"""
content = content.replace(gbtn_old, gbtn_new)
sub = """</button>

      {/* Dropdown */"""
rep = """</motion.button>

      {/* Dropdown */"""
content = content.replace(sub, rep)

link_old = """<Link
              to="/goals"
              className="flex items-center gap-1.5 bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/30 text-violet-400 font-semibold text-sm rounded-2xl px-3 py-2.5 transition-all"
            >"""
link_new = """<Link
              to="/goals"
              className="flex items-center gap-1.5 bg-white/5 hover:bg-violet-500/20 backdrop-blur-md border border-white/10 hover:border-violet-500/30 text-violet-400 font-semibold text-sm rounded-2xl px-3 py-2.5 transition-all shadow-sm"
            >"""
content = content.replace(link_old, link_new)

header_icon_old = """<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">"""
header_icon_new = """<div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.4)] border border-emerald-300/50">"""
content = content.replace(header_icon_old, header_icon_new)

# 6. Transaction Row Animation
trow_old = """  return (
    <div className="flex items-center gap-3 py-3 group">"""
      
trow_new = """  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95, y: -10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
      className="flex items-center gap-3 py-3 group relative transition-all"
    >"""
content = content.replace(trow_old, trow_new)

cat_box_old_1 = """<div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${categoryColor(tx.category)}`}>"""
cat_box_new_1 = """<div className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${categoryColor(tx.category)}`}>"""
content = content.replace(cat_box_old_1, cat_box_new_1)

actions_old = """      {/* Action buttons — appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 shrink-0">
        <button
          id={`edit-tx-${tx.id}`}
          onClick={() => onEdit(tx)}
          title="Edit transaction"
          className="w-7 h-7 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 flex items-center justify-center text-sky-400 transition-colors"
        >"""
        
actions_new = """      {/* Action buttons — appear on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200 shrink-0 absolute right-0 bg-gradient-to-l from-[#0A0A1A] via-[#0A0A1A]/80 to-transparent pl-4 py-1 z-10 w-24 justify-end">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          id={`edit-tx-${tx.id}`}
          onClick={() => onEdit(tx)}
          title="Edit transaction"
          className="w-7 h-7 rounded-xl bg-sky-500/10 hover:bg-sky-500/25 flex items-center justify-center text-sky-400 transition-colors shadow-sm"
        >"""
content = content.replace(actions_old, actions_new)

del_btn_old = """<button
          id={`delete-tx-${tx.id}`}
          onClick={() => onDelete(tx)}
          title="Delete transaction"
          className="w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 flex items-center justify-center text-rose-400 transition-colors"
        >"""
del_btn_new = """<motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          id={`delete-tx-${tx.id}`}
          onClick={() => onDelete(tx)}
          title="Delete transaction"
          className="w-7 h-7 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 flex items-center justify-center text-rose-400 transition-colors shadow-sm"
        >"""
content = content.replace(del_btn_old, del_btn_new)

# Close motion.div instead of div for TransactionRow
close_tags_old = """        </button>
      </div>
    </div>
  )
}"""
close_tags_new = """        </motion.button>
      </div>
    </motion.div>
  )
}"""
content = content.replace(close_tags_old, close_tags_new)

# Add AnimatePresence to Recent list
list_old = """              <div className="divide-y divide-slate-800">
                {recent.map((tx) => (
                  <TransactionRow"""
list_new = """              <div className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {recent.map((tx) => (
                    <TransactionRow"""
content = content.replace(list_old, list_new)
content = content.replace('/>\n                ))}\n              </div>', '/>\n                  ))}\n                </AnimatePresence>\n              </div>')


# Pilot Insight & Recent Box Glass effects
insight_old = """<div className="bg-slate-900 border border-slate-800 rounded-3xl px-6 py-5 flex items-start gap-4">"""
insight_new = """<div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-3xl px-6 py-5 flex items-start gap-4 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow">"""
content = content.replace(insight_old, insight_new)

recent_old = """<div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">"""
recent_new = """<div className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)] rounded-3xl p-6 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] transition-shadow relative overflow-hidden">"""
content = content.replace(recent_old, recent_new)

for_modals = """<div className="relative w-full max-w-sm mx-4 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl p-6 space-y-5">"""
content = content.replace("""<div className="relative w-full max-w-sm mx-4 bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-5">""", for_modals)

for_modals2 = """<div className="relative w-full sm:max-w-md bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-t-3xl sm:rounded-3xl p-6 pb-8 space-y-5">"""
content = content.replace("""<div className="relative w-full sm:max-w-md bg-slate-900 border border-slate-700 rounded-t-3xl sm:rounded-3xl shadow-2xl p-6 pb-8 space-y-5">""", for_modals2)

for_modals3 = """<div className="relative w-full max-w-sm bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-3xl p-6 space-y-4">"""
content = content.replace("""<div className="relative w-full max-w-sm bg-slate-900 border border-slate-700 rounded-3xl shadow-2xl p-6 space-y-4">""", for_modals3)

content = content.replace('<div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" />', '<div className="absolute inset-0 bg-[#0A0A1A]/80 backdrop-blur-sm" />')

with open('src/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
