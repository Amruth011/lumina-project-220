import { useState } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, Trash2, Star, ArrowUpDown } from "lucide-react";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <h2 className="text-sm font-black uppercase tracking-widest text-foreground flex items-center gap-2">
            <FileText size={14} /> 5-Resume Arsenal
          </h2>
          <p className="text-[10px] text-muted-foreground">Upload up to 5 tailored resumes. AI picks the best fit.</p>
        </div>
        <label className="px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all flex items-center gap-1.5 cursor-pointer">
          <Upload size={12} />
          {uploading ? "Uploading..." : "Upload PDF"}
          <input type="file" accept=".pdf" onChange={handleUpload} className="hidden" disabled={uploading || resumes.length >= 5} />
        </label>
      </div>

      {resumes.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <FileText size={32} className="mx-auto text-muted-foreground mb-3 opacity-30" />
          <p className="text-xs text-muted-foreground">No resumes uploaded yet. Add up to 5 PDFs.</p>
        </div>
      )}

      <div className="grid gap-3">
        {resumes.map((resume) => (
          <motion.div
            key={resume.id}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border p-4 flex items-center justify-between ${
              resume.is_primary ? "border-emerald-500/30 bg-emerald-500/5" : "border-border/40 bg-background/40"
            }`}
          >
            <div className="flex items-center gap-3">
              <FileText size={16} className="text-muted-foreground" />
              <div>
                <p className="text-xs font-bold text-foreground">{resume.name}</p>
                <p className="text-[9px] text-muted-foreground">{new Date(resume.uploaded_at).toLocaleDateString()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {resume.is_primary ? (
                <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-400">
                  <Star size={10} /> Primary
                </span>
              ) : (
                <button
                  onClick={() => handleSetPrimary(resume.id)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-muted-foreground hover:text-foreground transition-all"
                >
                  <Star size={12} />
                </button>
              )}
              <button
                onClick={() => handleDelete(resume.id)}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
