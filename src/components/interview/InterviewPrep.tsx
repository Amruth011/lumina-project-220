import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MessageSquare, 
  Star, 
  Loader2, 
  Save, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  BrainCircuit, 
  Trophy, 
  Sparkles, 
  BookOpen, 
  Award, 
  Zap, 
  Send, 
  ChevronDown, 
  ChevronUp, 
  RefreshCw, 
  Play,
  CheckCircle2,
  Info
} from "lucide-react";
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

interface ChatMessage {
  role: "interviewer" | "candidate" | "coach_feedback";
  text: string;
  feedback?: {
    situation_task_feedback: string;
    action_feedback: string;
    result_feedback: string;
    overall_score: number;
    suggestions: string[];
  };
}

export function InterviewPrep() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"bank" | "coach" | "resources">("bank");
  const [stars, setStars] = useState<StarEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [polishingId, setPolishingId] = useState<string | null>(null);
  
  // Form states
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<StarEntry>({ situation: "", task: "", action: "", result: "", category: "" });
  const [draftingAI, setDraftingAI] = useState(false);
  const [rawDraftText, setRawDraftText] = useState("");
  const [showRawDraft, setShowRawDraft] = useState(false);

  // Copied states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Expanded stories
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);

  // Coach states
  const [interviewActive, setInterviewActive] = useState(false);
  const [targetRole, setTargetRole] = useState(() => localStorage.getItem("lumina_last_jd_title") || "Software Engineer");
  const [selectedStarId, setSelectedStarId] = useState<string>("none");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [candidateResponse, setCandidateResponse] = useState("");
  const [evaluating, setEvaluating] = useState(false);
  const [evalStep, setEvalStep] = useState("");

  // Load STAR stories with robust parsing
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
          setStars((data as VaultItem[]).map((item) => {
            const desc = item.description || "";
            // Robust multi-line matching
            const situation = desc.match(/Situation:\s*([\s\S]*?)(?:\nTask:|$)/)?.[1]?.trim() || desc;
            const task = desc.match(/Task:\s*([\s\S]*?)(?:\nAction:|$)/)?.[1]?.trim() || "";
            const action = desc.match(/Action:\s*([\s\S]*?)(?:\nResult:|$)/)?.[1]?.trim() || "";
            const result = desc.match(/Result:\s*([\s\S]*?)$/)?.[1]?.trim() || "";
            
            return {
              situation,
              task,
              action,
              result,
              category: item.title || "STAR Story",
              id: item.id,
            };
          }));
        }
        setLoading(false);
      });
  }, [user]);

  // Copy helper
  const handleCopyStory = (entry: StarEntry) => {
    const formatted = `[STAR Story: ${entry.category}]\n\nSITUATION:\n${entry.situation}\n\nTASK:\n${entry.task}\n\nACTION:\n${entry.action}\n\nRESULT:\n${entry.result}`;
    navigator.clipboard.writeText(formatted).then(() => {
      setCopiedId(entry.id || "temp");
      toast.success("STAR story copied in full format");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Add STAR story to database
  const handleAdd = async () => {
    if (!form.situation || !form.task || !form.action || !form.result) {
      toast.error("All STAR fields are required.");
      return;
    }
    if (!user) { toast.error("Authentication required"); return; }
    setSaving(true);
    
    const description = `Situation: ${form.situation.trim()}\nTask: ${form.task.trim()}\nAction: ${form.action.trim()}\nResult: ${form.result.trim()}`;
    
    try {
      const { data, error } = await supabase.from("vault_items").insert({
        user_id: user.id,
        type: "star",
        title: form.category.trim() || "STAR Story",
        description,
        organization: "",
        period: "",
        bullets: [],
        skills: [],
      }).select().single();

      if (error) throw error;
      
      const newEntry = { ...form, id: (data as VaultItem).id };
      setStars((prev) => [newEntry, ...prev]);
      setForm({ situation: "", task: "", action: "", result: "", category: "" });
      setShowForm(false);
      setShowRawDraft(false);
      setRawDraftText("");
      toast.success("STAR story saved to your profile vault");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save STAR story");
    } finally {
      setSaving(false);
    }
  };

  // Delete STAR story
  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("vault_items").delete().eq("id", id);
      if (error) throw error;
      setStars((prev) => prev.filter((s) => s.id !== id));
      toast.success("STAR story deleted");
      if (expandedStoryId === id) setExpandedStoryId(null);
    } catch (err) {
      console.error(err);
      toast.error("Failed to delete story");
    }
  };

  // AI Draft generator
  const handleAIDraft = async () => {
    if (!rawDraftText.trim()) {
      toast.error("Please enter some raw details first.");
      return;
    }
    setDraftingAI(true);
    const toastId = toast.loading("AI is structuring your experience into a STAR loop...");
    
    try {
      const systemPrompt = `You are an elite Tech Career Coach. Translate the user's raw experience details into a highly structured, impactful, and metric-driven STAR (Situation, Task, Action, Result) format.
Return ONLY a valid JSON object matching this exact schema:
{
  "category": "High level skill/competency (e.g. System Scaling, Conflict Resolution, Technical Leadership)",
  "situation": "Clean context of the problem, tech stack, and scenario",
  "task": "Specific responsibility or direct challenge expected of the candidate",
  "action": "Detailed steps the candidate took, using strong action verbs (spearheaded, architected, optimized)",
  "result": "Quantified result showing measurable business impact (suggest placeholders with metrics if not provided)"
}`;

      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Raw experience details:\n${rawDraftText}` }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        }
      });

      if (error || !data) throw new Error("AI analysis failed.");

      const responseText = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(responseText);

      setForm({
        category: parsed.category || "STAR Story",
        situation: parsed.situation || "",
        task: parsed.task || "",
        action: parsed.action || "",
        result: parsed.result || ""
      });
      
      toast.success("Structured STAR loop ready for review!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("AI drafting failed. Please fill it manually.", { id: toastId });
    } finally {
      setDraftingAI(false);
    }
  };

  // AI story polisher
  const handleAIPolish = async (entry: StarEntry) => {
    if (!entry.id) return;
    setPolishingId(entry.id);
    const toastId = toast.loading(`AI is polishing "${entry.category}" metrics and action verbs...`);

    try {
      const systemPrompt = `You are a staff resume writer and executive recruiter. Optimize the given STAR story parts to be highly impactful, punchy, and professional. Inject strong action verbs and structure metrics clearly.
Return ONLY a valid JSON object matching this exact schema:
{
  "category": "string (revised category)",
  "situation": "string",
  "task": "string",
  "action": "string",
  "result": "string"
}`;

      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Category: ${entry.category}\nSituation: ${entry.situation}\nTask: ${entry.task}\nAction: ${entry.action}\nResult: ${entry.result}` }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        }
      });

      if (error || !data) throw new Error("AI polishing failed.");

      const responseText = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(responseText);

      // Save back to DB
      const updatedDescription = `Situation: ${parsed.situation.trim()}\nTask: ${parsed.task.trim()}\nAction: ${parsed.action.trim()}\nResult: ${parsed.result.trim()}`;
      
      const { error: saveError } = await supabase
        .from("vault_items")
        .update({ 
          title: parsed.category.trim(), 
          description: updatedDescription 
        })
        .eq("id", entry.id);

      if (saveError) throw saveError;

      setStars((prev) => prev.map((s) => s.id === entry.id ? {
        category: parsed.category,
        situation: parsed.situation,
        task: parsed.task,
        action: parsed.action,
        result: parsed.result,
        id: entry.id
      } : s));

      toast.success("STAR story optimized and updated!", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("Failed to polish story.", { id: toastId });
    } finally {
      setPolishingId(null);
    }
  };

  // Launch AI mock coach
  const startCoachInterview = async () => {
    setInterviewActive(true);
    setEvaluating(true);
    setEvalStep("Analyzing profile and generating question...");
    
    let starContextPrompt = "";
    if (selectedStarId !== "none") {
      const selected = stars.find(s => s.id === selectedStarId);
      if (selected) {
        starContextPrompt = `\nFocus specifically on checking the candidate's proficiency related to this project experience:\n- Category: ${selected.category}\n- Situation: ${selected.situation}\n- Actions: ${selected.action}\n- Results: ${selected.result}`;
      }
    }

    try {
      const systemPrompt = `You are a Senior Recruiter conducting a behavioral mock interview for the role: "${targetRole}".${starContextPrompt}
Ask ONE highly relevant, focused behavioral interview question to probe the candidate. Keep the question professional and under 40 words. Do not give greetings or explanations.`;

      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          messages: [
            { role: "system", content: systemPrompt }
          ],
          temperature: 0.7,
          max_tokens: 150
        }
      });

      if (error || !data) throw new Error("Mock recruiter offline.");

      const question = data.choices?.[0]?.message?.content?.trim() || "Can you describe a complex project you led and how you handled team hurdles?";
      
      setCurrentQuestion(question);
      setChatHistory([
        { role: "interviewer", text: question }
      ]);
    } catch (err) {
      console.error(err);
      const fallbackQ = "Describe a situation where you had to adapt to a major change in project requirements. How did you manage it?";
      setCurrentQuestion(fallbackQ);
      setChatHistory([
        { role: "interviewer", text: fallbackQ }
      ]);
    } finally {
      setEvaluating(false);
      setEvalStep("");
    }
  };

  // Submit candidate answer to AI Coach
  const submitCandidateAnswer = async () => {
    if (!candidateResponse.trim()) return;
    
    const candidateText = candidateResponse.trim();
    setEvaluating(true);
    setCandidateResponse("");

    const updatedHistory: ChatMessage[] = [
      ...chatHistory,
      { role: "candidate", text: candidateText }
    ];
    setChatHistory(updatedHistory);
    
    // Set loading prompts
    setEvalStep("Recruiter is evaluating metrics...");
    setTimeout(() => setEvalStep("Analyzing Situation & Task clarity..."), 1500);
    setTimeout(() => setEvalStep("Evaluating Action verbs & Result business impact..."), 3000);

    try {
      const systemPrompt = `You are an Interview Coach reviewing the candidate's answer for a "${targetRole}" interview.
Review the candidate's answer against the STAR method (Situation, Task, Action, Result).
Question asked: "${currentQuestion}"
Candidate's response: "${candidateText}"

Provide detailed constructive feedback and a score out of 10. Also provide a new behavioral follow-up question.
Return ONLY a valid JSON object matching this exact schema:
{
  "situation_task_feedback": "Critique of the context setup and clarity of task (max 30 words)",
  "action_feedback": "Critique of candidate's specific actions, depth, and verbs (max 45 words)",
  "result_feedback": "Critique of outcomes and presence of quantitative business metrics (max 45 words)",
  "overall_score": number (integer between 1 and 10),
  "suggestions": ["specific tip 1", "specific tip 2"],
  "next_followup_question": "Next focused follow-up question to push for more detail or transition (max 40 words)"
}`;

      const { data, error } = await supabase.functions.invoke("analyze", {
        body: {
          messages: [
            { role: "system", content: systemPrompt }
          ],
          temperature: 0.4,
          response_format: { type: "json_object" }
        }
      });

      if (error || !data) throw new Error("Recruiter analysis timed out.");

      const content = data.choices?.[0]?.message?.content;
      const parsed = JSON.parse(content);

      setChatHistory([
        ...updatedHistory,
        {
          role: "coach_feedback",
          text: `Score: ${parsed.overall_score}/10`,
          feedback: {
            situation_task_feedback: parsed.situation_task_feedback,
            action_feedback: parsed.action_feedback,
            result_feedback: parsed.result_feedback,
            overall_score: parsed.overall_score,
            suggestions: parsed.suggestions
          }
        },
        {
          role: "interviewer",
          text: parsed.next_followup_question
        }
      ]);
      setCurrentQuestion(parsed.next_followup_question);
    } catch (err) {
      console.error(err);
      toast.error("Feedback generation failed. Resuming interview.");
      const nextQ = "Can you expand on how you measured the success of this project?";
      setChatHistory([
        ...updatedHistory,
        {
          role: "coach_feedback",
          text: "System offline. Feedback unavailable.",
          feedback: {
            situation_task_feedback: "Critique offline.",
            action_feedback: "Critique offline.",
            result_feedback: "Critique offline.",
            overall_score: 7,
            suggestions: ["Be sure to quantify your actions with business metrics.", "Focus more on individual contribution."]
          }
        },
        {
          role: "interviewer",
          text: nextQ
        }
      ]);
      setCurrentQuestion(nextQ);
    } finally {
      setEvaluating(false);
      setEvalStep("");
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Premium Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-display font-black tracking-tight text-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-lumina-teal/10 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal shadow-md shadow-emerald-500/5">
              <Mic size={20} className="animate-pulse" />
            </div>
            Lumina Interview Coach
          </h2>
          <p className="text-[12px] text-slate-500 max-w-xl">
            Build a bulletproof STAR story bank, polish metrics automatically with AI, simulate full mock recruiter cycles, and access curated guides.
          </p>
        </div>

        {/* Tab Selection */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/50 self-start shrink-0">
          {[
            { id: "bank", icon: Star, label: "STAR Vault" },
            { id: "coach", icon: BrainCircuit, label: "AI Coach" },
            { id: "resources", icon: BookOpen, label: "Prep Resources" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as "bank" | "coach" | "resources");
                if (tab.id !== "coach") {
                  setInterviewActive(false);
                  setChatHistory([]);
                }
              }}
              className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[10px] uppercase font-black tracking-widest transition-all ${
                activeTab === tab.id 
                  ? "bg-white text-lumina-teal border border-slate-200/40 shadow-sm" 
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <tab.icon size={12} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── TAB 1: STAR BANK ── */}
      {activeTab === "bank" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-display font-black uppercase tracking-wider text-slate-700">Your STAR Database ({stars.length})</h3>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="group flex items-center gap-2 px-5 py-3 rounded-full bg-lumina-teal text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
              >
                <Plus size={14} /> Add STAR Story
              </button>
            )}
          </div>

          {/* Form container */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="p-6 md:p-8 rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100/50 space-y-6 relative overflow-hidden"
              >
                {/* Glow border */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-lumina-teal via-indigo-500 to-violet-500" />
                
                <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <Star className="text-lumina-teal w-5 h-5 animate-pulse" />
                    <span className="text-xs font-display font-bold text-slate-800">S.T.A.R Framework Builder</span>
                  </div>
                  <button
                    onClick={() => {
                      setShowRawDraft(!showRawDraft);
                    }}
                    className="text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:underline flex items-center gap-1"
                  >
                    <Sparkles size={11} /> {showRawDraft ? "Form Input" : "Draft with AI Assistant"}
                  </button>
                </div>

                {showRawDraft ? (
                  /* AI Raw Input Draft Area */
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 flex gap-3 items-start">
                      <Info size={14} className="text-indigo-600 mt-0.5 shrink-0" />
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Type whatever raw project details or bullet points you remember. The AI will analyze the facts and structure them into the formal Situation, Task, Action, and Result formats with improved formatting and verbs.
                      </p>
                    </div>

                    <textarea
                      placeholder="e.g. I had to migrate our database last month because the client complaints were rising due to latency. I used a replica to do a zero-downtime cutover and scaled up the CPU, which dropped latency by 50%."
                      className="w-full bg-slate-50/50 border-2 border-slate-200 focus:border-indigo-500 rounded-2xl px-5 py-4 text-xs outline-none transition-colors h-32 resize-none text-slate-800 placeholder-slate-400 font-sans"
                      value={rawDraftText}
                      onChange={(e) => setRawDraftText(e.target.value)}
                    />

                    <div className="flex gap-3 justify-end pt-2">
                      <button 
                        onClick={() => setShowRawDraft(false)}
                        className="px-5 py-3 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAIDraft}
                        disabled={draftingAI || !rawDraftText.trim()}
                        className="flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase tracking-wider hover:bg-indigo-500 disabled:opacity-50 shadow-md shadow-indigo-600/10"
                      >
                        {draftingAI ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                        Draft Story Loop
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Form Grid */
                  <div className="space-y-5">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">Story Category / Competency</label>
                      <input
                        placeholder="e.g., Database Migration, System Scaling, Cross-team Conflict"
                        className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4 py-3 text-xs outline-none transition-colors text-slate-700 font-bold"
                        value={form.category}
                        onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Situation (S)</label>
                          <span className="text-[9px] text-slate-400 italic">Context & Scenario</span>
                        </div>
                        <textarea
                          placeholder="What was the problem, environment, tech stack, and timeline?"
                          className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4 py-3 text-xs outline-none transition-colors h-24 resize-none text-slate-700"
                          value={form.situation}
                          onChange={(e) => setForm((p) => ({ ...p, situation: e.target.value }))}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Task (T)</label>
                          <span className="text-[9px] text-slate-400 italic">Direct Challenge</span>
                        </div>
                        <textarea
                          placeholder="What was your direct responsibility or objective?"
                          className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4 py-3 text-xs outline-none transition-colors h-24 resize-none text-slate-700"
                          value={form.task}
                          onChange={(e) => setForm((p) => ({ ...p, task: e.target.value }))}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Action (A)</label>
                          <span className="text-[9px] text-slate-400 italic">Technical execution</span>
                        </div>
                        <textarea
                          placeholder="What specific tools did you use and steps did you take?"
                          className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4 py-3 text-xs outline-none transition-colors h-24 resize-none text-slate-700"
                          value={form.action}
                          onChange={(e) => setForm((p) => ({ ...p, action: e.target.value }))}
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-baseline mb-2">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Result (R)</label>
                          <span className="text-[9px] text-slate-400 italic">Business metrics</span>
                        </div>
                        <textarea
                          placeholder="What was the business outcome? Add metrics (%/$) if possible."
                          className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4 py-3 text-xs outline-none transition-colors h-24 resize-none text-slate-700"
                          value={form.result}
                          onChange={(e) => setForm((p) => ({ ...p, result: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-2 border-t border-slate-100">
                      <button 
                        onClick={() => setShowForm(false)} 
                        className="px-5 py-3 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleAdd} 
                        disabled={saving} 
                        className="px-6 py-3 rounded-full bg-lumina-teal text-white text-[10px] font-black uppercase tracking-widest hover:bg-lumina-teal/90 hover:scale-102 transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                        Save Story Loop
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Load indicator */}
          {loading && (
            <div className="flex items-center justify-center min-h-[300px] border border-slate-100 rounded-[2.5rem] bg-white">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 size={32} className="animate-spin text-lumina-teal" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading STAR bank</p>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && stars.length === 0 && !showForm && (
            <div className="rounded-[2.5rem] border-2 border-dashed border-slate-200 p-16 text-center bg-white">
              <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
                <Star size={20} className="opacity-50" />
              </div>
              <h4 className="text-sm font-display font-bold text-slate-700 mb-1">Your Story Vault is Empty</h4>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-relaxed mb-6">
                STAR (Situation, Task, Action, Result) stories are the single most effective way to crush behavioral interviews. Add your first story below.
              </p>
              <button 
                onClick={() => setShowForm(true)} 
                className="px-6 py-3.5 rounded-full bg-lumina-teal text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
              >
                Construct STAR Story
              </button>
            </div>
          )}

          {/* Stories bank list */}
          {!loading && stars.length > 0 && (
            <div className="space-y-4">
              {stars.map((entry, index) => {
                const isExpanded = expandedStoryId === entry.id;
                const isPolishing = polishingId === entry.id;
                
                return (
                  <motion.div
                    key={entry.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`bg-white border rounded-[2rem] overflow-hidden transition-all duration-300 ${
                      isExpanded ? "border-lumina-teal shadow-lg shadow-emerald-500/5" : "border-slate-100 hover:border-slate-200 shadow-[0_4px_20px_rgba(0,0,0,0.01)]"
                    }`}
                  >
                    {/* Header Row */}
                    <div 
                      onClick={() => setExpandedStoryId(isExpanded ? null : (entry.id || null))}
                      className="flex items-center justify-between p-5 md:p-6 text-left cursor-pointer w-full select-none"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${
                          isExpanded ? "bg-lumina-teal/10 border-lumina-teal/20 text-lumina-teal" : "bg-slate-50 border-slate-100 text-slate-400"
                        }`}>
                          <Star size={14} className={isExpanded ? "stroke-[2.5px]" : ""} />
                        </div>
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-0.5">Competency</span>
                          <span className="text-sm font-display font-black text-slate-700 tracking-tight">{entry.category}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleCopyStory(entry)}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
                          title="Copy Full Story"
                        >
                          {copiedId === entry.id ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                        </button>
                        
                        <button
                          onClick={() => handleAIPolish(entry)}
                          disabled={isPolishing}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 text-indigo-500 hover:text-indigo-700 transition-all disabled:opacity-50"
                          title="AI Optimize Story"
                        >
                          {isPolishing ? <Loader2 size={14} className="animate-spin text-indigo-500" /> : <Sparkles size={14} />}
                        </button>

                        <button
                          onClick={() => handleDelete(entry.id!)}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-100/50 text-rose-500 hover:text-rose-700 transition-colors"
                          title="Delete Story"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="w-[1px] h-6 bg-slate-100 mx-1" />

                        <button
                          onClick={() => setExpandedStoryId(isExpanded ? null : (entry.id || null))}
                          className="flex items-center justify-center w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-100 text-slate-400 transition-colors"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expandable Body */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-slate-100 bg-slate-50/50 overflow-hidden"
                        >
                          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                            
                            {/* Situation */}
                            <div className="space-y-1.5 p-5 rounded-2xl border border-slate-100 bg-white relative">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-5 h-5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[10px] font-black flex items-center justify-center text-indigo-600">S</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Situation</span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-slate-600 font-sans">
                                {entry.situation}
                              </p>
                            </div>

                            {/* Task */}
                            <div className="space-y-1.5 p-5 rounded-2xl border border-slate-100 bg-white relative">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-5 h-5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[10px] font-black flex items-center justify-center text-amber-600">T</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Task</span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-slate-600 font-sans">
                                {entry.task || <span className="text-slate-400 italic">No Task specified. Click AI Polish to structure it automatically.</span>}
                              </p>
                            </div>

                            {/* Action */}
                            <div className="space-y-1.5 p-5 rounded-2xl border border-slate-100 bg-white relative">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black flex items-center justify-center text-emerald-600">A</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Action</span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-slate-600 font-sans">
                                {entry.action || <span className="text-slate-400 italic">No Action specified. Click AI Polish to structure it.</span>}
                              </p>
                            </div>

                            {/* Result */}
                            <div className="space-y-1.5 p-5 rounded-2xl border border-slate-100 bg-white relative">
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className="w-5 h-5 rounded-md bg-lumina-teal/10 border border-lumina-teal/20 text-[10px] font-black flex items-center justify-center text-lumina-teal">R</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Result</span>
                              </div>
                              <p className="text-[12px] leading-relaxed text-slate-600 font-sans">
                                {entry.result || <span className="text-slate-400 italic">No Result specified. Click AI Polish to structure metrics.</span>}
                              </p>
                            </div>

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: AI COACH SIMULATOR ── */}
      {activeTab === "coach" && (
        <div className="space-y-6">
          {!interviewActive ? (
            /* Mock Setup Screen */
            <div className="max-w-xl mx-auto p-8 border border-slate-100 rounded-[2.5rem] bg-white shadow-xl shadow-slate-100/30 space-y-6 relative overflow-hidden">
              <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-lumina-teal/5 rounded-full blur-[100px]" />
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-indigo-500/5 rounded-full blur-[100px]" />
              </div>

              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-lumina-teal/5 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal">
                  <BrainCircuit size={22} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-slate-800">Launch Mock Recruiter Simulator</h3>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Guided simulation against real recruiters</p>
                </div>
              </div>

              <div className="space-y-5 relative z-10 mt-6">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Target Interview Role</label>
                  <input
                    placeholder="e.g. Senior Frontend Developer, Machine Learning Engineer"
                    className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4.5 py-3 text-xs outline-none transition-colors text-slate-700 font-bold"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">Focus Project (STAR Story)</label>
                  <select
                    className="w-full bg-slate-50 border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-xl px-4.5 py-3.5 text-xs outline-none transition-colors text-slate-700 font-semibold cursor-pointer"
                    value={selectedStarId}
                    onChange={(e) => setSelectedStarId(e.target.value)}
                  >
                    <option value="none">General Behavioral (Top Competencies)</option>
                    {stars.map((s) => (
                      <option key={s.id} value={s.id}>{s.category}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 italic mt-1.5">
                    Selecting a specific STAR story directs the AI coach to ask situational questions tailored to probe that project's metrics.
                  </p>
                </div>

                <div className="pt-4 flex justify-center">
                  <button
                    onClick={startCoachInterview}
                    className="group flex items-center gap-3 px-12 py-5 rounded-full bg-lumina-teal text-white text-[11px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-emerald-500/20"
                  >
                    Start Coach Simulation <Play size={12} className="fill-white" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* Simulation Active: Chat Console */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-5xl mx-auto">
              
              {/* Chat Console (8 columns) */}
              <div className="lg:col-span-8 flex flex-col h-[580px] bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/20 overflow-hidden">
                {/* Console header */}
                <div className="px-6 py-4.5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                    <span className="text-[11px] font-bold text-slate-600 font-mono ml-2 uppercase tracking-wider">Coach-Simulation.sh</span>
                  </div>
                  <button
                    onClick={() => {
                      setInterviewActive(false);
                      setChatHistory([]);
                    }}
                    className="text-[9px] font-black uppercase tracking-wider text-rose-500 border border-rose-200/50 px-3 py-1 rounded-full bg-rose-50 hover:bg-rose-100 transition-colors"
                  >
                    End Simulation
                  </button>
                </div>

                {/* Conversation Box */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  {chatHistory.map((msg, index) => {
                    const isCandidate = msg.role === "candidate";
                    const isFeedback = msg.role === "coach_feedback";
                    
                    if (isFeedback) {
                      const fb = msg.feedback;
                      if (!fb) return null;
                      
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="rounded-[2rem] border border-violet-200 bg-gradient-to-br from-violet-50/60 to-indigo-50/30 p-5 space-y-4 shadow-sm"
                        >
                          <div className="flex justify-between items-center border-b border-violet-100 pb-3">
                            <div className="flex items-center gap-2">
                              <Trophy size={16} className="text-violet-600" />
                              <span className="text-[10px] font-black uppercase tracking-wider text-violet-700">Coach Feedback Report</span>
                            </div>
                            <div className="flex items-baseline gap-1 bg-violet-600 text-white px-3.5 py-1.5 rounded-xl font-display font-black text-sm">
                              <span>{fb.overall_score}</span>
                              <span className="text-[10px] opacity-70">/10</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 text-[11.5px] leading-relaxed text-slate-600 font-sans">
                            <div>
                              <strong className="text-slate-800 block mb-0.5 uppercase tracking-wide text-[9px] font-black font-display">Situation & Task Setup:</strong>
                              <p className="font-sans">{fb.situation_task_feedback}</p>
                            </div>
                            
                            <div>
                              <strong className="text-slate-800 block mb-0.5 uppercase tracking-wide text-[9px] font-black font-display">Execution Details (Actions):</strong>
                              <p className="font-sans">{fb.action_feedback}</p>
                            </div>

                            <div>
                              <strong className="text-slate-800 block mb-0.5 uppercase tracking-wide text-[9px] font-black font-display">Metrics & Business Results:</strong>
                              <p className="font-sans">{fb.result_feedback}</p>
                            </div>
                          </div>

                          {fb.suggestions && fb.suggestions.length > 0 && (
                            <div className="pt-2.5 border-t border-violet-100">
                              <span className="text-[9px] font-black uppercase tracking-wider text-violet-600 block mb-2 font-display">Tactical Recommendations:</span>
                              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 font-sans">
                                {fb.suggestions.map((sug, i) => (
                                  <li key={i}>{sug}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </motion.div>
                      );
                    }

                    return (
                      <div 
                        key={index}
                        className={`flex gap-4 ${isCandidate ? "flex-row-reverse text-right" : "text-left"}`}
                      >
                        <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${
                          isCandidate ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-lumina-teal/10 border-lumina-teal/20 text-lumina-teal"
                        }`}>
                          {isCandidate ? <UserCheck size={14} /> : <BotAvatar />}
                        </div>
                        
                        <div className={`p-4.5 rounded-[1.5rem] max-w-[85%] ${
                          isCandidate 
                            ? "bg-slate-50 text-slate-700 border border-slate-100" 
                            : "bg-lumina-teal/5 border border-lumina-teal/10 text-slate-700"
                        }`}>
                          <p className="text-[12.5px] leading-relaxed font-sans">{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* AI thinking steps loader */}
                  {evaluating && (
                    <div className="flex gap-4 items-start">
                      <div className="w-8 h-8 rounded-xl bg-lumina-teal/10 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal shrink-0">
                        <Loader2 size={14} className="animate-spin" />
                      </div>
                      
                      <div className="p-4.5 rounded-[1.5rem] bg-slate-50/50 border border-slate-100 text-slate-400 space-y-2 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-black uppercase tracking-widest animate-pulse font-display">{evalStep}</span>
                        </div>
                        <div className="w-32 h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full bg-lumina-teal animate-pulse" style={{ width: '60%' }} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input box */}
                <div className="p-4 border-t border-slate-100 bg-slate-50/30 flex gap-3 items-end">
                  <textarea
                    placeholder="Type your STAR response here..."
                    className="flex-1 bg-white border-2 border-slate-100 hover:border-slate-200 focus:border-lumina-teal rounded-2xl px-4.5 py-3 text-xs outline-none h-16 resize-none transition-colors text-slate-700 font-sans"
                    value={candidateResponse}
                    onChange={(e) => setCandidateResponse(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        submitCandidateAnswer();
                      }
                    }}
                    disabled={evaluating}
                  />
                  <button
                    onClick={submitCandidateAnswer}
                    disabled={evaluating || !candidateResponse.trim()}
                    className="w-12 h-12 rounded-2xl bg-lumina-teal text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50 shadow-md shadow-emerald-500/10"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              {/* Side panel metrics (4 columns) */}
              <div className="lg:col-span-4 space-y-6">
                <div className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-100/10 space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 font-display">
                    <Trophy size={12} className="text-yellow-500" /> Active Session Specs
                  </h4>
                  
                  <div className="space-y-3.5 pt-2">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Target Role</span>
                      <span className="text-[12px] font-black text-slate-700 uppercase tracking-tight">{targetRole}</span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Focus Mode</span>
                      <span className="text-[12px] font-black text-indigo-600 uppercase tracking-tight">
                        {selectedStarId === "none" ? "General Behavioral Loop" : stars.find(s => s.id === selectedStarId)?.category}
                      </span>
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 block mb-0.5">Framework Check</span>
                      <div className="flex gap-2 items-center text-[11px] text-slate-500 font-sans">
                        <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                        <span>STAR constraint enforced</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-[2rem] border border-slate-100 bg-white shadow-xl shadow-slate-100/10">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3 block font-display">Simulation Instructions</h4>
                  <ul className="list-disc pl-4 space-y-2 text-[11px] text-slate-500 leading-relaxed font-sans">
                    <li>Type answers detailing **S**ituation, **T**ask, **A**ction, and **R**esult.</li>
                    <li>Always incorporate **quantitative data** (percentages, revenue, time saved).</li>
                    <li>The AI coach will grade you on all 4 steps and ask highly targetted follow-ups to pressure-test your limits.</li>
                  </ul>
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: CURATED PREP RESOURCES ── */}
      {activeTab === "resources" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resourcesList.map((res, index) => (
            <div 
              key={index}
              className="bg-white border border-slate-100 hover:border-slate-200 p-6 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl bg-${res.color}/5 border border-${res.color}/20 flex items-center justify-center text-${res.color} shadow-md`}>
                    <res.icon size={18} />
                  </div>
                  <div>
                    <span className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-widest">{res.label}</span>
                    <h4 className="text-sm font-display font-black text-slate-700 tracking-tight">{res.title}</h4>
                  </div>
                </div>

                <p className="text-[11.5px] leading-relaxed text-slate-500 font-sans">
                  {res.description}
                </p>

                {res.bulletItems && (
                  <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-500 font-sans">
                    {res.bulletItems.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>

              {res.link ? (
                <a
                  href={res.link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-lumina-teal/10 hover:text-lumina-teal hover:border-lumina-teal/20 transition-all text-[10px] font-black uppercase tracking-wider text-slate-600 text-center"
                >
                  Access Resource <ExternalLink size={12} />
                </a>
              ) : (
                <button
                  onClick={() => {
                    if (res.title.includes("Questions")) {
                      navigator.clipboard.writeText(res.bulletItems?.join("\n") || "");
                      toast.success("Questions copied to clipboard!");
                    }
                  }}
                  className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-lumina-teal/10 hover:text-lumina-teal hover:border-lumina-teal/20 transition-all text-[10px] font-black uppercase tracking-wider text-slate-600 text-center"
                >
                  Copy Cheat Sheet <Copy size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

// Micro Avatar Helper component
function BotAvatar() {
  return (
    <div className="w-8 h-8 rounded-xl bg-lumina-teal/10 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal animate-pulse">
      <BrainCircuit size={14} />
    </div>
  );
}

// Curated resources static data list
const resourcesList = [
  {
    title: "Behavioral STAR Cheat Sheet",
    label: "Framework",
    color: "emerald-500",
    icon: Award,
    description: "The absolute guide to mastering situational interview answers. Learn how to construct the Situation, Task, Action, and Result vectors for optimal recruiter signaling.",
    bulletItems: [
      "Keep Situation & Task under 25% of total time.",
      "Devote 50% to your individual Actions.",
      "Devote 25% to metrics-backed Results.",
      "Avoid passive verbs like 'helped' or 'involved'."
    ],
    link: "https://www.amazon.jobs/content/en/how-we-hire/interviewing-at-amazon"
  },
  {
    title: "System Design Blueprint",
    label: "Architecture",
    color: "indigo-500",
    icon: BrainCircuit,
    description: "An open-source bible for scaling distributed systems. Deep dive into horizontal scaling, relational vs. non-relational database trade-offs, caching, and failovers.",
    bulletItems: [
      "Understand consistent hashing & partitioning.",
      "Review DB replication vs. sharding.",
      "Master API Gateway & rate limiter placement.",
      "Audit latency vs. throughput trade-offs."
    ],
    link: "https://github.com/donnemartin/system-design-primer"
  },
  {
    title: "Tech Interview Handbook",
    label: "Coding",
    color: "blue-500",
    icon: BookOpen,
    description: "Curated study roadmap and cheat sheets for cracking data structure and algorithms questions. Includes high-yield blind lists, cheat sheets, and behavioral formats.",
    bulletItems: [
      "High-yield coding sheets (Blind 75).",
      "Template sheets for sliding window, dfs, bfs.",
      "Behavioral rubrics for tech presentations.",
      "Best practices for live whiteboarding."
    ],
    link: "https://www.techinterviewhandbook.org/"
  },
  {
    title: "Salary Negotiation Bible",
    label: "Closing",
    color: "amber-500",
    icon: Trophy,
    description: "Elite negotiation framework to maximize base salary, sign-ons, and equity grants. Learn how to leverage multiple offers and anchor expectations.",
    bulletItems: [
      "Never give your current base or target first.",
      "Anchor high based on competitive market bounds.",
      "Quantify value add to justify peer alignments.",
      "Leverage competing offers chronologically."
    ],
    link: "https://github.com/rookie-recruiter/salary-negotiation-handbook"
  },
  {
    title: "Reverse Interviewing Deck",
    label: "Due Diligence",
    color: "pink-500",
    icon: MessageSquare,
    description: "Top reverse questions to ask engineering directors and recruiters to audit team culture, tech debt, financial health, and operational structures.",
    bulletItems: [
      "How is engineering work prioritized against technical debt?",
      "What did the onboarding cycle look like for the last peer?",
      "How does the team mitigate burnout and pager-duty fatigue?",
      "What is the biggest operational hurdle faced this quarter?"
    ],
    link: null
  },
  {
    title: "Google SRE Workbook",
    label: "Production Scale",
    color: "teal-500",
    icon: Zap,
    description: "Google's direct handbook on keeping production systems reliable, scaling incidents response, managing error budgets, monitoring, and debugging.",
    bulletItems: [
      "Define SLA vs. SLO vs. SLI targets.",
      "Manage error budgets as prioritisation buffers.",
      "Implement post-mortems without blamings.",
      "Understand circuit breakers & backoffs."
    ],
    link: "https://sre.google/workbook/table-of-contents/"
  }
];
