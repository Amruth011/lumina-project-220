import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Mic, MessageSquare, Star, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { VaultItem } from "@/types/jd";

interface StarEntry {
  situation: string;
  task: string;
  action: string;
  result: string;
  category: string;
  id?: string;
}

export function InterviewPrep() {
  const { user } = useAuth();
  const [stars, setStars] = useState<StarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StarEntry>({ situation: "", task: "", action: "", result: "", category: "" });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    supabase
      .from("vault_items")
      .select("*")
      .eq("user_id", user.id)
      .eq("type", "star")
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setStars((data as VaultItem[]).map((item) => ({
            situation: item.description?.match(/Situation:\s*(.*?)(?:\n|$)/)?.[1] || item.description || "",
            task: "",
            action: "",
            result: "",
            category: item.title || "",
            id: item.id,
          })));
        }
        setLoading(false);
      });
  }, [user]);

  const handleAdd = async () => {
    if (!form.situation || !form.task || !form.action || !form.result) return;
    if (!user) { toast.error("Sign in required"); return; }
    setSaving(true);
    const description = `Situation: ${form.situation}\nTask: ${form.task}\nAction: ${form.action}\nResult: ${form.result}`;
    const { data, error } = await supabase.from("vault_items").insert({
      user_id: user.id,
      type: "star",
      title: form.category || "STAR Story",
      description,
      organization: "",
      period: "",
      bullets: [],
      skills: [],
    }).select().single();
    if (error) { toast.error("Failed to save STAR story"); setSaving(false); return; }
    setStars((prev) => [...prev, { ...form, id: (data as VaultItem).id }]);
    setForm({ situation: "", task: "", action: "", result: "", category: "" });
    setShowForm(false);
    setSaving(false);
    toast.success("STAR story saved to vault");
  };

  const handleDelete = async (id: string) => {
    await supabase.from("vault_items").delete().eq("id", id);
    setStars((prev) => prev.filter((s) => s.id !== id));
    toast.success("STAR story removed");
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

      {loading && (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 size={20} className="animate-spin text-muted-foreground" />
        </div>
      )}

      {!loading && showForm && (
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
            <button onClick={handleAdd} disabled={saving} className="px-4 py-2 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-1.5 disabled:opacity-50">
              {saving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} />}
              Save Story
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg bg-white/5 text-muted-foreground text-[9px] font-bold hover:bg-white/10 transition-all">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {!loading && stars.length === 0 && !showForm && (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <MessageSquare size={32} className="mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-xs text-muted-foreground">No STAR stories yet. Add your first one.</p>
        </div>
      )}

      {!loading && (
        <div className="space-y-2">
          {stars.map((entry, i) => (
            <motion.div
              key={entry.id || i}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-background/40 p-4 space-y-2"
            >
              <div className="flex items-center justify-between">
                {entry.category && (
                  <span className="text-[8px] font-black uppercase tracking-widest text-primary">{entry.category}</span>
                )}
                {entry.id && (
                  <button
                    onClick={() => handleDelete(entry.id!)}
                    className="text-[9px] text-red-400 hover:text-red-300 font-bold transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-[10px]">
                <div><span className="font-bold text-foreground">S:</span> {entry.situation}</div>
                <div><span className="font-bold text-foreground">T:</span> {entry.task}</div>
                <div><span className="font-bold text-foreground">A:</span> {entry.action}</div>
                <div><span className="font-bold text-foreground">R:</span> {entry.result}</div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
