import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Trash2, Star, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

interface ArsenalResume {
  id: string;
  name: string;
  url: string;
  uploaded_at: string;
  is_primary: boolean;
}

export function ResumeArsenal() {
  const { user } = useAuth();
  const [resumes, setResumes] = useState<ArsenalResume[]>([]);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are supported");
      return;
    }
    setUploading(true);
    try {
      const path = `arsenal/${user.id}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from("resumes").upload(path, file);
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("resumes").getPublicUrl(path);
      setResumes((prev) => [
        ...prev,
        { id: path, name: file.name, url: urlData.publicUrl, uploaded_at: new Date().toISOString(), is_primary: prev.length === 0 },
      ]);
      toast.success(`${file.name} added to arsenal`);
    } catch (err) {
      toast.error("Failed to upload resume");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string) => {
    setResumes((prev) => prev.filter((r) => r.id !== id));
    supabase.storage.from("resumes").remove([id]);
    toast.success("Resume removed");
  };

  const handleSetPrimary = (id: string) => {
    setResumes((prev) => prev.map((r) => ({ ...r, is_primary: r.id === id })));
    toast.success("Primary resume updated");
  };

  const slotsUsed = resumes.length;
  const slotsTotal = 5;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-10 py-8">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <FileText size={18} className="text-emerald-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Resume Arsenal</h1>
            <p className="text-[12px] font-medium text-slate-500">
              Maintain up to {slotsTotal} tailored resumes — Lumina picks the best fit for every application.
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
              {slotsUsed} / {slotsTotal} slots
            </div>
            <label
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors cursor-pointer ${
                uploading || slotsUsed >= slotsTotal
                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                  : "bg-emerald-500 text-white hover:bg-emerald-400"
              }`}
            >
              <Upload size={10} />
              {uploading ? "Uploading…" : "Upload PDF"}
              <input
                type="file"
                accept=".pdf"
                onChange={handleUpload}
                className="hidden"
                disabled={uploading || slotsUsed >= slotsTotal}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-600" />
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-600">
            Stored Resumes
          </span>
        </div>

        {resumes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
            <FileText size={32} className="mx-auto text-slate-300 mb-3" />
            <p className="text-[13px] font-bold text-slate-600">No resumes uploaded yet</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Add up to {slotsTotal} PDFs. The first one becomes your primary automatically.
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {resumes.map((resume) => (
              <motion.div
                key={resume.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl border p-4 flex items-center justify-between transition-colors ${
                  resume.is_primary
                    ? "border-emerald-200 bg-emerald-50/60"
                    : "border-slate-100 bg-slate-50/60 hover:border-emerald-200"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center shrink-0">
                    <FileText size={14} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[12px] font-bold text-slate-800 truncate">{resume.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">
                      Added {new Date(resume.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {resume.is_primary ? (
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest">
                      <Star size={9} /> Primary
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetPrimary(resume.id)}
                      className="px-2.5 py-1 rounded-full border border-slate-200 text-slate-500 text-[9px] font-black uppercase tracking-widest hover:text-emerald-600 hover:border-emerald-300 transition-colors flex items-center gap-1"
                    >
                      <Star size={9} /> Set primary
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(resume.id)}
                    className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors"
                    title="Remove"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
