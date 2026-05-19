import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Sparkles, Copy, X, Wand2, FileText, CheckCircle2, AlertCircle, ArrowRight, Github, Linkedin, Mail, MapPin, Plus, Minus, Archive, ArrowUp, ArrowDown, Type } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Skill, VaultItem, UserProfileWithVault, GeneratedResume } from "@/types/jd";
import jsPDF from "jspdf";
import { ResumePreview } from "./resume-tailor/ResumePreview";

const sanitizePdfText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/[\u201C\u201D]/g, '"') // smart double quotes
    .replace(/[\u2018\u2019]/g, "'") // smart single quotes
    .replace(/[\u2013\u2014]/g, "-") // en-dash and em-dash
    .replace(/\u20B9/g, "Rs. ")     // rupee symbol
    .replace(/\u00B9/g, "1")        // superscript 1
    .replace(/\u00B2/g, "2")        // superscript 2
    .replace(/\u00B3/g, "3")        // superscript 3
    .replace(/\u00A0/g, " ");        // non-breaking space
};

const getModeOrLocation = (modeAndLocRaw: string, defaultLoc: string): string => {
  const raw = (modeAndLocRaw || "").trim();
  if (!raw) return defaultLoc;
  
  if (raw.toLowerCase().includes("remote")) {
    return "Remote";
  }
  
  const match = raw.match(/\(([^)]+)\)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  
  if (raw.toLowerCase().includes("on-site") || raw.toLowerCase().includes("on site")) {
    return defaultLoc || "On-site";
  }
  
  return raw;
};

const parseProductOrProjectContent = (contentStr: string) => {
  const raw = contentStr || "";
  
  // Robust match for GitHub or absolute URLs or standard project domain patterns
  const urlRegex = /(https?:\/\/[^\s|]+|github\.com\/[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const matches = raw.match(urlRegex) || [];
  
  const uniqueUrls: string[] = [];
  const seen = new Set<string>();
  
  matches.forEach(u => {
    // Normalize to avoid protocol/trailing slash mismatches (e.g. git.com vs http://git.com)
    const norm = u.toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .trim();
      
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      uniqueUrls.push(u.trim());
    }
  });

  let statusOrYear = raw;
  // Use unique occurrences to strip from text
  uniqueUrls.forEach(url => {
    statusOrYear = statusOrYear.split(url).join("");
  });
  
  statusOrYear = statusOrYear.replace(/[|\s-–—]+/g, " ").trim();
    
  if (statusOrYear.toLowerCase() === "live" || statusOrYear.toLowerCase() === "live |" || statusOrYear.toLowerCase() === "| live") {
    statusOrYear = "";
  }

  if (statusOrYear === "|" || statusOrYear === "-" || statusOrYear === "–" || statusOrYear === "—") {
    statusOrYear = "";
  }
  
  const parts = [];
  if (statusOrYear) {
    parts.push(statusOrYear);
  }
  uniqueUrls.forEach(url => {
    parts.push(url);
  });
  
  return {
    statusOrYear,
    urls: uniqueUrls,
    pdfString: parts.join(" | ")
  };
};

const measureOrDrawRightSideLinks = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pdf: any,
  statusOrYear: string,
  urls: string[],
  y: number,
  margin: number,
  pageWidth: number,
  bodyFontSize: number,
  currentFont: string,
  draw = true
): number => {
  pdf.setFont(currentFont, "normal");
  pdf.setFontSize(bodyFontSize - 1);

  const segments: Array<{ text: string; isLink: boolean; url?: string }> = [];

  if (statusOrYear) {
    segments.push({ text: statusOrYear, isLink: false });
  }

  urls.forEach(url => {
    const isGithub = url.toLowerCase().includes("github.com");
    const label = isGithub ? "GitHub" : "Live Link";
    const href = url.startsWith("http") ? url : `https://${url}`;
    segments.push({ text: label, isLink: true, url: href });
  });

  let totalWidth = 0;
  const spacing = pdf.getTextWidth(" | ");
  
  const measuredSegments = segments.map(seg => {
    const width = pdf.getTextWidth(seg.text);
    return { ...seg, width };
  });

  measuredSegments.forEach((seg, idx) => {
    totalWidth += seg.width;
    if (idx < measuredSegments.length - 1) {
      totalWidth += spacing;
    }
  });

  if (!draw) {
    return totalWidth;
  }

  let currentX = pageWidth - margin - totalWidth;

  measuredSegments.forEach((seg, idx) => {
    if (seg.isLink && seg.url) {
      pdf.setFont(currentFont, "bold");
      pdf.setTextColor(0, 0, 0);
      pdf.text(seg.text, currentX, y);
      
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.15);
      pdf.line(currentX, y + 0.5, currentX + seg.width, y + 0.5);

      pdf.link(currentX, y - 3, seg.width, 4, { url: seg.url });
    } else {
      pdf.setFont(currentFont, "normal");
      pdf.setTextColor(80, 80, 80);
      pdf.text(seg.text, currentX, y);
    }

    currentX += seg.width;

    if (idx < measuredSegments.length - 1) {
      pdf.setFont(currentFont, "normal");
      pdf.setTextColor(180, 180, 180);
      pdf.text(" | ", currentX, y);
      currentX += spacing;
    }
  });

  pdf.setTextColor(0, 0, 0);
  return totalWidth;
};

interface ResumeGeneratorProps {
  jdTitle: string;
  jdSkills: Skill[];
  companyName?: string;
  forceTab?: 'resume' | 'cover-letter';
}

interface ResumeHeader {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
}

interface ArchiveRecord {
  id: string;
  job_title: string;
  updated_at: string;
  content: GeneratedResume;
  header_data: ResumeHeader;
  settings?: {
    fontFamily: string;
    nameFontSize: number;
    headlineFontSize: number;
    subHeadlineFontSize: number;
    bodyFontSize: number;
    tone: string;
    summaryLines?: number;
    experienceBullets?: number;
    projectLines?: number;
    productLines?: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeGeneratedResume = (data: any, targetSummaryLines = 3): GeneratedResume => {
  if (!data || typeof data !== "object") {
    return {
      professional_summary: "",
      skills_section: [],
      experience: [],
      education: [],
      certifications: [],
      awards: [],
      products: [],
      projects: [],
      leadership: []
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ensureArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];

  let summary = "";
  if (typeof data.professional_summary === "string") {
    summary = data.professional_summary;
  } else if (data.professional_summary) {
    summary = String(data.professional_summary);
  }

  if (summary) {
    // Normalise smart punctuation and missing spacing
    const normalized = summary
      .replace(/([a-zA-Z])\.([A-Za-z])/g, '$1. $2')
      .replace(/([a-zA-Z])!([A-Za-z])/g, '$1! $2')
      .replace(/([a-zA-Z])\?([A-Za-z])/g, '$1? $2')
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u20B9/g, "Rs. ")
      .replace(/\u00B9/g, "1")
      .replace(/\u00B2/g, "2")
      .replace(/\u00B3/g, "3")
      .replace(/\u00A0/g, " ");

    const sentences = normalized.match(/[^.!?]+[.!?]+(\s|$)/g) || [normalized];
    const cleanedSentences = sentences.map(s => s.trim()).filter(Boolean);

    if (cleanedSentences.length < targetSummaryLines) {
      if (cleanedSentences.length === 0) {
        cleanedSentences.push("Results-driven technology professional specializing in designing and deploying high-impact modern systems.");
        cleanedSentences.push("Spearheaded cross-functional architectures to drive scalability, efficiency, and engineering excellence.");
        cleanedSentences.push("Proven track record of optimizing performance metrics and leading technical execution under tight deadlines.");
      } else {
        const currentText = cleanedSentences.join(" ");
        const clauses = currentText
          .split(/,|\band\b|;|\bwith\b|\bby\b|\bfor\b/i)
          .map(c => c.trim())
          .filter(c => c.length > 5);

        if (clauses.length >= targetSummaryLines) {
          cleanedSentences.length = 0;
          for (let i = 0; i < targetSummaryLines; i++) {
            let sentence = clauses[i];
            if (i === 0) {
              sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
            } else {
              if (!/^[A-Z]/.test(sentence)) {
                sentence = "Focusing on " + sentence.charAt(0).toLowerCase() + sentence.slice(1);
              }
            }
            if (!sentence.endsWith(".")) sentence += ".";
            cleanedSentences.push(sentence);
          }
        } else {
          const genericPads = [
            "Spearheaded scalable system design to accelerate product delivery and engineering velocity.",
            "Leveraged advanced frameworks and methodologies to solve complex, high-concurrency challenges.",
            "Dedicated to continuous integration and robust system architectures."
          ];
          while (cleanedSentences.length < targetSummaryLines) {
            cleanedSentences.push(genericPads[(cleanedSentences.length - 1) % genericPads.length]);
          }
        }
      }
    }

    const finalSentences = cleanedSentences.slice(0, targetSummaryLines).map(s => {
      let clean = s.trim();
      if (!clean.endsWith(".") && !clean.endsWith("!") && !clean.endsWith("?")) {
        clean += ".";
      }
      return clean.charAt(0).toUpperCase() + clean.slice(1);
    });

    summary = finalSentences.join(" ");
  }

  let skills: string[] = [];
  if (Array.isArray(data.skills_section)) {
    skills = data.skills_section.map(s => typeof s === "string" ? s : String(s || ""));
  } else if (data.skills_section && typeof data.skills_section === "object") {
    skills = Object.entries(data.skills_section).map(([key, val]) => {
      const valStr = Array.isArray(val) ? val.join(", ") : String(val || "");
      return `${key}: ${valStr}`;
    });
  } else if (typeof data.skills_section === "string") {
    skills = [data.skills_section];
  }

  let education: string[] = [];
  if (Array.isArray(data.education)) {
    education = data.education.map(edu => {
      if (typeof edu === "string") return edu;
      if (edu && typeof edu === "object") {
        const deg = edu.degree || edu.title || "Degree";
        const sch = edu.school || edu.organization || edu.institution || "University";
        const loc = edu.location || "";
        const dt = edu.date || edu.period || edu.expected || "Expected 2027";
        const gpaVal = edu.gpa || "";
        const parts = [];
        if (loc) parts.push(loc);
        if (dt) parts.push(dt);
        if (gpaVal) parts.push(`GPA: ${gpaVal}`);
        return `${deg} @ ${sch}${parts.length > 0 ? ` - ${parts.join(" | ")}` : ""}`;
      }
      return String(edu || "");
    });
  } else if (typeof data.education === "string") {
    education = [data.education];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cleanSections = (sectionsArr: any): GeneratedResumeSection[] => {
    return ensureArray(sectionsArr).map(item => {
      if (!item || typeof item !== "object") {
        return { heading: String(item || ""), content: "", bullets: [] };
      }
      return {
        heading: typeof item.heading === "string" ? item.heading : String(item.heading || item.title || ""),
        content: typeof item.content === "string" ? item.content : String(item.content || item.period || item.date || ""),
        bullets: Array.isArray(item.bullets) 
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ? item.bullets.map((b: any) => typeof b === "string" ? b : String(b || ""))
          : (typeof item.bullets === "string" ? [item.bullets] : [])
      };
    });
  };

  return {
    professional_summary: summary,
    skills_section: skills,
    experience: cleanSections(data.experience),
    education: education,
    products: cleanSections(data.products),
    projects: cleanSections(data.projects).sort((a, b) => {
      const getYear = (str: string): number => {
        const raw = (str || "").toLowerCase();
        if (raw.includes("ongoing") || raw.includes("present")) return 3000;
        const match = raw.match(/\b(20\d{2})\b/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getYear(b.content) - getYear(a.content);
    }),
    leadership: cleanSections(data.leadership),
    certifications: ensureArray(data.certifications).map(c => typeof c === "string" ? c : String(c || "")),
    awards: ensureArray(data.awards).map(a => typeof a === "string" ? a : String(a || ""))
  };
};

export const ResumeGenerator = ({ jdTitle, jdSkills, companyName, forceTab }: ResumeGeneratorProps) => {
  console.log("ResumeGenerator: Rendering with props", { jdTitle, jdSkills: jdSkills?.length, companyName });
  
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [resume, setResume] = useState<GeneratedResume | null>(null);
  const [coverLetter, setCoverLetter] = useState<string | null>(null);
  const [isGeneratingCL, setIsGeneratingCL] = useState(false);
  const [isOpen, setIsOpen] = useState(!!forceTab);
  const [profile, setProfile] = useState<UserProfileWithVault | null>(null);
  const [resumeSettingsActive, setResumeSettingsActive] = useState(false);
  const [clSettingsActive, setClSettingsActive] = useState(false);
  
  useEffect(() => {
    console.log("ResumeGenerator: Mounted");
  }, []);
  const [summaryLines, setSummaryLines] = useState(3);
  const [projectLines, setProjectLines] = useState(3);
  const [productLines, setProductLines] = useState(3);
  const [experienceBullets, setExperienceBullets] = useState(3);
  const [showSettings, setShowSettings] = useState(false);
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([]);
  const [fontFamily, setFontFamily] = useState<"Inter" | "Roboto" | "Merriweather" | "Arial">("Inter");
  const [draftId, setDraftId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editableResume, setEditableResume] = useState<GeneratedResume | null>(null);
  const [editableHeader, setEditableHeader] = useState<ResumeHeader>({
    fullName: "",
    email: "",
    phone: "",
    location: "",
    linkedin: "",
    portfolio: "",
    github: ""
  });
  const [tone, setTone] = useState<"Professional" | "Modern" | "Aggressive">("Modern");
  const [clFocus, setClFocus] = useState<"Technical" | "Leadership" | "Cultural">("Technical");
  const [clLength, setClLength] = useState<"Concise" | "Detailed">("Concise");
  const [addingSection, setAddingSection] = useState<'experience' | 'projects' | 'education' | 'certifications' | null>(null);
  const [savedResumes, setSavedResumes] = useState<ArchiveRecord[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  
  // Font Size Calibration
  const [nameFontSize, setNameFontSize] = useState(18);
  const [headlineFontSize, setHeadlineFontSize] = useState(12);
  const [subHeadlineFontSize, setSubHeadlineFontSize] = useState(11);
  const [bodyFontSize, setBodyFontSize] = useState(10);

  // Layout & Blueprint Typography Settings
  const [lineSpacing, setLineSpacing] = useState<1.0 | 1.15 | 1.4>(1.15);
  const [marginSize, setMarginSize] = useState<0.5 | 1.0>(0.5);
  const [baseFontSize, setBaseFontSize] = useState(11);
  const [sectionOrder, setSectionOrder] = useState<string[]>(['SUMMARY', 'EDUCATION', 'EXPERIENCE', 'PRODUCTS', 'PROJECTS', 'LEADERSHIP', 'SKILLS', 'AWARDS', 'CERTIFICATIONS']);
  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    'SUMMARY': true,
    'EDUCATION': true,
    'EXPERIENCE': true,
    'PROJECTS': true,
    'PRODUCTS': true,
    'LEADERSHIP': true,
    'SKILLS': true,
    'AWARDS': true,
    'CERTIFICATIONS': true
  });

  const formatUrl = (url: string) => {
    if (!url) return "";
    let formatted = url.trim();
    if (!formatted.startsWith("http://") && !formatted.startsWith("https://")) {
      // If it starts with linkedin.com or github.com, we add https://
      formatted = `https://${formatted}`;
    }
    return formatted;
  };


  useEffect(() => {
    if (user) {
      loadVault();
      loadDraft();
      fetchSavedResumes();
    }
    
    const handleExportTrigger = () => {
      if (resume) {
        handleDownloadPDF();
      } else {
        toast.info("Generate a resume first to export.");
      }
    };

    window.addEventListener('trigger-resume-export', handleExportTrigger);
    return () => window.removeEventListener('trigger-resume-export', handleExportTrigger);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, jdTitle, resume]);

  const loadDraft = async () => {
    if (!user || !jdTitle) return;
    try {
      const { data } = await supabase
        .from("generated_resumes")
        .select("id")
        .eq("user_id", user.id)
        .eq("job_title", jdTitle)
        .maybeSingle();

      if (data) {
        setDraftId(data.id);
        // Draft content is no longer loaded automatically to keep the generator clean.
        // Users can explicitly load from the "Saved Blueprints" archive if needed.
      }
    } catch (err) {
      console.error("Load draft error:", err);
    }
  };

  const fetchSavedResumes = async () => {
    if (!user) return;
    setIsLoadingArchive(true);
    try {
      const { data, error } = await supabase
        .from("generated_resumes")
        .select("id, job_title, status, updated_at, content, header_data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;
      setSavedResumes((data as unknown as ArchiveRecord[]) || []);
    } catch (err) {
      console.error("Fetch archive error:", err);
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const handleLoadArchive = (record: ArchiveRecord) => {
    setDraftId(record.id);
    
    const savedSummaryLines = record.settings?.summaryLines || summaryLines || 3;
    const hydratedContent = sanitizeGeneratedResume(record.content, savedSummaryLines);
    
    setResume(hydratedContent);
    setEditableResume(hydratedContent);
    setEditableHeader(record.header_data || {
      fullName: user?.user_metadata?.full_name || "Resume Candidate",
      email: user?.email || "",
      phone: "",
      location: "",
      linkedin: "",
      portfolio: "",
      github: ""
    });
    
    if (record.settings) {
      setFontFamily(record.settings.fontFamily as "Inter" | "Roboto" | "Merriweather" | "Arial");
      setNameFontSize(record.settings.nameFontSize);
      setHeadlineFontSize(record.settings.headlineFontSize);
      setSubHeadlineFontSize(record.settings.subHeadlineFontSize);
      setBodyFontSize(record.settings.bodyFontSize);
      setTone(record.settings.tone as "Professional" | "Modern" | "Aggressive");
      if (record.settings.summaryLines) setSummaryLines(Number(record.settings.summaryLines));
      if (record.settings.experienceBullets) setExperienceBullets(Number(record.settings.experienceBullets));
      if (record.settings.projectLines) setProjectLines(Number(record.settings.projectLines));
      if (record.settings.productLines) setProductLines(Number(record.settings.productLines));
    }
    
    setIsOpen(true);
    setShowArchive(false);
    toast.success(`Loaded blueprint for ${record.job_title}`);
  };

  const handleDeleteArchive = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from("generated_resumes").delete().eq("id", id);
      if (error) throw error;
      setSavedResumes(prev => prev.filter(r => r.id !== id));
      if (draftId === id) {
        setDraftId(null);
      }
      toast.success("Blueprint purged from archive.");
    } catch (err) {
      toast.error("Failed to delete draft.");
    }
  };

  const loadVault = async () => {
    const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user?.id).single();
    const { data: vaultData } = await supabase.from("master_vault").select("*").eq("user_id", user?.id);
    setProfile(profileData as UserProfileWithVault);
    setVaultItems(vaultData as VaultItem[] || []);
    if (profileData) {
      // Email: prefer profiles table, fall back to auth user email (it lives in supabase.auth.users not profiles)
      const authEmail = user?.email || "";
      const resolvedEmail = (profileData.email || "").trim() || authEmail;
      setEditableHeader({
        fullName: profileData.full_name || "",
        email: resolvedEmail.toLowerCase(),
        phone: profileData.phone || "",
        location: profileData.location || "",
        linkedin: profileData.linkedin_url || "",
        portfolio: profileData.website_url || "",
        github: profileData.github_url || ""
      });
    } else if (user?.email) {
      // Profile row doesn't exist yet — at minimum pre-fill the email
      setEditableHeader(prev => ({ ...prev, email: user.email!.toLowerCase() }));
    }
  };

  /**
   * Main Resume Generation Lifecycle
   * ===============================
   * 1. Orchestrates multi-engine AI requests.
   * 2. Implements progressive fallback if primary models fail.
   * 3. Parses complex JSON output into the local application state.
   * 4. Updates JD scan history for future analytics.
   */
  const executeTacticalSynthesis = async () => {
    if (vaultItems.length === 0) {
      toast.error("Tactical Profile Empty", {
        description: "Please synchronize your Master Vault or add roles in the Profile tab to enable automated tailoring.",
        action: {
          label: "Go to Profile",
          onClick: () => {
             // In ScannerView, this will switch the tab if activeTab is managed by onTabChange
             // But since we are inside the component, we can't easily reach ScannerView's state 
             // without passing a prop. For now, a descriptive toast is better than a silent fail.
             window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'profile' }));
          }
        }
      });
      return;
    }
    setIsGenerating(true);

    let summaryPromptRule = "";
    let summarySchemaRule = "";

    if (summaryLines === 1) {
      summaryPromptRule = `You MUST synthesize a high-impact professional summary of EXACTLY 1 sentence. Keep the single sentence strictly around 100-115 characters including spaces in total, so that the professional summary spans exactly 1 line on a standard wide page. Do NOT write short 3-5 word fragments; it must be a fully formed, high-impact statement.`;
      summarySchemaRule = `Ensure there is exactly 1 substantial sentence (around 100-115 characters including spaces).`;
    } else if (summaryLines === 2) {
      summaryPromptRule = `You MUST synthesize a high-impact professional summary of EXACTLY 2 sentences. Do NOT output a single sentence or bullet list under any circumstances. You must write exactly 2 distinct, complete sentences separated by a period and a single space (e.g. "Sentence one. Sentence two."). Keep the entire professional summary strictly around 200-230 characters including spaces in total, so that it spans exactly 2 lines on a standard wide page. Each sentence must be fully formed and high-impact.`;
      summarySchemaRule = `Ensure there are exactly 2 sentences (strictly 200-230 characters in total across both sentences) separated by a period and space.`;
    } else {
      summaryPromptRule = `You MUST synthesize a high-impact professional summary of EXACTLY ${summaryLines} sentences. Do NOT output a single sentence or bullet list under any circumstances. You must write exactly ${summaryLines} distinct, complete sentences separated by a period and a single space (e.g. "Sentence one. Sentence two. Sentence three."). Keep the entire summary strictly around 300-340 characters including spaces in total (averaging around 100-110 characters per sentence) so that the professional summary spans exactly ${summaryLines} lines (default 3 lines) on a standard wide page. Each sentence must be a fully formed, high-impact statement.`;
      summarySchemaRule = `Ensure there are exactly ${summaryLines} sentences (strictly 300-340 characters in total across all sentences) separated by periods and spaces.`;
    }

    try {
      const prompt = `You are an elite Silicon Valley executive resume architect.
Your goal is to synthesize a high-impact, ATS-optimized resume in the precise "Andrew Vu" executive style.

### CONTEXT:
Job Target: ${jdTitle} at ${companyName || "this company"}
Target Skills: ${jdSkills.map(s => s.skill).join(", ")}
Candidate Profile: ${JSON.stringify(vaultItems.slice(0, 25).map(v => ({ type: v.type, title: v.title, org: v.organization, period: v.period, desc: v.description, bullets: v.bullets, skills: v.skills, github_link: v.github_link, live_link: v.live_link })), null, 2)}

### CORE MANDATE:
- Quantify EVERYTHING. Use metrics (%, $, time, scale) in every bullet.
- Use strong action verbs (Spearheaded, Orchestrated, Engineered).
- DATE FORMAT: Use exact dates or month/year formats cleanly as provided (e.g., "January 2023 to March 2025" or "Jul 2022 – Present").
- PROJECT DATE SORTING (CRITICAL): In the PROJECTS section, you MUST sort the projects by their date in reverse chronological order (latest/newest projects with the most recent year like 2026, 2025 or 'Ongoing' status placed at the very top/first, followed by older years like 2024, 2023, etc.).
- BULLET LENGTH & STRUCTURE MANDATE (CRITICAL): To ensure maximum density and pristine layout:
    - If a bullet is designed to fit on a SINGLE line, keep it concise but substantial (at least 60-90 characters, and at least 10 characters minimum. Never write tiny 2-3 word bullets that look like half a line).
    - If a bullet wraps to a SECOND line, make sure it is rich and detailed (at least 200 characters) so that the second line is fully utilized and never has only 1-2 trailing words or trailing fragments.
    - NEVER let a bullet wrap to a third line under any circumstances.
    - Make sure every bullet is extremely crisp, metric-first, and highly professional.
- SECTION DENSITY & DYNAMIC EXPANSION MANDATES (CRITICAL):
    - PROFESSIONAL SUMMARY: ${summaryPromptRule} You must compose it dynamically based on the Candidate Profile's experience and target skills. If the candidate's experience is a "Data Science Intern", you MUST refer to them as "Data Science Intern" or "Data Scientist" and NEVER hallucinate titles like "AI Engineer Intern" or "AI Intern".
    - SUMMARY EXPERIENCE TIMELINE ACCURACY (CRITICAL): Do NOT exaggerate or hallucinate the years of experience of the candidate under any circumstances! Count the exact duration of experience based ONLY on their formal experience items in the Candidate Profile. If the candidate has only one internship of 3 months or less than a year of total experience, you MUST NEVER write "X+ years of experience" or "2+ years of experience". Instead, state "Data Science Intern with hands-on experience" or "Data Science professional with hands-on internship experience". Keep it 100% faithful to the actual duration shown in the profile.
    - EXPERIENCE BULLETS: Every single role in EXPERIENCE must have EXACTLY ${experienceBullets} bullet points. If the Candidate Profile's entry has fewer than ${experienceBullets} bullets, you MUST expand, elaborate, or split them to generate exactly ${experienceBullets} quantified, metric-driven bullet points.
    - PROJECT BULLETS: Every single project in PROJECTS must have EXACTLY ${projectLines} bullet points. Expand or elaborate to generate exactly ${projectLines} metric-driven bullet points.
    - PRODUCT/STARTUP BULLETS: Every single product in PRODUCTS must have EXACTLY ${productLines} bullet points. Expand or elaborate to generate exactly ${productLines} metric-driven bullet points.
    - SUMMARY LENGTH: Ensure the professional summary is EXACTLY ${summaryLines} sentences long. Never return fewer than ${summaryLines} sentences. Each sentence must be substantial and detailed to span a full line.
- SECTION INTEGRITY & CLASSIFICATION (CRITICAL): 
    - EXPERIENCE: Only for formal employment, internships, and fellowships. (e.g., 'Data Science Intern').
    - PROJECTS: Technical builds, open-source contributions, or academic projects. (e.g., 'Kannada Book AI Agent').
    - PRODUCTS: Startups, SaaS products, or ventures founded by the user. (e.g., 'Lumina').
    - NO HALLUCINATIONS (CRITICAL): Do NOT invent or add any fake professional experience entries under any circumstances! Only include experiences that are explicitly provided in the Candidate Profile/vault items under EXPERIENCE. If the Candidate Profile only has 1 internship/job, then you MUST generate exactly that 1 entry under EXPERIENCE in the output JSON. NEVER invent jobs at companies like Google, Meta, or any other company to fill space.
    - STRICT QUANTITY: You MUST select, tailor, and generate at least 2 to 3 projects from the Candidate Profile/vault items (and up to 4 if present). Never output only 1 project if multiple are available in the Candidate Profile. For experience entries, generate exactly the number of formal employment entries provided.
    - DO NOT invent additional entries to "fill space" beyond what is provided in the Candidate Profile.
    - DO NOT mix these categories. If an item is a project, it MUST stay in PROJECTS. If it is a startup, it MUST stay in PRODUCTS.
    - DO NOT include certifications/awards in any other section. Keep them in AWARDS or CERTIFICATIONS. (CRITICAL: 'AI Engineer for Data Scientists Associate' or anything from 'DataCamp' is a CERTIFICATION, NOT experience).
    - SKILLS: Must be ONLY keywords and technical terms. NO sentences or descriptive text. Format as "Category: Skill1, Skill2, Skill3".
- CUSTOM STRUCTURE MANDATE:
    - You MUST follow this exact sequence: SUMMARY → EDUCATION → EXPERIENCE → PRODUCTS → PROJECTS → LEADERSHIP → SKILLS → AWARDS → CERTIFICATIONS.
    - ONLY include sections that are TRUE in this list: ${sectionOrder.filter(s => visibleSections[s]).join(', ')}.
    - If a section like 'LEADERSHIP' or 'AWARDS' is NOT in this list, you MUST OMIT IT from the JSON response entirely.
 
### SCHEMA & FORMATTING REQUIREMENTS:
1. EDUCATION: Each item in the array must strictly match this format:
   "[Course / Degree Name with Specialization] @ [College/University Name] - [Campus Location] | [Start Date – End Date] | GPA: [GPA_Value]"
   Example: "Btech in Artificial intelligence and data science @ REVA University - Bengaluru, Karnataka | July 2020 – June 2024 | GPA: 7.5/10"
2. EXPERIENCE: Professional roles with quantified impact.
   - "heading": Must strictly match: "[First Job Role] @ [Company Name] - [Mode (Remote or On-site)] ([Location if On-site])"
     Example: "Software Engineer Intern @ Google - On-site (Bengaluru, Karnataka)" or "Software Engineer Intern @ Google - Remote"
   - "content": Duration of experience (e.g., "January 2023 to March 2025" or "July 2022 to Present")
   - "bullets": Array of exactly ${experienceBullets} metric-driven bullets
3. PRODUCTS: Startups or SaaS products founded by the user.
   - "heading": Must strictly match: "[Product Name] - [One line of Tech Stack (comma-separated)]"
     Example: "Lumina Resume Engine - React, Node.js, Groq"
   - "content": Must strictly contain the status (Ongoing or Live) and optional GitHub/Live links. Do NOT add duration dates (e.g. "January 2023 to Present"). Just add: "[Status (Ongoing or Live)] [| github.com/username/project] [| live_link_url]"
      Example: "Live | github.com/username/lumina | lumina.io" or "Ongoing | github.com/username/lumina" or "Live | lumina.io"
   - "bullets": Array of exactly ${productLines} metrics or descriptions
4. PROJECTS: Technical achievements with stack details.
   - "heading": Must strictly match: "[Project Title] - [Tech Stack (comma-separated)]"
     Example: "Decentralized File System - React, Node.js, Web3"
   - "content": Must strictly contain the year/status and optional links: "[Year (e.g. 2024) or Status (e.g. Ongoing)] [| github.com/username/project] [| live_link_url]"
     Example: "2024 | github.com/username/project | my-demo.vercel.app" or "Ongoing | github.com/username/project" or "2024 | my-demo.vercel.app"
   - "bullets": Array of exactly ${projectLines} technical highlights
5. LEADERSHIP: Non-work impact or community roles.
   - "heading": "[Role Name] @ [Organization / Community Name]"
   - "content": Duration (e.g., "Sep 2022 – Dec 2023")
   - "bullets": Array of impact highlights
6. SKILLS: Categorized (e.g., "Languages: Python, Go").
7. CERTIFICATIONS: Each item in the array must strictly match this format:
   "[Certificate/Course Name] ([Issuing Entity / Company Name]) - [Year Done]"
   Example: "AWS Solutions Architect (Amazon Web Services) - 2024"
8. AWARDS: Each item in the array must strictly match this format:
   "[Award/Honor Name] ([Awarding Body]) - [Year Received]"
   Example: "Hackathon Winner (Google Cloud) - 2024"
 
Return ONLY a JSON object with this exact structure:
{
  "professional_summary": "[Synthesize a highly tailored professional summary. ${summarySchemaRule}]",
  "skills_section": ["Languages: ...", "Frameworks: ..."],
  "experience": [
    {
      "heading": "Job Title @ Company - Mode (Location)",
      "content": "Duration",
      "bullets": ["[Bullet 1]", "[Bullet 2]"]
    }
  ],
  "products": [
    {
      "heading": "Product Name - Tech Stack",
      "content": "Live | github.com/username/product | live_link_url",
      "bullets": ["[Bullet 1]"]
    }
  ],
  "projects": [
    {
      "heading": "Project Name - Tech Stack",
      "content": "2024 | github.com/username/project | live_link_url",
      "bullets": ["[Bullet 1]"]
    }
  ],
  "leadership": [
    {
      "heading": "Role @ Organization",
      "content": "Timeline",
      "bullets": ["[Bullet 1]"]
    }
  ],
  "education": ["Course Name @ College Name - Location | Timeline | GPA: X.X"],
  "certifications": ["Cert Name (Issuer) - Year"],
  "awards": ["Award Name (Organization) - Year"]
}`;

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      let resultText = "";
      const models = [
        "llama-3.3-70b-versatile",    // High intelligence (Standard / Primary)
        "llama-3.1-70b-versatile",    // Fallback intelligence
        "mixtral-8x7b-32768",         // Secondary fallback
        "llama-3.1-8b-instant"        // Instant baseline fallback
      ];
      let lastError = "";

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
          console.log(`Lumina Tailoring: Attempting with ${model}...`);
          // Update toast or state to show which model is active
          if (i > 0) toast.loading(`Switching to fallback engine: ${model}...`, { id: "gen-toast" });

          let { data: rawData, error: invokeError } = await supabase.functions.invoke("analyze", {
            body: {
              model: model,
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              response_format: { type: "json_object" },
              max_tokens: 4000
            }
          });

          // ── EMERGENCY FALLBACK: Try Local API Proxy if Edge Function Fails ──
          if (invokeError) {
            console.warn(`Lumina Intelligence: Primary Edge Function error for ${model}. Triggering Local API Proxy Fallback...`);
            try {
              const apiResponse = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: "user", content: prompt }],
                  temperature: 0.3,
                  response_format: { type: "json_object" },
                  max_tokens: 4000
                })
              });
              
              if (apiResponse.ok) {
                rawData = await apiResponse.json();
                invokeError = null;
                console.log(`Lumina Intelligence: Success via Local API Proxy with ${model}`);
              } else {
                const proxyError = await apiResponse.json().catch(() => ({ error: apiResponse.statusText }));
                lastError = `Proxy Fault (${apiResponse.status}): ${proxyError.details || proxyError.error || "Unknown error"}`;
                console.error(`Lumina Intelligence: Local API Proxy failed for ${model}:`, lastError);
              }
            } catch (apiErr) {
              lastError = `Proxy Connection Fault: ${apiErr instanceof Error ? apiErr.message : String(apiErr)}`;
              console.error("Local API Proxy connection failed:", apiErr);
            }
          }

          if (invokeError) {
            // Check if invokeError has a response body we can parse
            let detailedMessage = invokeError.message;
            
            // Handle Supabase function error details if available
            if (invokeError.name === 'FunctionsHttpError') {
              try {
                const body = await invokeError.context.json();
                detailedMessage = body.details || body.error || detailedMessage;
              } catch (e) {
                // Not JSON or no context
              }
            }

            // Only update lastError if proxy didn't already set a more specific one
            if (!lastError.includes("Proxy")) {
              lastError = detailedMessage || "Function invocation failed";
            }
            
            if (invokeError.status === 429) {
               console.warn(`Lumina Tailoring: Model ${model} rate limited. Waiting 1500ms...`);
               await sleep(1500);
            }
            continue;
          }

          if (!rawData) {
            lastError = "Empty response from engine";
            continue;
          }

          if (rawData.error) {
            lastError = rawData.error;
            if (rawData.error.includes("429")) {
              console.warn(`Lumina Tailoring: Engine reported 429 for ${model}. Waiting 1500ms...`);
              await sleep(1500);
            }
            continue;
          }

          const content = rawData.choices?.[0]?.message?.content;
          if (content) {
            resultText = content;
            console.log(`Lumina Tailoring: Success with ${model}`);
            toast.success(`Silicon Valley Modern resume generated via ${model}!`, { id: "gen-toast" });
            break;
          }
        } catch (err) {
          lastError = err instanceof Error ? err.message : String(err);
          console.error(`Lumina Tailoring: ${model} crash:`, lastError);
          // If this is the last model, we'll throw the error outside the loop
        }
      }

      if (!resultText) {
        toast.error("Deep Tailoring Fault", {
          id: "gen-toast",
          description: `All AI engines were unable to process this request. Specific Error: ${lastError.slice(0, 100)}... 
          Troubleshooting: 
          1. Ensure your Master Vault (Profile tab) is not empty.
          2. Check if your Groq API Key has reached its rate limit.
          3. Try with a shorter Job Description.`,
          duration: 6000
        });
        return;
      }

      let structData;
      try {
        const firstBrace = resultText.indexOf("{");
        const lastBrace = resultText.lastIndexOf("}");
        if (firstBrace === -1 || lastBrace === -1) throw new Error("Invalid JSON structure");
        structData = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));
      } catch (parseErr) {
        console.error("Tailoring Parse Error:", resultText);
        throw new Error("AI returned malformed candidacy data. Please try again.");
      }

      const hydratedData = sanitizeGeneratedResume(structData, summaryLines);

      setResume(hydratedData);
      setEditableResume(hydratedData);
      setIsOpen(true);
      toast.success("Silicon Valley Modern resume generated!");
    } catch (err: unknown) {
      console.error("Generation process failed:", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      const isMissingKey = errorMessage.includes("your_groq_api_key_here") || errorMessage.includes("Missing GROQ_API_KEY");
      
      toast.error("Tailoring Engine Fault", {
        description: isMissingKey 
          ? "Groq API Key not configured. Please add your key to the .env file or Supabase secrets."
          : errorMessage || "System overloaded. Retrying in 30s...",
        duration: 8000
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddExperience = () => {
    setAddingSection('experience');
  };

  const handleManualAddExperience = () => {
    if (!editableResume) return;
    const newItems = [...editableResume.experience, { heading: "New Experience", content: "", bullets: ["• New bullet point"] }];
    setEditableResume({ ...editableResume, experience: newItems });
    setAddingSection(null);
  };

  const handleRemoveExperience = (index: number) => {
    if (!editableResume) return;
    const newItems = editableResume.experience.filter((_, i) => i !== index);
    setEditableResume({ ...editableResume, experience: newItems });
  };

  const handleAddProject = () => {
    setAddingSection('projects');
  };

  const handleManualAddProject = () => {
    if (!editableResume) return;
    const newItems = [...(editableResume.projects || []), { heading: "New Project", content: "", bullets: ["• Strategic achievement bullet"] }];
    setEditableResume({ ...editableResume, projects: newItems });
    setAddingSection(null);
  };

  const handleRemoveProject = (index: number) => {
    if (!editableResume) return;
    const newItems = (editableResume.projects || []).filter((_, i) => i !== index);
    setEditableResume({ ...editableResume, projects: newItems });
  };

  const handleAddEducation = () => {
    setAddingSection('education');
  };

  const handleManualAddEducation = () => {
    if (!editableResume) return;
    const newItems = [...editableResume.education, "New Degree - University Name"];
    setEditableResume({ ...editableResume, education: newItems });
    setAddingSection(null);
  };

  const handleRemoveEducation = (index: number) => {
    if (!editableResume) return;
    const newItems = editableResume.education.filter((_, i) => i !== index);
    setEditableResume({ ...editableResume, education: newItems });
  };

  const handleAddCertification = () => {
    setAddingSection('certifications');
  };

  const handleManualAddCertification = () => {
    if (!editableResume) return;
    const certs = editableResume.certifications || [];
    const newItems = [...certs, "Certification Name (Issuer)"];
    setEditableResume({ ...editableResume, certifications: newItems });
    setAddingSection(null);
  };

  const handleRemoveCertification = (index: number) => {
    if (!editableResume) return;
    const certs = editableResume.certifications || [];
    const newItems = certs.filter((_, i) => i !== index);
    setEditableResume({ ...editableResume, certifications: newItems });
  };

  const handleAddFromVault = (item: VaultItem) => {
    if (!editableResume) return;
    
    if (item.type === 'project') {
      const projects = editableResume.projects || [];
      setEditableResume({
        ...editableResume,
        projects: [...projects, { 
          heading: item.organization ? `${item.title} @ ${item.organization}` : item.title, 
          content: item.description, 
          bullets: item.bullets && item.bullets.length > 0 ? item.bullets : ["• Synthesizing metrics from tactical vault..."] 
        }]
      });
    } else if (item.type === 'professional') {
      setEditableResume({
        ...editableResume,
        experience: [...editableResume.experience, { 
          heading: item.organization ? `${item.title} @ ${item.organization}` : item.title, 
          content: item.description, 
          bullets: item.bullets && item.bullets.length > 0 ? item.bullets : ["• Synthesizing metrics from tactical vault..."] 
        }]
      });
    } else if (item.type === 'education') {
      const eduEntry = item.organization ? `${item.title} - ${item.organization}` : item.title;
      setEditableResume({
        ...editableResume,
        education: [...editableResume.education, eduEntry]
      });
    } else if (item.type === 'certification') {
      const certifications = editableResume.certifications || [];
      const certEntry = item.organization ? `${item.title} (${item.organization})` : item.title;
      setEditableResume({
        ...editableResume,
        certifications: [...certifications, certEntry]
      });
    }
    
    setAddingSection(null);
    toast.success(`Imported ${item.title} from vault!`);
  };
  
  const handleSaveDraft = async () => {
    if (!user || !editableResume) {
      toast.error("Please generate a resume first.");
      return;
    }
    
    try {
      const { data, error } = await supabase.from("generated_resumes").upsert({
        ...(draftId ? { id: draftId } : {}),
        user_id: user.id,
        job_title: jdTitle,
        content: editableResume,
        header_data: editableHeader,
        status: 'draft',
        updated_at: new Date().toISOString(),
        settings: {
          fontFamily,
          nameFontSize,
          headlineFontSize,
          subHeadlineFontSize,
          bodyFontSize,
          tone,
          summaryLines,
          experienceBullets,
          projectLines,
          productLines
        }
      } as any, { onConflict: 'user_id,job_title' }).select("id"); // eslint-disable-line @typescript-eslint/no-explicit-any

      if (error) {
        console.error("Database save error:", error);
        toast.error(`Save failed: ${error.message || "Database rejected the draft"}`);
        return;
      }
      
      if (data && data.length > 0) {
        setDraftId(data[0].id);
      }
      
      fetchSavedResumes(); // Refresh archive list
      toast.success("Resume draft saved successfully!");
    } catch (err: unknown) {
      console.error("Unexpected save error:", err);
      const message = (err as { message?: string })?.message || (typeof err === 'string' ? err : "Unknown process error");
      toast.error(`Save crashed: ${message}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!resume) return;
    try {
      // SILICON VALLEY MODERN: High-legibility Sans-Serif (Helvetica/Arial)
      const pdf = new jsPDF("p", "mm", "a4");
      const margin = 10; // 1cm margin all side
      let y = margin;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const contentWidth = pageWidth - margin * 2;
      const fontMap = {
        "Inter": "helvetica",
        "Roboto": "helvetica",
        "Merriweather": "times",
        "Arial": "helvetica"
      };
      const currentFont = fontMap[fontFamily as keyof typeof fontMap] || "helvetica";

      // Helper function to scale coordinates based on font sizes (pt to mm)
      const ptToMm = (pt: number) => pt * 0.352778;
      const getLineHeight = (fontSizePt: number, multiplier = 1.25) => {
        return ptToMm(fontSizePt) * multiplier;
      };

      // Truncate text to fit a specific width in jsPDF
      const truncateText = (text: string, maxWidth: number, fontSize: number, isBold = false): string => {
        const cleanText = sanitizePdfText(text);
        pdf.setFont(currentFont, isBold ? "bold" : "normal");
        pdf.setFontSize(fontSize);
        if (pdf.getTextWidth(cleanText) <= maxWidth) return cleanText;
        
        let truncated = cleanText;
        while (truncated.length > 0 && pdf.getTextWidth(truncated + "...") > maxWidth) {
          truncated = truncated.slice(0, -1);
        }
        return truncated + "...";
      };

      const addText = (text: string, size: number, isBold = false, color: number[] = [0, 0, 0], align: "left" | "center" = "left") => {
        const cleanText = sanitizePdfText(text);
        pdf.setFont(currentFont, isBold ? "bold" : "normal");
        pdf.setFontSize(size);
        pdf.setTextColor(color[0], color[1], color[2]);
        const lines = pdf.splitTextToSize(cleanText, contentWidth);
        lines.forEach((line: string) => {
          if (y > 287) { pdf.addPage(); y = margin; }
          const xPos = align === "center" ? (pageWidth - pdf.getTextWidth(line)) / 2 : margin;
          pdf.text(line, xPos, y);
          y += getLineHeight(size, 1.2);
        });
        y += getLineHeight(size, 0.15);
      };

      // Header: Ultra-clean center aligned
      addText(editableHeader.fullName.toUpperCase(), nameFontSize, true, [0, 0, 0], "center");
      y += getLineHeight(nameFontSize, 0.15); // Increased spacing after name
      
      const contactLines = [
        editableHeader.location,
        editableHeader.phone,
        editableHeader.email.toLowerCase()
      ].filter(Boolean).join("  |  ");
      addText(contactLines, bodyFontSize * 0.9, false, [0, 0, 0], "center");
      
      const linkItems = [
        { label: editableHeader.linkedin ? "LINKEDIN" : "", url: formatUrl(editableHeader.linkedin) },
        { label: editableHeader.github ? "GITHUB" : "", url: formatUrl(editableHeader.github) },
        { label: editableHeader.portfolio ? "PORTFOLIO" : "", url: formatUrl(editableHeader.portfolio) }
      ].filter(item => item.label && item.url);

      if (linkItems.length > 0) {
        y += getLineHeight(bodyFontSize, 0.45); // Increased spacing for links
        const totalWidth = linkItems.reduce((acc, item) => acc + pdf.getTextWidth(item.label) + 15, 0) - 15;
        let currentX = (pageWidth - totalWidth) / 2;
        
        linkItems.forEach((item, idx) => {
          pdf.setFont(currentFont, "normal");
          pdf.setFontSize(bodyFontSize * 0.85);
          pdf.setTextColor(0, 0, 0); // Strictly black links
          pdf.text(item.label, currentX, y);
          // Add invisible link
          pdf.link(currentX, y - 3, pdf.getTextWidth(item.label), 5, { url: item.url });
          currentX += pdf.getTextWidth(item.label) + 15;
        });
        y += getLineHeight(bodyFontSize, 0.5); // Clear gap after header links
      }
      y += getLineHeight(bodyFontSize, 0.2);

        // --- HEADER ---
        const deepBlack: [number, number, number] = [0, 0, 0];

        const limitSummarySentences = (summaryText: string, maxSentences: number): string => {
          if (!summaryText) return "";
          // Split by sentence boundaries, handling abbreviations safely
          const sentences = summaryText.split(/\.\s+/).filter(Boolean);
          const sliced = sentences
            .slice(0, maxSentences)
            .map(s => s.trim() + (s.trim().endsWith(".") ? "" : "."))
            .join(" ");
            
          // Enforce strict character budget matching lines
          const budget = maxSentences === 1 ? 115 : maxSentences === 2 ? 230 : maxSentences * 115;
          if (sliced.length > budget + 15) {
            let current = "";
            for (const sent of sentences.slice(0, maxSentences)) {
              const candidate = current ? current + " " + sent : sent;
              if (candidate.length > budget + 10) {
                if (current.length > 50) {
                  break;
                }
                let truncated = candidate.slice(0, budget - 3).trim();
                const lastSpace = truncated.lastIndexOf(" ");
                if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
                current = truncated + "...";
                break;
              }
              current = candidate;
            }
            return current;
          }
          return sliced;
        };

        const limitBullets = (bullets: string[], maxBullets: number): string[] => {
          if (!bullets) return [];
          return bullets.slice(0, maxBullets);
        };

        const checkPageBreak = (neededHeight: number) => {
          if (y + neededHeight > 287) {
            pdf.addPage();
            y = margin;
          }
        };

        const drawSectionHeader = (title: string) => {
          checkPageBreak(15);
          y += getLineHeight(bodyFontSize, 0.4);
          pdf.setTextColor(...deepBlack);
          pdf.setFont(currentFont, "bold");
          pdf.setFontSize(headlineFontSize);
          pdf.text(title.toUpperCase(), margin, y);
          y += getLineHeight(headlineFontSize, 0.25);
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.4);
          pdf.line(margin, y, pageWidth - margin, y);
          y += getLineHeight(subHeadlineFontSize, 1.2); // Balanced gap to prevent heading overlaps with horizontal line
        };

        if (editableResume) {
          // --- SUMMARY ---
          if (editableResume.professional_summary) {
            drawSectionHeader("SUMMARY");
            pdf.setTextColor(0, 0, 0);
            pdf.setFont(currentFont, "normal");
            pdf.setFontSize(bodyFontSize);
            const limitedSummary = sanitizePdfText(limitSummarySentences(editableResume.professional_summary, summaryLines));
            const lines = pdf.splitTextToSize(limitedSummary, contentWidth);
            const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
            checkPageBreak(neededHeight);
            pdf.text(limitedSummary, margin, y, { maxWidth: contentWidth, align: "left" });
            y += neededHeight + 0.5;
          }

          // --- EDUCATION ---
          if (editableResume.education?.length) {
            drawSectionHeader("EDUCATION");
            editableResume.education.forEach(edu => {
              checkPageBreak(10);
              const parts = edu.split('|');
              const mainInfo = parts[0].split('@');
              const degree = mainInfo[0]?.trim() || "Degree";
              const schoolAndLoc = mainInfo[1] || "";
              const schoolParts = schoolAndLoc.split(/\s*[-–—]\s*/);
              const school = schoolParts[0]?.trim() || "University";
              const loc = schoolParts[1]?.trim() || editableHeader.location || "";
              
              const dateText = parts[1]?.trim() || "May 2027";
              const metadata = parts.slice(2).map(p => p.trim()).filter(Boolean).join(' | ');

              const maxRightWidth = contentWidth * 0.35;
              const dateTextTruncated = truncateText(dateText, maxRightWidth, bodyFontSize - 1, false);
              const dateWidth = pdf.getTextWidth(dateTextTruncated);
              const maxSchoolWidth = contentWidth - dateWidth - 6;
              const cleanSchool = truncateText(school, maxSchoolWidth, subHeadlineFontSize, true);

              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "bold");
              pdf.setFontSize(subHeadlineFontSize);
              pdf.text(cleanSchool, margin, y);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize - 1);
              pdf.text(sanitizePdfText(dateTextTruncated), pageWidth - margin, y, { align: "right" });
              y += getLineHeight(subHeadlineFontSize, 1.25);

              const locTextTruncated = truncateText(loc, maxRightWidth, bodyFontSize - 1, false);
              const locWidth = pdf.getTextWidth(locTextTruncated);
              const maxDegreeWidth = contentWidth - locWidth - 6;
              const fullDegree = `${degree}${metadata ? ` | ${metadata}` : ""}`;
              const cleanDegree = truncateText(fullDegree, maxDegreeWidth, bodyFontSize, false);

              pdf.setFont(currentFont, "italic");
              pdf.setFontSize(bodyFontSize);
              pdf.text(cleanDegree, margin, y);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize - 1);
              pdf.text(sanitizePdfText(locTextTruncated), pageWidth - margin, y, { align: "right" });
              y += getLineHeight(bodyFontSize, 1.3);
            });
          }

          // --- EXPERIENCE ---
          if (editableResume.experience?.length) {
            drawSectionHeader("EXPERIENCE");
            editableResume.experience.forEach(exp => {
              checkPageBreak(12);
              const parts = exp.heading.split('@');
              const role = parts[0]?.trim() || "Role";
              const orgParts = parts[1] ? parts[1].split(/\s+[-–—]\s+/) : [];
              const org = orgParts[0]?.trim() || "Organization";
              const rawLocOrMode = orgParts[1]?.trim() || "";
              const loc = getModeOrLocation(rawLocOrMode, editableHeader.location);

              const maxRightWidth = contentWidth * 0.35;
              const dateText = exp.content || "Date – Present";
              const dateTextTruncated = truncateText(dateText, maxRightWidth, bodyFontSize - 1, false);
              const dateWidth = pdf.getTextWidth(dateTextTruncated);
              const maxRoleWidth = contentWidth - dateWidth - 6;
              const cleanRole = truncateText(role, maxRoleWidth, subHeadlineFontSize, true);

              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "bold");
              pdf.setFontSize(subHeadlineFontSize);
              pdf.text(cleanRole, margin, y);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize - 1);
              pdf.text(sanitizePdfText(dateTextTruncated), pageWidth - margin, y, { align: "right" });
              y += getLineHeight(subHeadlineFontSize, 1.25);

              const locText = loc || "";
              const locTextTruncated = truncateText(locText, maxRightWidth, bodyFontSize - 1, false);
              const locWidth = pdf.getTextWidth(locTextTruncated);
              const maxOrgWidth = contentWidth - locWidth - 6;
              const cleanOrg = truncateText(org, maxOrgWidth, bodyFontSize, false);

              pdf.setFont(currentFont, "italic");
              pdf.setFontSize(bodyFontSize);
              pdf.text(cleanOrg, margin, y);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize - 1);
              pdf.text(sanitizePdfText(locTextTruncated), pageWidth - margin, y, { align: "right" });
              y += getLineHeight(bodyFontSize, 1.25);

              (exp.bullets || []).forEach(bullet => {
                pdf.setFont(currentFont, "normal");
                pdf.setFontSize(bodyFontSize);
                const cleanBullet = sanitizePdfText(bullet.replace(/^[•\s*-]+/, '').trim());
                const lines = pdf.splitTextToSize(cleanBullet, contentWidth - 4.5);
                const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
                checkPageBreak(neededHeight);
                pdf.text("•", margin + 1.5, y);
                pdf.text(cleanBullet, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
                y += neededHeight;
              });
              y += getLineHeight(bodyFontSize, 0.4);
            });
          }

          // --- PRODUCTS ---
          if (editableResume.products?.length) {
            drawSectionHeader("PRODUCTS & VENTURES");
            editableResume.products.forEach(prod => {
              checkPageBreak(12);
              
              const headingParts = prod.heading.split(/\s+[-–—]\s+/);
              const title = headingParts[0]?.trim() || "Product";
              const status = headingParts.slice(1).join(" | ")?.trim();

              const parsedContent = parseProductOrProjectContent(prod.content);
              const rightWidth = measureOrDrawRightSideLinks(
                pdf,
                parsedContent.statusOrYear,
                parsedContent.urls,
                y,
                margin,
                pageWidth,
                bodyFontSize,
                currentFont,
                false // measure first
              );
              
              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "bold");
              pdf.setFontSize(subHeadlineFontSize);
              
              const maxTitleStackWidth = contentWidth - rightWidth - 6;
              const titleWidth = pdf.getTextWidth(title);
              
              if (titleWidth > maxTitleStackWidth) {
                const cleanTitle = truncateText(title, maxTitleStackWidth, subHeadlineFontSize, true);
                pdf.text(cleanTitle, margin, y);
              } else {
                pdf.text(sanitizePdfText(title), margin, y);
                if (status) {
                  const maxStatusWidth = maxTitleStackWidth - titleWidth - 2;
                  const cleanStatus = truncateText(` | ${status}`, maxStatusWidth, bodyFontSize, false);
                  pdf.setFont(currentFont, "normal");
                  pdf.setFontSize(bodyFontSize);
                  pdf.text(cleanStatus, margin + titleWidth + 2, y);
                }
              }

              measureOrDrawRightSideLinks(
                pdf,
                parsedContent.statusOrYear,
                parsedContent.urls,
                y,
                margin,
                pageWidth,
                bodyFontSize,
                currentFont,
                true // draw
              );
              y += getLineHeight(subHeadlineFontSize, 1.25);

              (prod.bullets || []).forEach(bullet => {
                pdf.setFont(currentFont, "normal");
                pdf.setFontSize(bodyFontSize);
                const cleanBullet = sanitizePdfText(bullet.replace(/^[•\s*-]+/, '').trim());
                const lines = pdf.splitTextToSize(cleanBullet, contentWidth - 4.5);
                const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
                checkPageBreak(neededHeight);
                pdf.text("•", margin + 1.5, y);
                pdf.text(cleanBullet, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
                y += neededHeight;
              });
              y += getLineHeight(bodyFontSize, 0.4);
            });
          }

          // --- PROJECTS ---
          if (editableResume.projects?.length) {
            drawSectionHeader("PROJECTS");
            editableResume.projects.forEach(proj => {
              checkPageBreak(12);
              
              const headingParts = proj.heading.split(/\s+[-–—]\s+/);
              const title = headingParts[0]?.trim() || "Project";
              const stack = headingParts.slice(1).join(" | ")?.trim();

              const parsedProj = parseProductOrProjectContent(proj.content);
              const rightWidth = measureOrDrawRightSideLinks(
                pdf,
                parsedProj.statusOrYear,
                parsedProj.urls,
                y,
                margin,
                pageWidth,
                bodyFontSize,
                currentFont,
                false // measure first
              );
              
              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "bold");
              pdf.setFontSize(subHeadlineFontSize);
              
              const maxTitleStackWidth = contentWidth - rightWidth - 6;
              const titleWidth = pdf.getTextWidth(title);
              
              if (titleWidth > maxTitleStackWidth) {
                const cleanTitle = truncateText(title, maxTitleStackWidth, subHeadlineFontSize, true);
                pdf.text(cleanTitle, margin, y);
              } else {
                pdf.text(sanitizePdfText(title), margin, y);
                if (stack) {
                  const maxStackWidth = maxTitleStackWidth - titleWidth - 2;
                  const cleanStack = truncateText(` | ${stack}`, maxStackWidth, bodyFontSize, false);
                  pdf.setFont(currentFont, "normal");
                  pdf.setFontSize(bodyFontSize);
                  pdf.text(cleanStack, margin + titleWidth + 2, y);
                }
              }

              measureOrDrawRightSideLinks(
                pdf,
                parsedProj.statusOrYear,
                parsedProj.urls,
                y,
                margin,
                pageWidth,
                bodyFontSize,
                currentFont,
                true // draw
              );
              y += getLineHeight(subHeadlineFontSize, 1.25);

              (proj.bullets || []).forEach(bullet => {
                pdf.setFont(currentFont, "normal");
                pdf.setFontSize(bodyFontSize);
                const cleanBullet = sanitizePdfText(bullet.replace(/^[•\s*-]+/, '').trim());
                const lines = pdf.splitTextToSize(cleanBullet, contentWidth - 4.5);
                const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
                checkPageBreak(neededHeight);
                pdf.text("•", margin + 1.5, y);
                pdf.text(cleanBullet, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
                y += neededHeight;
              });
              y += getLineHeight(bodyFontSize, 0.4);
            });
          }

          // --- LEADERSHIP ---
          if (editableResume.leadership?.length) {
            drawSectionHeader("LEADERSHIP");
            editableResume.leadership.forEach(lead => {
              checkPageBreak(12);
              
              const maxRightWidth = contentWidth * 0.35;
              const dateText = lead.content || "";
              const dateTextTruncated = truncateText(dateText, maxRightWidth, bodyFontSize - 1, false);
              const dateWidth = dateTextTruncated ? pdf.getTextWidth(dateTextTruncated) : 0;
              const maxHeadingWidth = contentWidth - dateWidth - 6;
              const cleanHeading = truncateText(lead.heading, maxHeadingWidth, subHeadlineFontSize, true);

              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "bold");
              pdf.setFontSize(subHeadlineFontSize);
              pdf.text(cleanHeading, margin, y);
              
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize - 1);
              if (dateTextTruncated) {
                pdf.text(sanitizePdfText(dateTextTruncated), pageWidth - margin, y, { align: "right" });
              }
              y += getLineHeight(subHeadlineFontSize, 1.25);

              (lead.bullets || []).forEach(bullet => {
                pdf.setFont(currentFont, "normal");
                pdf.setFontSize(bodyFontSize);
                const cleanBullet = sanitizePdfText(bullet.replace(/^[•\s*-]+/, '').trim());
                const lines = pdf.splitTextToSize(cleanBullet, contentWidth - 4.5);
                const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
                checkPageBreak(neededHeight);
                pdf.text("•", margin + 1.5, y);
                pdf.text(cleanBullet, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
                y += neededHeight;
              });
              y += getLineHeight(bodyFontSize, 0.4);
            });
          }

          // --- SKILLS ---
          if (editableResume.skills_section?.length) {
            drawSectionHeader("SKILLS");
            
            // Group skills side-by-side to reduce vertical space footprint
            const skillLinesToProcess = [...editableResume.skills_section];
            let currentLineText = "";
            const processedLines: string[] = [];
            
            for (let i = 0; i < skillLinesToProcess.length; i++) {
              const skillLine = skillLinesToProcess[i];
              const parts = skillLine.split(':');
              const category = parts[0]?.trim() || "";
              const skills = parts[1]?.trim() || "";
              
              if (!category) continue;
              const formattedItem = `${category}: ${skills}`;
              
              if (!currentLineText) {
                currentLineText = formattedItem;
              } else {
                const testLine = `${currentLineText}   |   ${formattedItem}`;
                if (pdf.getTextWidth(testLine) < contentWidth) {
                  currentLineText = testLine;
                } else {
                  processedLines.push(currentLineText);
                  currentLineText = formattedItem;
                }
              }
            }
            if (currentLineText) {
              processedLines.push(currentLineText);
            }

            processedLines.forEach(lineText => {
              checkPageBreak(6);
              const parts = lineText.split('   |   ');
              let currentX = margin;
              
              if (parts.length === 1) {
                const part = parts[0];
                const [category, skills] = part.split(':');
                const categoryText = `${category?.trim() || ""}: `;
                
                pdf.setTextColor(0, 0, 0);
                pdf.setFont(currentFont, "bold");
                pdf.setFontSize(bodyFontSize);
                pdf.text(categoryText, margin, y);
                
                const categoryWidth = pdf.getTextWidth(categoryText);
                pdf.setFont(currentFont, "normal");
                pdf.setFontSize(bodyFontSize);
                const skillsText = skills?.trim() || "";
                const lines = pdf.splitTextToSize(skillsText, contentWidth - categoryWidth);
                lines.forEach((line: string, lineIdx: number) => {
                  checkPageBreak(getLineHeight(bodyFontSize, 1.25));
                  const xPos = lineIdx === 0 ? margin + categoryWidth : margin;
                  pdf.text(line, xPos, y);
                  y += getLineHeight(bodyFontSize, 1.2);
                });
                y += 0.4;
              } else {
                parts.forEach((part, idx) => {
                  if (idx > 0) {
                    pdf.setFont(currentFont, "normal");
                    pdf.setFontSize(bodyFontSize);
                    pdf.setTextColor(120, 120, 120);
                    pdf.text("   |   ", currentX, y);
                    currentX += pdf.getTextWidth("   |   ");
                  }
                  
                  const [category, skills] = part.split(':');
                  const categoryText = `${category?.trim() || ""}: `;
                  
                  pdf.setTextColor(0, 0, 0);
                  pdf.setFont(currentFont, "bold");
                  pdf.setFontSize(bodyFontSize);
                  pdf.text(categoryText, currentX, y);
                  currentX += pdf.getTextWidth(categoryText);
                  
                  pdf.setFont(currentFont, "normal");
                  pdf.setFontSize(bodyFontSize);
                  const skillsText = skills?.trim() || "";
                  pdf.text(skillsText, currentX, y);
                  currentX += pdf.getTextWidth(skillsText);
                });
                y += getLineHeight(bodyFontSize, 1.2) + 0.4;
              }
            });
          }

          // --- CERTIFICATIONS ---
          if (editableResume.certifications?.length) {
            drawSectionHeader("CERTIFICATIONS");
            editableResume.certifications.forEach(cert => {
              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize);
              const cleanCert = sanitizePdfText(cert.replace(/^[•\s*-]+/, '').trim());
              const lines = pdf.splitTextToSize(cleanCert, contentWidth - 4.5);
              const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
              checkPageBreak(neededHeight);
              pdf.text("•", margin + 1.5, y);
              pdf.text(cleanCert, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
              y += neededHeight;
            });
          }

          // --- AWARDS ---
          if (editableResume.awards?.length) {
            drawSectionHeader("HONORS & AWARDS");
            editableResume.awards.forEach(award => {
              pdf.setTextColor(0, 0, 0);
              pdf.setFont(currentFont, "normal");
              pdf.setFontSize(bodyFontSize);
              const cleanAward = sanitizePdfText(award.replace(/^[•\s*-]+/, '').trim());
              const lines = pdf.splitTextToSize(cleanAward, contentWidth - 4.5);
              const neededHeight = lines.length * getLineHeight(bodyFontSize, 1.2);
              checkPageBreak(neededHeight);
              pdf.text("•", margin + 1.5, y);
              pdf.text(cleanAward, margin + 4.5, y, { maxWidth: contentWidth - 4.5, align: "left" });
              y += neededHeight;
            });
          }
        }

      const safeName = (editableHeader.fullName || profile?.full_name || "Resume").replace(/[^a-z0-9]/gi, '_');
      
      try {
        pdf.save(`Lumina-AI-Resume-${safeName}.pdf`);
        toast.success("Silicon Valley Modern PDF Exported!");
      } catch (saveErr) {
        // Fallback for manual trigger if pdf.save() fails
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = url;
        link.setAttribute('download', `Lumina-AI-Resume-${safeName}.pdf`);
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 200);
        toast.success("PDF exported via fallback!");
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to render Premium PDF.");
    }
  };

  const handleDownloadDOC = () => {
    if (!resume || !editableResume) return;
    try {
      const getHtmlFont = (font: string) => {
        switch(font) {
          case "Inter": return "Inter, sans-serif";
          case "Roboto": return "Roboto, sans-serif";
          case "Merriweather": return "Merriweather, serif";
          case "Arial": return "Arial, sans-serif";
          default: return "Inter, sans-serif";
        }
      };

      const limitSummarySentences = (summaryText: string, maxSentences: number): string => {
        if (!summaryText) return "";
        // Split by sentence boundaries, handling abbreviations safely
        const sentences = summaryText.split(/\.\s+/).filter(Boolean);
        const sliced = sentences
          .slice(0, maxSentences)
          .map(s => s.trim() + (s.trim().endsWith(".") ? "" : "."))
          .join(" ");
          
        // Enforce strict character budget matching lines
        const budget = maxSentences === 1 ? 115 : maxSentences === 2 ? 230 : maxSentences * 115;
        if (sliced.length > budget + 15) {
          let current = "";
          for (const sent of sentences.slice(0, maxSentences)) {
            const candidate = current ? current + " " + sent : sent;
            if (candidate.length > budget + 10) {
              if (current.length > 50) {
                break;
              }
              let truncated = candidate.slice(0, budget - 3).trim();
              const lastSpace = truncated.lastIndexOf(" ");
              if (lastSpace > 0) truncated = truncated.slice(0, lastSpace);
              current = truncated + "...";
              break;
            }
            current = candidate;
          }
          return current;
        }
        return sliced;
      };

      const headerMeta = [
        editableHeader.location,
        editableHeader.phone,
        editableHeader.email,
        editableHeader.linkedin ? `LinkedIn: ${editableHeader.linkedin.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : '',
        editableHeader.github ? `GitHub: ${editableHeader.github.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : '',
        editableHeader.portfolio ? `Portfolio: ${editableHeader.portfolio.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : ''
      ].filter(Boolean).join(" &nbsp;|&nbsp; ");

      // Section templates mirroring ResumePreview structure perfectly
      const summaryHtml = editableResume.professional_summary ? `
        <div class="section-title-container">
          <h2 class="section-title">Professional Summary</h2>
        </div>
        <p class="summary-text">${limitSummarySentences(editableResume.professional_summary, summaryLines)}</p>
      ` : "";

      const educationHtml = (editableResume.education && editableResume.education.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Education</h2>
        </div>
        ${editableResume.education.map(edu => {
          const parts = (edu || "").split('|');
          const mainInfo = (parts[0] || "").split('@');
          const degree = mainInfo[0]?.trim() || "Degree";
          const schoolAndLoc = mainInfo[1] || "";
          const schoolParts = schoolAndLoc.split(/\s*[-–—]\s*/);
          const school = schoolParts[0]?.trim() || "University";
          const loc = schoolParts[1]?.trim() || editableHeader.location || "";
          const dateText = parts[1]?.trim() || "May 2027";
          const metadata = parts.slice(2).map(p => p.trim()).filter(Boolean).join(' | ');

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${bodyFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${school}</td>
                <td style="text-align: right; font-weight: bold; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-style: italic; font-size: ${bodyFontSize - 1}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${degree} ${metadata ? `| ${metadata}` : ''}</td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${loc}</td>
              </tr>
            </table>
          `;
        }).join("")}
      ` : "";

      const experienceHtml = (editableResume.experience && editableResume.experience.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Experience</h2>
        </div>
        ${editableResume.experience.map(exp => {
          const parts = (exp.heading || "").split('@');
          const role = parts[0]?.trim() || "Role";
          const orgParts = parts[1] ? parts[1].split(/\s+[-–—]\s+/) : [];
          const org = orgParts[0]?.trim() || "Organization";
          const rawLocOrMode = orgParts[1]?.trim() || "";
          const location = getModeOrLocation(rawLocOrMode, editableHeader.location || "");
          const bulletsToRender = exp.bullets || [];

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${role}</td>
                <td style="text-align: right; font-weight: bold; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${exp.content || "Date – Present"}</td>
              </tr>
              <tr>
                <td style="text-align: left; font-style: italic; font-size: ${bodyFontSize - 1}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${org}</td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${location}</td>
              </tr>
            </table>
            ${bulletsToRender.length > 0 ? `
              <ul class="bullet-list">
                ${bulletsToRender.map(bullet => `
                  <li class="bullet-item">${(bullet || "").replace(/^[•\s*-]+/, '').trim()}</li>
                `).join("")}
              </ul>
            ` : ""}
          `;
        }).join("")}
      ` : "";

      const productsHtml = (editableResume.products && editableResume.products.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Products & Ventures</h2>
        </div>
        ${editableResume.products.map(prod => {
          const headingParts = (prod.heading || "").split(/\s+[-–—]\s+/);
          const title = headingParts[0] || "Product";
          const status = headingParts.slice(1).join(" | ");
          const bulletsToRender = prod.bullets || [];

          const parsed = parseProductOrProjectContent(prod.content);
          let productLinkHtml = "";
          const pParts = [];
          if (parsed.statusOrYear) {
            pParts.push(`<span style="font-family: ${getHtmlFont(fontFamily)};">${parsed.statusOrYear}</span>`);
          }
          parsed.urls.forEach(url => {
            const href = url.startsWith("http") ? url : `https://${url}`;
            const isGithub = url.includes("github.com");
            const label = isGithub ? "GitHub" : "Live Link";
            pParts.push(`<a href="${href}" style="color: #0d9488; text-decoration: underline; font-family: ${getHtmlFont(fontFamily)};">${label}</a>`);
          });
          productLinkHtml = pParts.length > 0 ? pParts.join(" | ") : `<span style="font-family: ${getHtmlFont(fontFamily)};">Operational</span>`;

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">
                  ${title?.trim()} <span style="font-weight: normal; opacity: 0.6; font-family: ${getHtmlFont(fontFamily)};">| ${status?.trim()}</span>
                </td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${productLinkHtml}</td>
              </tr>
            </table>
            ${bulletsToRender.length > 0 ? `
              <ul class="bullet-list">
                ${bulletsToRender.map(bullet => `
                  <li class="bullet-item">${(bullet || "").replace(/^[•\s*-]+/, '').trim()}</li>
                `).join("")}
              </ul>
            ` : ""}
          `;
        }).join("")}
      ` : "";

      const projectsHtml = (editableResume.projects && editableResume.projects.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Projects</h2>
        </div>
        ${editableResume.projects.map(proj => {
          const headingParts = (proj.heading || "").split(/\s+[-–—]\s+/);
          const title = headingParts[0] || "Project";
          const stack = headingParts.slice(1).join(" | ");
          const bulletsToRender = proj.bullets || [];

          const parsedProj = parseProductOrProjectContent(proj.content);
          const prParts = [];
          if (parsedProj.statusOrYear) {
            prParts.push(`<span style="font-family: ${getHtmlFont(fontFamily)};">${parsedProj.statusOrYear}</span>`);
          }
          parsedProj.urls.forEach(url => {
            const href = url.startsWith("http") ? url : `https://${url}`;
            const isGithub = url.includes("github.com");
            const label = isGithub ? "GitHub" : "Live Link";
            prParts.push(`<a href="${href}" style="color: #0d9488; text-decoration: underline; font-family: ${getHtmlFont(fontFamily)};">${label}</a>`);
          });
          const projectLinkHtml = prParts.length > 0 ? prParts.join(" | ") : `<span style="font-family: ${getHtmlFont(fontFamily)};">Ongoing</span>`;

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">
                  ${title?.trim()} <span style="font-weight: normal; opacity: 0.6; font-family: ${getHtmlFont(fontFamily)};">| ${stack?.trim()}</span>
                </td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${projectLinkHtml}</td>
              </tr>
            </table>
            ${bulletsToRender.length > 0 ? `
              <ul class="bullet-list">
                ${bulletsToRender.map(bullet => `
                  <li class="bullet-item">${(bullet || "").replace(/^[•\s*-]+/, '').trim()}</li>
                `).join("")}
              </ul>
            ` : ""}
          `;
        }).join("")}
      ` : "";

      const leadershipHtml = (editableResume.leadership && editableResume.leadership.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Leadership</h2>
        </div>
        ${editableResume.leadership.map(lead => {
          const bulletsToRender = lead.bullets || [];

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${lead.heading || "Role"}</td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${lead.content || "Date – Present"}</td>
              </tr>
            </table>
            ${bulletsToRender.length > 0 ? `
              <ul class="bullet-list">
                ${bulletsToRender.map(bullet => `
                  <li class="bullet-item">${(bullet || "").replace(/^[•\s*-]+/, '').trim()}</li>
                `).join("")}
              </ul>
            ` : ""}
          `;
        }).join("")}
      ` : "";

      const skillsHtml = (editableResume.skills_section && editableResume.skills_section.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Skills</h2>
        </div>
        ${editableResume.skills_section.map(skillLine => {
          const [category, skills] = (skillLine || "").split(':');
          return `
            <p class="skills-category">
              <span class="skills-label">${(category || "").trim()}:</span> ${(skills || "").trim()}
            </p>
          `;
        }).join("")}
      ` : "";

      const certificationsHtml = (editableResume.certifications && editableResume.certifications.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Certifications</h2>
        </div>
        <ul class="bullet-list">
          ${editableResume.certifications.map(cert => `
            <li class="bullet-item">${cert}</li>
          `).join("")}
        </ul>
      ` : "";

      const awardsHtml = (editableResume.awards && editableResume.awards.length > 0) ? `
        <div class="section-title-container">
          <h2 class="section-title">Awards</h2>
        </div>
        <ul class="bullet-list">
          ${editableResume.awards.map(award => `
            <li class="bullet-item">${award}</li>
          `).join("")}
        </ul>
      ` : "";

      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head>
          <meta charset='utf-8'>
          <title>Resume - ${editableHeader.fullName}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Merriweather:ital,wght@0,300;0,400;0,700;1,300&family=Roboto:ital,wght@0,400;0,500;0,700;1,400&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4;
              margin: ${marginSize}in;
            }
            body {
              font-family: ${getHtmlFont(fontFamily)};
              line-height: ${lineSpacing};
              color: #1E2A3A;
              margin: 0;
              padding: 0;
            }
            .section-title-container {
              border-bottom: 1.5px solid #1E2A3A;
              padding-bottom: 2px;
              margin-top: 14px;
              margin-bottom: 6px;
            }
            .section-title {
              font-size: ${headlineFontSize}px;
              font-weight: bold;
              text-transform: uppercase;
              color: #1E2A3A;
              margin: 0;
              padding: 0;
              letter-spacing: 1px;
            }
            p.summary-text {
              font-size: ${bodyFontSize}px;
              color: #1E2A3A;
              text-align: justify;
              margin: 0;
              padding: 0;
            }
            table.meta-table {
              width: 100%;
              border: none;
              border-collapse: collapse;
              margin-top: 4px;
              margin-bottom: 2px;
            }
            table.meta-table td {
              padding: 0;
              vertical-align: top;
            }
            ul.bullet-list {
              margin: 2px 0 6px 0;
              padding-left: 18px;
              list-style-type: disc;
            }
            li.bullet-item {
              font-size: ${bodyFontSize}px;
              color: #1E2A3A;
              line-height: 1.25;
              text-align: justify;
              margin-bottom: 2px;
            }
            .skills-category {
              font-size: ${bodyFontSize}px;
              color: #1E2A3A;
              margin: 0 0 2px 0;
              padding: 0;
              text-align: left;
            }
            .skills-label {
              font-weight: bold;
            }
          </style>
        </head>
        <body>
          <h1 style="font-size: ${nameFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)}; font-weight: bold; text-align: center; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
            ${editableHeader.fullName || "Your Name"}
          </h1>
          <div style="text-align: center; font-size: ${bodyFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)}; margin-bottom: 20px; line-height: 1.4;">
            ${headerMeta}
          </div>
          
          ${summaryHtml}
          ${educationHtml}
          ${experienceHtml}
          ${productsHtml}
          ${projectsHtml}
          ${leadershipHtml}
          ${skillsHtml}
          ${certificationsHtml}
          ${awardsHtml}
        </body>
        </html>
      `;

      const safeName = (editableHeader.fullName || "Resume").replace(/[^a-z0-9]/gi, '_');
      const encodedContent = encodeURIComponent(content);
      const dataUri = `data:application/vnd.ms-word;charset=utf-8,\ufeff${encodedContent}`;
      
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = dataUri;
      link.setAttribute('download', `Lumina-Resume-${safeName}.doc`);
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
      }, 200);
      
      toast.success("Silicon Valley Modern Word Document Exported!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to render Word Document.");
    }
  };

  const generateCoverLetter = async () => {
    // If no resume is generated, we use the raw vault items as context
    const contextData = editableResume || {
      note: "Candidate has not generated a tailored resume yet. Use their Master Vault items as context.",
      experience: vaultItems.map(v => ({ heading: v.title + (v.organization ? ` @ ${v.organization}` : ""), content: v.description, bullets: v.bullets || [] }))
    };

    setIsGeneratingCL(true);
    toast.loading("Synthesizing Cover Letter...", { id: "cl-gen" });

    // Build static system & user prompts matching Deno
    const clSystemPrompt = `You are an elite Silicon Valley Career Strategist specializing in "Human-First" candidacy narratives.
Your goal is to write a high-impact, ready-to-send cover letter that is 100% ATS-optimized while sounding completely human and original.

Tone: ${tone || 'Professional'}
Narrative Focus: ${clFocus || 'Technical Excellence'}
Length Mode: ${clLength || 'Concise'}

STRICT HUMANIZATION GUIDELINES:
1. NO AI-isms: Avoid words like "delve", "testament", "vibrant", "holistic", "meticulous", "passionate about", "unwavering", "synergy", "realm", "bespoke".
2. NO ROBOTIC STRUCTURES: Avoid the typical "I am writing to express my interest..." or "In conclusion, I am confident...". Start with a punchy, unique hook.
3. VARY SENTENCE DYNAMICS: Mix short, impactful sentences with longer, complex ones. Use active voice.
4. BE SPECIFIC: Never use generic praise for the company. Reference specific technical challenges or industry shifts.

ATS ALIGNMENT STRATEGY:
1. SEMANTIC MIRRORING: Identify the 5 most critical keywords/phrases from the Job Description and weave them naturally into the narrative.
2. METRIC-DRIVEN IMPACT: Quantify achievements using the resume data (e.g., "Increased pipeline efficiency by 40%").
3. PROBLEM-SOLUTION FIT: Frame the candidate's skills as a direct solution to the JD's specific pain points.
4. ${clFocus === 'Leadership' ? 'Prioritize leadership metrics and strategic oversight.' : clFocus === 'Cultural' ? 'Highlight mission alignment and team-first philosophy.' : 'Prioritize technical stack proficiency and architectural impact.'}

FORMAT:
- Length: ${clLength === 'Concise' ? 'Under 250 words, extremely punchy.' : 'Under 450 words, providing more narrative depth and specific examples.'}
- Structure: Salutation, Hook/Problem-Solution, Evidence/Metrics, Call to Action, Professional Sign-off.`;

    const clUserPrompt = `Job Description:
${jdTitle + (jdSkills?.length ? ` with skills: ${jdSkills.map(s => s.skill).join(", ")}` : "")}

Candidate's Tailored Resume Data:
${JSON.stringify(contextData)}

Write a compelling, ready-to-send cover letter.`;

    try {
      let content = "";
      
      try {
        console.log("Cover Letter: Invoking Supabase edge function...");
        const { data, error } = await supabase.functions.invoke("cover-letter", {
          body: {
            jd: jdTitle + (jdSkills?.length ? ` with skills: ${jdSkills.map(s => s.skill).join(", ")}` : ""),
            resume: contextData,
            tone: tone,
            focus: clFocus,
            length: clLength
          }
        });

        if (error) throw error;
        content = data?.choices?.[0]?.message?.content || "";
      } catch (invokeError) {
        console.warn("Cover Letter Edge Function failed. Falling back to secure Local API Proxy...", invokeError);
        const apiResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: clSystemPrompt },
              { role: "user", content: clUserPrompt }
            ],
            temperature: 0.7
          })
        });

        if (apiResponse.ok) {
          const rawData = await apiResponse.json();
          content = rawData?.choices?.[0]?.message?.content || "";
        } else {
          throw new Error("Both Supabase edge function and Local API Proxy failed.");
        }
      }

      if (!content) throw new Error("AI returned empty content");

      setCoverLetter(content);
      toast.success("Elite Cover Letter Synthesized!", { id: "cl-gen" });
    } catch (err) {
      console.error("Cover Letter Error:", err);
      toast.error("Failed to generate cover letter.", { id: "cl-gen" });
    } finally {
      setIsGeneratingCL(false);
    }
  };

  const handleDownloadCL = (format: 'pdf' | 'doc') => {
    if (!coverLetter) return;
    const safeName = (editableHeader.fullName || profile?.full_name || "Resume").replace(/[^a-z0-9]/gi, '_');

    if (format === 'doc') {
      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Cover Letter</title></head>
        <body style="font-family: Arial, sans-serif; line-height: 1.5; margin: 1in;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="margin-bottom: 5px;">${editableHeader.fullName}</h2>
            <p>${editableHeader.location} | ${editableHeader.phone} | ${editableHeader.email}</p>
          </div>
          <p>${new Date().toLocaleDateString()}</p>
          <div style="white-space: pre-wrap;">${coverLetter}</div>
        </body>
        </html>
      `;
      const encodedContent = encodeURIComponent(content);
      const dataUri = `data:application/vnd.ms-word;charset=utf-8,\ufeff${encodedContent}`;
      const link = document.createElement('a');
      link.href = dataUri;
      link.setAttribute('download', `Lumina-Cover-Letter-${safeName}.doc`);
      document.body.appendChild(link);
      link.click();
      setTimeout(() => document.body.removeChild(link), 200);
    } else {
      const pdf = new jsPDF();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      
      let y = 20;
      const margin = 20;
      const pageWidth = pdf.internal.pageSize.width;
      const pageHeight = pdf.internal.pageSize.height;
      const lineHeight = 6.0;
      
      // Header
      pdf.setFontSize(16);
      pdf.setFont("helvetica", "bold");
      pdf.text(editableHeader.fullName, pageWidth/2, y, { align: "center" });
      y += 8;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.text(`${editableHeader.location} | ${editableHeader.phone} | ${editableHeader.email}`, pageWidth/2, y, { align: "center" });
      y += 15;
      
      pdf.text(new Date().toLocaleDateString(), margin, y);
      y += 10;
      
      // Body (Wrap-aware and multi-page proof)
      const lines = pdf.splitTextToSize(coverLetter, pageWidth - (margin * 2));
      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(lines[i], margin, y);
        y += lineHeight;
      }
      
      pdf.save(`Lumina-Cover-Letter-${safeName}.pdf`);
    }
  };

  return (
    <div className="glass-panel rounded-[3rem] p-6 lg:p-10 relative overflow-hidden group border-white/20">
      <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none">
        <img src="/favicon.png" alt="Lumina Icon" className="w-80 h-80 rotate-12 grayscale" />
      </div>
      <div className="relative z-10 flex flex-col items-center text-center space-y-6">
        <div className="w-16 h-16 rounded-[2rem] bg-primary/10 flex items-center justify-center border border-primary/20">
          <Wand2 className="w-10 h-10 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-4xl font-serif italic text-foreground tracking-tight">Candidacy Synthesizer</h3>
          <p className="text-[18px] text-muted-foreground max-w-2xl font-medium leading-relaxed font-serif italic opacity-80">
            Our <span className="text-foreground font-semibold not-italic">Silicon Valley Modern</span> engine crafts a high-impact, ATS-optimized signature using only your most relevant tactical experiences.
          </p>
        </div>
      </div>

      {/* ── ACTION SUITE: DUAL ENGINES ── */}
      <div className="relative z-10 w-full mt-16 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* 1. Resume Blueprint Engine */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-10 rounded-[4rem] border-foreground/5 bg-white shadow-2xl shadow-slate-200/50 flex flex-col space-y-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-lumina-teal/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-lumina-teal/10 transition-colors" />
            
            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-lumina-teal/10 flex items-center justify-center text-lumina-teal">
                  <FileText size={28} />
                </div>
                {resume && (
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    <CheckCircle2 size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Blueprint Ready</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic text-slate-900">Resume Blueprint</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Calibrate your strategic parameters before synthesizing a high-fidelity, ATS-hardened resume blueprint.
                </p>
              </div>

              {!resumeSettingsActive ? (
                <button
                  onClick={() => setResumeSettingsActive(true)}
                  className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  <Wand2 size={14} /> Open Detailed Synthesis Options
                </button>
              ) : (
                <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* Promoted Font Scaling Section */}
                  <div className="space-y-4 p-6 rounded-[2.5rem] bg-lumina-teal/5 border border-lumina-teal/20 shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 rounded-full bg-lumina-teal/10 flex items-center justify-center">
                        <Type className="w-4 h-4 text-lumina-teal" />
                      </div>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 block">Resume Typography Scale</label>
                        <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Adjust point sizes for maximum scanability</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Name (pt)</label>
                        <input type="number" min="14" max="48" value={nameFontSize} onChange={e => setNameFontSize(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black shadow-sm focus:ring-2 ring-lumina-teal/20 transition-all outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Headlines (pt)</label>
                        <input type="number" min="8" max="24" value={headlineFontSize} onChange={e => setHeadlineFontSize(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black shadow-sm focus:ring-2 ring-lumina-teal/20 transition-all outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Sub-Headers (pt)</label>
                        <input type="number" min="8" max="20" value={subHeadlineFontSize} onChange={e => setSubHeadlineFontSize(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black shadow-sm focus:ring-2 ring-lumina-teal/20 transition-all outline-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase text-slate-400 ml-1">Body (pt)</label>
                        <input type="number" min="7" max="14" value={bodyFontSize} onChange={e => setBodyFontSize(Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-black shadow-sm focus:ring-2 ring-lumina-teal/20 transition-all outline-none" />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategy Tone</label>
                      <select 
                        value={tone} 
                        onChange={(e) => setTone(e.target.value as "Professional" | "Modern" | "Aggressive")}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        <option value="Modern">Modern</option>
                        <option value="Professional">Professional</option>
                        <option value="Aggressive">Aggressive</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Global Font</label>
                      <select 
                        value={fontFamily} 
                        onChange={(e) => setFontFamily(e.target.value as "Inter" | "Roboto" | "Merriweather" | "Arial")}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        <option value="Inter">Inter (Clean)</option>
                        <option value="Roboto">Roboto (Technical)</option>
                        <option value="Merriweather">Merriweather (Serif)</option>
                        <option value="Arial">Arial (Standard)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Summary Density</label>
                      <select 
                        value={summaryLines} 
                        onChange={(e) => setSummaryLines(Number(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'Line' : 'Lines'}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Experience Bullets</label>
                      <select 
                        value={experienceBullets} 
                        onChange={(e) => setExperienceBullets(Number(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Bullets</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Project Bullets</label>
                      <select 
                        value={projectLines} 
                        onChange={(e) => setProjectLines(Number(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Bullets</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Product/Startup Bullets</label>
                      <select 
                        value={productLines} 
                        onChange={(e) => setProductLines(Number(e.target.value))}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all"
                      >
                        {[2, 3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n} Bullets</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Section Architecture & Sequence</label>
                    <div className="space-y-2 bg-slate-50/50 p-4 rounded-[2rem] border border-slate-100">
                      {sectionOrder.map((section, index) => (
                        <div key={section} className="flex items-center justify-between group/sec bg-white p-3 rounded-xl border border-slate-100 hover:border-lumina-teal/30 transition-all shadow-sm">
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={() => {
                                setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center transition-all ${visibleSections[section] ? 'bg-lumina-teal text-white' : 'bg-slate-200 text-slate-400'}`}
                            >
                              <CheckCircle2 size={12} className={visibleSections[section] ? 'opacity-100' : 'opacity-0'} />
                            </button>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${visibleSections[section] ? 'text-slate-700' : 'text-slate-300 line-through'}`}>{section}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover/sec:opacity-100 transition-opacity">
                            <button 
                              disabled={index === 0}
                              onClick={() => {
                                const newOrder = [...sectionOrder];
                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                setSectionOrder(newOrder);
                              }}
                              title="Move Up"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-all hover:text-lumina-teal"
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button 
                              disabled={index === sectionOrder.length - 1}
                              onClick={() => {
                                const newOrder = [...sectionOrder];
                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                setSectionOrder(newOrder);
                              }}
                              title="Move Down"
                              className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 disabled:opacity-20 transition-all hover:text-lumina-teal"
                            >
                              <ArrowDown size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
                              }}
                              title={visibleSections[section] ? "Remove Section" : "Restore Section"}
                              className={`p-1.5 rounded-lg transition-all ${visibleSections[section] ? 'hover:bg-red-50 text-slate-400 hover:text-red-500' : 'bg-emerald-50 text-emerald-500 hover:bg-emerald-100'}`}
                            >
                              {visibleSections[section] ? <Minus size={12} /> : <Plus size={12} />}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Line Spacing</label>
                      <div className="flex gap-2">
                        {[1.0, 1.15, 1.4].map(s => (
                          <button 
                            key={s} 
                            onClick={() => setLineSpacing(s as 1.0 | 1.15 | 1.4)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${lineSpacing === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {s === 1.0 ? 'Compact' : s === 1.15 ? 'Standard' : 'Relaxed'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Page Margins</label>
                      <div className="flex gap-2">
                        {[0.5, 1.0].map(m => (
                          <button 
                            key={m} 
                            onClick={() => setMarginSize(m as 0.5 | 1.0)}
                            className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${marginSize === m ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}
                          >
                            {m === 0.5 ? 'Narrow' : 'Standard'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={executeTacticalSynthesis}
                    disabled={isGenerating}
                    className="relative overflow-hidden group/btn flex items-center justify-center gap-4 w-full py-6 rounded-full text-[12px] font-black uppercase tracking-[0.2em] bg-lumina-teal text-white hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-70 shadow-xl shadow-teal-500/20"
                  >
                    {isGenerating ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                    ) : resume ? (
                      <><Wand2 className="w-5 h-5" /> Regenerate Blueprint</>
                    ) : (
                      <><Sparkles className="w-5 h-5" /> Generate Blueprint</>
                    )}
                  </button>
                  
                  <button 
                    onClick={() => setResumeSettingsActive(false)}
                    className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Close Settings
                  </button>
                </div>
              )}
            </div>
          </motion.div>

          {/* 2. Cover Letter Synthesis */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="glass-panel p-10 rounded-[4rem] border-foreground/5 bg-white shadow-2xl shadow-slate-200/50 flex flex-col space-y-8 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-900/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-slate-900/10 transition-colors" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center justify-between">
                <div className="w-14 h-14 rounded-2xl bg-slate-900/5 flex items-center justify-center text-slate-900 border border-slate-100">
                  <Mail size={28} />
                </div>
                {coverLetter && (
                  <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                    <CheckCircle2 size={12} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Letter Synthesized</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-serif italic text-slate-900">Cover Letter</h3>
                <p className="text-[13px] text-slate-500 font-medium leading-relaxed">
                  Calibrate your narrative focus and length before synthesizing an elite cover letter.
                </p>
              </div>

              {!clSettingsActive ? (
                <button
                  onClick={() => setClSettingsActive(true)}
                  className="w-full py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
                >
                  <Mail size={14} /> Open Detailed Synthesis Options
                </button>
              ) : (
                <div className="space-y-6 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Narrative Focus</label>
                      <select 
                        value={clFocus} 
                        onChange={(e) => setClFocus(e.target.value as "Technical" | "Leadership" | "Cultural")}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-slate-900/20 transition-all"
                      >
                        <option value="Technical">Technical Excellence</option>
                        <option value="Leadership">Leadership Impact</option>
                        <option value="Cultural">Cultural Alignment</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Length Mode</label>
                      <select 
                        value={clLength} 
                        onChange={(e) => setClLength(e.target.value as "Concise" | "Detailed")}
                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-slate-900/20 transition-all"
                      >
                        <option value="Concise">Concise (Fast Read)</option>
                        <option value="Detailed">Detailed (High Context)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Voice Tone</label>
                    <div className="flex gap-2">
                      {["Modern", "Professional", "Aggressive"].map(t => (
                        <button 
                          key={t} 
                          onClick={() => setTone(t as "Professional" | "Modern" | "Aggressive")}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-widest uppercase transition-all ${tone === t ? 'bg-slate-950 text-white shadow-lg shadow-slate-950/20' : 'bg-slate-50 text-slate-400 border border-slate-100'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      generateCoverLetter();
                      setIsOpen(true);
                    }}
                    disabled={isGeneratingCL}
                    className="relative overflow-hidden group/btn flex items-center justify-center gap-4 w-full py-6 rounded-full text-[12px] font-black uppercase tracking-[0.2em] bg-slate-950 text-white hover:scale-[1.02] transition-all duration-300 active:scale-95 disabled:opacity-70 shadow-xl shadow-slate-950/20"
                  >
                    {isGeneratingCL ? (
                      <><Loader2 className="w-5 h-5 animate-spin" /> Writing...</>
                    ) : coverLetter ? (
                      <><Mail className="w-5 h-5" /> Regenerate Letter</>
                    ) : (
                      <><Mail className="w-5 h-5" /> Synthesize Letter</>
                    )}
                  </button>

                  <button 
                    onClick={() => setClSettingsActive(false)}
                    className="w-full text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    Close Settings
                  </button>
                </div>
              )}
            </div>

            {coverLetter && (
              <div className="flex items-center gap-2 pt-2">
                <button 
                  onClick={() => handleDownloadCL('pdf')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Download size={12} /> PDF
                </button>
                <button 
                  onClick={() => handleDownloadCL('doc')}
                  className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-50 border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-100 transition-all"
                >
                  <Download size={12} /> DOC
                </button>
              </div>
            )}
          </motion.div>
        </div>

        <div className="mt-16 flex flex-col items-center space-y-8">
          <div className="flex flex-wrap justify-center gap-4">
            {[
              "Metric-First bullets",
              "ATS-Gold Template",
              "Semantic Gap Injection"
            ].map((feature) => (
              <div key={feature} className="flex items-center gap-2.5 px-5 py-2 rounded-full bg-slate-50 border border-border/10 text-xs font-black text-primary tracking-widest uppercase opacity-70">
                <CheckCircle2 className="w-4 h-4 text-accent-emerald" />
                {feature}
              </div>
            ))}
          </div>

          <button 
            onClick={() => setShowArchive(!showArchive)}
            className={`flex items-center gap-2.5 px-10 py-4 rounded-full border text-xs font-black tracking-[0.2em] uppercase transition-all ${
              showArchive 
                ? "bg-slate-950 text-white border-slate-950" 
                : "bg-slate-50 border-border/10 text-slate-600 hover:bg-slate-100 shadow-xl shadow-slate-200/40"
            }`}
          >
            <Archive className="w-4 h-4" />
            {showArchive ? "Hide Archive" : `View Saved Blueprints (${savedResumes.length})`}
          </button>

          <AnimatePresence>
            {showArchive && (
              <motion.div 
                initial={{ opacity: 0, height: 0, y: 20 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: 20 }}
                className="w-full max-w-4xl p-8 rounded-[3rem] bg-white/95 border border-zinc-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] backdrop-blur-3xl space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-primary">Blueprint Archive</h4>
                    <p className="text-[9px] text-zinc-500 font-medium font-serif italic">Curated historical candidacy architectural drafts</p>
                  </div>
                  {isLoadingArchive && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
                </div>
                
                {savedResumes.length === 0 ? (
                  <div className="py-10 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-white/10 mx-auto" />
                    <p className="text-xs text-muted-foreground font-serif italic">No architectural blueprints found in history.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                    {savedResumes.map((record) => (
                      <div 
                        key={record.id}
                        onClick={() => handleLoadArchive(record)}
                        className="group p-4 rounded-[1.5rem] bg-slate-50/50 border border-border/10 hover:border-primary/40 hover:bg-slate-50 transition-all cursor-pointer relative"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="space-y-1">
                            <h5 className="text-[11px] font-black text-slate-900 truncate max-w-[180px]">{record.job_title}</h5>
                            <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-widest">
                              {new Date(record.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <button 
                            onClick={(e) => handleDeleteArchive(record.id, e)}
                            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          >
                            <Minus size={12} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${record.id === draftId ? 'bg-accent-emerald animate-pulse' : 'bg-zinc-200'}`} />
                          <span className="text-[8px] font-black uppercase tracking-tighter opacity-60 text-slate-900">
                            {record.id === draftId ? 'Active Signal' : 'Archived Blueprint'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isOpen && resume && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-20 pt-20 border-t border-[#1E2A3A]/10 space-y-24"
          >
            {/* ── Unified Preview & Edit Experience ── */}
            <ResumePreview 
              resume={editableResume || resume}
              header={editableHeader}
              vaultItems={vaultItems}
              isGenerating={isGenerating}
              fontFamily={fontFamily}
              onUpdate={(updatedResume, updatedHeader) => {
                setResume(updatedResume);
                setEditableResume(updatedResume);
                setEditableHeader(updatedHeader);
              }}
              onRegenerate={executeTacticalSynthesis}
              onDownloadPDF={handleDownloadPDF}
              onDownloadDOC={handleDownloadDOC}
              onSave={handleSaveDraft}
              coverLetter={coverLetter}
              isGeneratingCL={isGeneratingCL}
              onGenerateCL={generateCoverLetter}
              onDownloadCL={handleDownloadCL}
              initialTab={forceTab}
              nameFontSize={nameFontSize}
              headlineFontSize={headlineFontSize}
              subHeadlineFontSize={subHeadlineFontSize}
              bodyFontSize={bodyFontSize}
              summaryLines={summaryLines}
              experienceBullets={experienceBullets}
              projectLines={projectLines}
              productLines={productLines}
              marginSize={marginSize}
              lineSpacing={lineSpacing}
            />

            <div className="flex justify-center pb-20">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs font-display font-bold uppercase tracking-[0.5em] text-[#1E2A3A]/40 hover:text-[#1E2A3A] transition-all"
              >
                Close Blueprint Preview
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


