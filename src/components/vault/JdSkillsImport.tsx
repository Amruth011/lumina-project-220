import { useState, useEffect } from "react";
import { Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { TECHNICAL_DICTIONARY } from "@/lib/skillScanner";

interface JdSkillsImportProps {
  onCategorizeSkills: (categorized: { skill: string; category: string }[]) => void;
}

function categorizeSkill(skillName: string): string | null {
  const lower = skillName.toLowerCase();
  for (const [category, patterns] of Object.entries(TECHNICAL_DICTIONARY)) {
    for (const pattern of patterns) {
      let regexStr = `\\b${pattern}\\b`;
      if (pattern.includes("+") || pattern.includes("#")) {
        regexStr = `\\b${pattern.replace(/\+/g, "\\+").replace(/#/g, "\\#")}(?=\\s|\\b|$)`;
      }
      try {
        const regex = new RegExp(regexStr, "i");
        if (regex.test(lower)) return category;
      } catch {
        continue;
      }
    }
  }
  return null;
}

export function JdSkillsImport({ onCategorizeSkills }: JdSkillsImportProps) {
  const [jdData, setJdData] = useState<{ title: string; skills: { skill: string; category: string; importance: number }[] } | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [imported, setImported] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("lumina_last_results");
      if (raw) {
        const parsed = JSON.parse(raw);
        const skills = parsed.skills || [];
        if (skills.length > 0) {
          setJdData({ title: parsed.title || "Decoded JD", skills });
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  if (!jdData || jdData.skills.length === 0) return null;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev);
      if (next.has(skill)) next.delete(skill);
      else next.add(skill);
      return next;
    });
  };

  const selectAll = () => setSelectedSkills(new Set(jdData.skills.map((s) => s.skill)));
  const deselectAll = () => setSelectedSkills(new Set());

  const handleImport = () => {
    if (selectedSkills.size === 0) return;
    const skillsList = Array.from(selectedSkills);
    const categorized = skillsList.map(skill => ({
      skill,
      category: categorizeSkill(skill) || "Software Engineering / Others"
    }));
    onCategorizeSkills(categorized);
    setImported(true);
    toast.success(`${selectedSkills.size} skills imported from "${jdData.title}".`);
  };

  return (
    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
            Skills from "{jdData.title}"
          </span>
        </div>
        <span className="text-[9px] text-emerald-500/60 font-medium">
          {selectedSkills.size}/{jdData.skills.length} selected
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {jdData.skills.map((s) => (
          <button
            key={s.skill}
            onClick={() => toggleSkill(s.skill)}
            className={`px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all ${
              selectedSkills.has(s.skill)
                ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-300"
                : "bg-white/5 border-white/10 text-muted-foreground hover:border-emerald-500/30"
            }`}
          >
            {s.skill}
            {s.importance >= 80 && (
              <span className="ml-1 opacity-50">★</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          onClick={selectAll}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-muted-foreground hover:bg-white/10 transition-all"
        >
          Select All
        </button>
        <button
          onClick={deselectAll}
          className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-muted-foreground hover:bg-white/10 transition-all"
        >
          Deselect All
        </button>
        <div className="flex-1" />
        <button
          onClick={handleImport}
          disabled={selectedSkills.size === 0 || imported}
          className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
            imported
              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
              : "bg-emerald-500 text-white hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed"
          }`}
        >
          {imported ? (
            <><Check size={10} /> Imported</>
          ) : (
            <><Sparkles size={10} /> Import {selectedSkills.size} Skills</>
          )}
        </button>
      </div>
    </div>
  );
}
