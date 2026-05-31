import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MessageSquare, Star, Loader2 } from "lucide-react";

interface StarEntry {
  situation: string;
  task: string;
  action: string;
  result: string;
  category: string;
}

export function InterviewPrep() {
  const [stars, setStars] = useState<StarEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StarEntry>({ situation: "", task: "", action: "", result: "", category: "" });

  const handleAdd = () => {
    if (!form.situation || !form.task || !form.action || !form.result) return;
    setStars((prev) => [...prev, { ...form }]);
    setForm({ situation: "", task: "", action: "", result: "", category: "" });
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <Mic size={14} /> Interview Prep
          </h2>
          <p className="text-[10px] text-muted-foreground">Build your STAR story bank & practice with AI</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-1.5"
        >
          <Star size={12} /> Add STAR Story
        </button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-3"
        >
          <input
            placeholder="Category (e.g. Leadership, Conflict Resolution)"
            className="w-full bg-background/60 border border-border/40 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 ring-emerald-500/30"
            value={form.category}
            onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
          />
          <textarea
            placeholder="Situation — Describe the context..."
            className="w-full bg-background/60 border border-border/40 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 ring-emerald-500/30 resize-none h-16"
            value={form.situation}
            onChange={(e) => setForm((p) => ({ ...p, situation: e.target.value }))}
          />
          <textarea
            placeholder="Task — What was your responsibility?"
            className="w-full bg-background/60 border border-border/40 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 ring-emerald-500/30 resize-none h-16"
            value={form.task}
            onChange={(e) => setForm((p) => ({ ...p, task: e.target.value }))}
          />
          <textarea
            placeholder="Action — What did you do specifically?"
            className="w-full bg-background/60 border border-border/40 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 ring-emerald-500/30 resize-none h-16"
            value={form.action}
            onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
          />
          <textarea
            placeholder="Result — What was the outcome?"
            className="w-full bg-background/60 border border-border/40 rounded-xl px-4 py-2 text-xs outline-none focus:ring-2 ring-emerald-500/30 resize-none h-16"
            value={form.result}
            onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}
          />
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all">
              Save Story
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-muted-foreground text-[9px] font-bold hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {stars.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <MessageSquare size={32} className="mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-xs text-muted-foreground">No STAR stories yet. Add your first one.</p>
        </div>
      )}

      <div className="space-y-2">
        {stars.map((entry, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-background/40 p-4 space-y-2"
          >
            {entry.category && (
              <span className="text-[8px] font-black uppercase tracking-widest text-primary">{entry.category}</span>
            )}
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div><span className="font-bold text-foreground">S:</span> {entry.situation}</div>
              <div><span className="font-bold text-foreground">T:</span> {entry.task}</div>
              <div><span className="font-bold text-foreground">A:</span> {entry.action}</div>
              <div><span className="font-bold text-foreground">R:</span> {entry.result}</div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
