import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Download, Sparkles, Copy, X, Wand2, FileText, CheckCircle2, AlertCircle, ArrowRight, Github, Linkedin, Mail, MapPin, Plus, Minus, Archive, ArrowUp, ArrowDown, Type, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Skill, VaultItem, UserProfileWithVault, GeneratedResume } from "@/types/jd";
import jsPDF from "jspdf";
import { ResumePreview } from "./resume-tailor/ResumePreview";
import { GeneratorSkeleton } from "./resume-tailor/GeneratorSkeleton";
import { matchVaultItems, type VaultMatchResult } from "@/lib/embeddingClient";
import { buildVaultItemsFromProfileJson, buildResumeFromProfileJson } from "@/lib/profileSeed";
import { saveAgentResume, buildResumeTextForAgent } from "@/lib/agentStorage";
import { exportResumeAsHtmlPdf, buildResumeHtml, type GeneratedResumeData, type HeaderData } from "@/lib/htmlPdfExporter";

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
    tailorEngine?: string;
  };
}

const restoreExactProfileData = (generated: GeneratedResume, vaultItems: VaultItem[]): GeneratedResume => {
  if (!generated || !vaultItems || vaultItems.length === 0) return generated;

  // Clone to avoid side effects
  const restored = { ...generated };

  // 1. Restore Professional Experience dates and headings
  if (Array.isArray(restored.experience)) {
    restored.experience = restored.experience.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'professional') return false;
        
        const org = (vItem.organization || "").trim().toLowerCase();
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        
        if (!org) return false;
        if (title) return heading.includes(title);
        return heading.includes(org);
      });

      if (match) {
        const headingParts = (genItem.heading || "").split("@");
        const role = headingParts[0]?.trim() || match.title || "";
        const afterOrg = headingParts[1] || "";
        const modeOrLoc = afterOrg.split(/\s*[-–—]\s*/).slice(1).join(" - ").trim();
        const locSuffix = modeOrLoc ? ` - ${modeOrLoc}` : "";
        return {
          ...genItem,
          heading: `${role} @ ${match.organization}${locSuffix}`,
          content: match.period || genItem.content
        };
      }
      return genItem;
    });
  }

  // 2. Restore Products details, status, and links
  if (Array.isArray(restored.products)) {
    restored.products = restored.products.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'product') return false;
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        return title && heading.includes(title);
      });

      if (match) {
        const links = [match.github_link, match.live_link].filter(Boolean);
        const newContent = [match.period, ...links].filter(Boolean).join(" | ");
        
        const headingParts = (genItem.heading || "").split(/\s+[-–—]\s+/);
        const techStack = headingParts.slice(1).join(" - ");
        const newHeading = techStack ? `${match.title} - ${techStack}` : match.title || genItem.heading;

        return {
          ...genItem,
          heading: newHeading,
          content: newContent || genItem.content
        };
      }
      return genItem;
    });
  }

  // 3. Restore Projects details, status, and links
  if (Array.isArray(restored.projects)) {
    restored.projects = restored.projects.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'project') return false;
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        return title && heading.includes(title);
      });

      if (match) {
        const links = [match.github_link, match.live_link].filter(Boolean);
        const newContent = [match.period, ...links].filter(Boolean).join(" | ");

        const headingParts = (genItem.heading || "").split(/\s+[-–—]\s+/);
        const techStack = headingParts.slice(1).join(" - ");
        const newHeading = techStack ? `${match.title} - ${techStack}` : match.title || genItem.heading;

        return {
          ...genItem,
          heading: newHeading,
          content: newContent || genItem.content
        };
      }
      return genItem;
    });
  }

  // 4. Restore Leadership dates
  if (Array.isArray(restored.leadership)) {
    restored.leadership = restored.leadership.map(genItem => {
      const match = vaultItems.find(vItem => {
        if (vItem.type !== 'leadership') return false;
        const org = (vItem.organization || "").trim().toLowerCase();
        const title = (vItem.title || "").trim().toLowerCase();
        const heading = (genItem.heading || "").trim().toLowerCase();
        
        if (org && title) {
          return heading.includes(org) && heading.includes(title);
        }
        return (org && heading.includes(org)) || (title && heading.includes(title));
      });

      if (match) {
        return {
          ...genItem,
          content: match.period || genItem.content
        };
      }
      return genItem;
    });
  }

  // 5. Restore Education exact details
  const educationVaultItems = vaultItems.filter(v => v.type === 'education');

  const buildEduString = (vItem: VaultItem): string => {
    const deg = vItem.title || "Degree";
    const sch = vItem.organization || "University";
    const locMatch = (vItem.description || "").match(/Location:\s*([^|\n]+)/i);
    const loc = locMatch ? locMatch[1].trim() : "";
    const dt = vItem.period || "";
    const schoolPart = loc ? `${sch} - ${loc}` : sch;
    return `${deg} @ ${schoolPart}${dt ? ` | ${dt}` : ""}`;
  };

  if (Array.isArray(restored.education) && restored.education.length > 0) {
    // AI generated education entries — restore exact vault data where possible
    restored.education = restored.education.map(genEdu => {
      const match = educationVaultItems.find(vItem => {
        const org = (vItem.organization || "").trim().toLowerCase();
        return org && genEdu.toLowerCase().includes(org);
      });
      return match ? buildEduString(match) : genEdu;
    });
  } else if (educationVaultItems.length > 0) {
    // AI skipped the education section entirely — inject directly from vault
    restored.education = educationVaultItems.map(buildEduString);
  }

  return restored;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sanitizeGeneratedResume = (data: any, targetSummaryLines = 3, experienceBullets = 3, projectLines = 3, productLines = 3): GeneratedResume => {
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

    // If LLM returned fewer sentences than requested, keep ALL of them (don't discard content)
    // Only slice if we have MORE than requested
    const toUse = cleanedSentences.length > targetSummaryLines
      ? cleanedSentences.slice(0, targetSummaryLines)
      : cleanedSentences;

    const finalSentences = toUse.map(s => {
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

  // Programmatically deduplicate skill keywords across categories to ensure strict reliability
  const seenSkills = new Set<string>();
  skills = skills.map(line => {
    if (!line.includes(':')) {
      const skillsPart = line.split(',');
      const uniqueSkills = skillsPart
        .map(s => s.trim())
        .filter(s => {
          if (!s) return false;
          const key = s.toLowerCase();
          if (seenSkills.has(key)) return false;
          seenSkills.add(key);
          return true;
        });
      return uniqueSkills.join(', ');
    }
    const colonIndex = line.indexOf(':');
    const category = line.slice(0, colonIndex).trim();
    const skillsPart = line.slice(colonIndex + 1);
    const skillsList = skillsPart.split(',').map(s => s.trim());
    const uniqueSkills = skillsList.filter(s => {
      if (!s) return false;
      const key = s.toLowerCase();
      if (seenSkills.has(key)) return false;
      seenSkills.add(key);
      return true;
    });
    return uniqueSkills.length > 0 ? `${category}: ${uniqueSkills.join(', ')}` : "";
  }).filter(Boolean);

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
  const cleanSections = (sectionsArr: any, limit?: number): GeneratedResumeSection[] => {
    return ensureArray(sectionsArr).map(item => {
      if (!item || typeof item !== "object") {
        return { heading: String(item || ""), content: "", bullets: [] };
      }
      
      const rawBullets = Array.isArray(item.bullets) 
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ? item.bullets.map((b: any) => typeof b === "string" ? b : String(b || ""))
        : (typeof item.bullets === "string" ? [item.bullets] : []);

      const cleanedBullets = rawBullets
        .map(b => {
          let clean = b.trim();
          // Remove leading bullet/dash if present
          clean = clean.replace(/^[•\-*\s]+/, "");
          return clean;
        })
        .filter(Boolean);

      const finalBullets = limit && limit > 0 
        ? cleanedBullets.slice(0, limit)
        : cleanedBullets;

      return {
        heading: typeof item.heading === "string" ? item.heading : String(item.heading || item.title || ""),
        content: typeof item.content === "string" ? item.content : String(item.content || item.period || item.date || ""),
        bullets: finalBullets
      };
    });
  };

  return {
    professional_summary: summary,
    skills_section: skills,
    experience: cleanSections(data.experience, experienceBullets),
    education: education,
    products: cleanSections(data.products, productLines),
    projects: cleanSections(data.projects, projectLines).sort((a, b) => {
      const getYear = (str: string): number => {
        const raw = (str || "").toLowerCase();
        if (raw.includes("ongoing") || raw.includes("present")) return 3000;
        const match = raw.match(/\b(20\d{2})\b/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getYear(b.content) - getYear(a.content);
    }),
    leadership: cleanSections(data.leadership),
    certifications: ensureArray(data.certifications).map(c => {
      if (typeof c === "string") return c;
      if (c && typeof c === "object") {
        const name = c.name || c.title || c.certification || "";
        const issuer = c.issuer || c.organization || c.provider || "";
        const year = c.year || c.date || "";
        return [name, issuer ? `(${issuer})` : "", year ? `- ${year}` : ""].filter(Boolean).join(" ");
      }
      return String(c || "");
    }),
    awards: ensureArray(data.awards).map(a => {
      if (typeof a === "string") return a;
      if (a && typeof a === "object") {
        const name = a.name || a.title || a.award || "";
        const issuer = a.issuer || a.organization || "";
        const year = a.year || a.date || "";
        return [name, issuer ? `(${issuer})` : "", year ? `- ${year}` : ""].filter(Boolean).join(" ");
      }
      return String(a || "");
    })
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
  const [clActiveTab, setClActiveTab] = useState<'resume' | 'cover-letter'>(forceTab || 'resume');
  const previewRef = useRef<HTMLDivElement>(null);
  
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
  const [tailorEngine, setTailorEngine] = useState<"speed" | "quality">("speed");
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
        .select("id, job_title, status, updated_at, content, header_data, settings")
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
    const savedExperienceBullets = record.settings?.experienceBullets || experienceBullets || 3;
    const savedProjectLines = record.settings?.projectLines || projectLines || 3;
    const savedProductLines = record.settings?.productLines || productLines || 3;
    
    const hydratedContent = sanitizeGeneratedResume(
      record.content, 
      savedSummaryLines,
      savedExperienceBullets,
      savedProjectLines,
      savedProductLines
    );
    
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
      if (record.settings.tailorEngine) setTailorEngine(record.settings.tailorEngine as "speed" | "quality");
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
    const loadedItems = (vaultData as VaultItem[]) || [];
    setVaultItems(loadedItems);

    // ── Supabase profile header ────────────────────────────────────────────
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

    // ── Full Profile Integration: seed vault + resume from user_profile.json ──
    // When master_vault has no entries, fetch /public/user_profile.json and:
    //   1. Populate VaultItems (education, certifications, projects, experience)
    //   2. Build a production-grade GeneratedResume for immediate preview display
    //   3. Pre-fill the header from the JSON if Supabase has no profile row
    // This ensures Academic Background, Certifications & Awards, and Key Projects
    // all contribute to the ATS_MATCH_SCORE calculation via their keywords.
    if (loadedItems.length === 0) {
      try {
        const res = await fetch('/user_profile.json');
        if (res.ok) {
          const profileJson = await res.json();
          const seedItems = buildVaultItemsFromProfileJson(profileJson);
          const defaultResume = buildResumeFromProfileJson(profileJson);
          setVaultItems(seedItems);
          setResume(defaultResume);
          setEditableResume(defaultResume);
          setIsOpen(true);
          // Only override header from JSON when Supabase has no profile data
          if (!profileData) {
            setEditableHeader({
              fullName: profileJson.personal_info?.fullName || "",
              email: profileJson.personal_info?.email || user?.email || "",
              phone: profileJson.personal_info?.phone || "",
              location: profileJson.personal_info?.location || "",
              linkedin: profileJson.personal_info?.links?.linkedin || "",
              portfolio: profileJson.personal_info?.links?.portfolio || "",
              github: profileJson.personal_info?.links?.github || "",
            });
          }
        }
      } catch {
        // Silent fallback — no profile seed available, proceed normally
      }
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
    const targetJdTitle = jdTitle || "Target Role";
    const targetJdSkills = (jdSkills || []).map(s => `${s.skill} (Importance: ${s.importance})`).join(', ') || "None specified.";
    const targetCompany = companyName || "Target Company";

    setIsGenerating(true);



    const experienceItems = vaultItems.filter(item => item.type === 'professional');
    const projectItems = vaultItems.filter(item => item.type === 'project');
    const productItems = vaultItems.filter(item => item.type === 'product');
    const educationItems = vaultItems.filter(item => item.type === 'education');
    const certificationItems = vaultItems.filter(item => item.type === 'certification');
    const leadershipItems = vaultItems.filter(item => item.type === 'leadership');
    const awardItems = vaultItems.filter(item => item.type === 'award');

    const serializeVaultItems = (items: VaultItem[]) => {
      if (items.length === 0) return "None provided.";
      return items.map((item, idx) => {
        const lines = [`Item ${idx + 1}:`];
        if (item.title) lines.push(`  Title: ${item.title}`);
        if (item.organization) lines.push(`  Org: ${item.organization}`);
        if (item.period) lines.push(`  Period: ${item.period}`);
        if (item.bullets?.length) lines.push(`  Bullets: ${item.bullets.map(b => `"${b}"`).join("; ")}`);
        if (item.skills?.length) lines.push(`  Skills: ${item.skills.join(", ")}`);
        if (item.github_link) lines.push(`  GitHub: ${item.github_link}`);
        if (item.live_link) lines.push(`  Live: ${item.live_link}`);
        return lines.join("\n");
      }).join("\n\n");
    };

    // ── RAG PHASE: Semantic Vault Matching & Career Pivot Detection ──
    let ragContext = "";
    let isCareerPivot = false;
    let ragMatches: VaultMatchResult[] = [];

    if (user?.id) {
      try {
        // Build a rich query from the JD title + skills for embedding
        const jdQueryText = `${targetJdTitle} at ${targetCompany}. Required skills: ${targetJdSkills}`;
        console.log("[RAG] Embedding JD for semantic matching...");

        ragMatches = await matchVaultItems(jdQueryText, user.id, 0.40, 10);

        if (ragMatches.length > 0) {
          // Calculate average similarity to determine pivot status
          const avgSimilarity = ragMatches.reduce((sum, m) => sum + m.similarity, 0) / ragMatches.length;
          console.log(`[RAG] Found ${ragMatches.length} matches (avg similarity: ${avgSimilarity.toFixed(3)})`);

          // Career Pivot Detection: If best match is below 0.55, the user is pivoting
          const bestSimilarity = ragMatches[0]?.similarity || 0;
          isCareerPivot = bestSimilarity < 0.55;

          if (isCareerPivot) {
            console.log(`[RAG] ⚡ CAREER PIVOT detected (best similarity: ${bestSimilarity.toFixed(3)})`);
          }

          // Build RAG context block with top matches
          ragContext = `\n\n### RAG-RETRIEVED CONTEXT (Semantically Matched Vault Items)
The following vault items were retrieved via semantic similarity search against the target JD.
Use these as PRIORITY source material for tailoring — they are the most relevant items in the candidate's profile:
${ragMatches.map((m, i) => `  [Match #${i + 1}] (Similarity: ${(m.similarity * 100).toFixed(1)}%) Title: ${m.title}. ${m.description}. Skills: ${(m.skills || []).join(", ")}`).join("\n")}`;
        } else {
          // No matches at all — full career pivot
          isCareerPivot = true;
          console.log("[RAG] ⚡ CAREER PIVOT detected (no vault items matched above threshold)");
        }
      } catch (ragErr) {
        console.warn("[RAG] Semantic matching failed (non-blocking), proceeding with standard generation:", ragErr);
      }
    }

    // ── Career Pivot Strategy Override ──
    const careerPivotDirective = isCareerPivot
      ? `\n\n### ⚡ CAREER PIVOT MODE ACTIVATED
The candidate is applying for a role OUTSIDE their direct past experience domain.
You MUST activate the following special strategies:
1. **Transferable Skills Emphasis**: Identify and prominently showcase transferable skills (leadership, problem-solving, system design, communication, analytical thinking) that bridge the gap between the candidate's experience and the target role.
2. **Adjacent Technology Mapping**: Map the candidate's known technologies to equivalent/adjacent technologies in the target domain (e.g., if they know React but the JD requires Angular, emphasize "modern component-based frontend architecture").
3. **Impact Reframing**: Reframe the candidate's achievements using language and metrics that resonate with the target industry/role, without fabricating facts.
4. **Skill Stack Bridging**: In the Skills section, strategically organize skills to lead with those most relevant to the target JD, even if they were secondary in previous roles.
5. **Summary Pivot Framing**: The professional summary MUST position the candidate as a versatile professional whose diverse background is a STRENGTH, not a gap. Frame the pivot as intentional career growth.
CRITICAL: Do NOT fabricate experience or skills. Only reframe and emphasize existing profile data through the lens of the target role.`
      : "";

    try {
      const enabledSections = sectionOrder.filter(sec => visibleSections[sec]);
      const disabledSections = sectionOrder.filter(sec => !visibleSections[sec]);

      const prompt = `You are an ATS resume expert. Generate a resume JSON for a ${targetJdTitle} role. Return EXACTLY this structure:

{
  "professional_summary": "${summaryLines} sentences naming the role, each sentence = vault fact + JD keyword",
  "education": ["Degree @ School — Location | Dates"],
  "experience": [{"heading": "Role @ Organization", "content": "dates", "bullets": ["verb + tech + JD keyword"]}],
  "products": [{"heading": "Title — Tech1, Tech2", "content": "dates | links", "bullets": ["verb + tech + JD keyword"]}],
  "projects": [{"heading": "Title — Tech1, Tech2", "content": "dates | links", "bullets": ["verb + tech + JD keyword"]}],
  "certifications": ["Name (Issuer) - Year"],
  "skills_section": ["Core Competencies: [6-8 JD keyword phrases]", "Languages: ...", "AI & ML: ...", "Cloud & MLOps: ..."],
  "awards": [],
  "leadership": []
}

CRITICAL BULLET COUNTS - generate EXACTLY:
- Experience: ${experienceBullets} bullets per item
- Products: ${productLines} bullets per item
- Projects: ${projectLines} bullets per item

If the vault provides fewer source bullets, derive additional bullets from the item's skills/tech stack and JD keywords. Never fabricate metrics.

CAREER-OPS RULES:
- Rewrite each bullet with a JD keyword: active verb + tool + domain term
- Reorder bullets: most JD-relevant FIRST per section
- NEVER: Utilizing/Utilized, Collaborating, Applying/Applied, Ensuring, "Tech Stack" as heading text
- Skills first line MUST be "Core Competencies:" followed by 6-8 JD keyword phrases
- Certifications sorted by JD relevance, format: "Name (Issuer) - Year"

VAULT DATA TO USE:
${enabledSections.includes('EDUCATION') ? `\nEDUCATION:\n${serializeVaultItems(educationItems)}` : ''}
${enabledSections.includes('EXPERIENCE') ? `\nEXPERIENCE:\n${serializeVaultItems(experienceItems)}` : ''}
${enabledSections.includes('PRODUCTS') ? `\nPRODUCTS:\n${serializeVaultItems(productItems)}` : ''}
${enabledSections.includes('PROJECTS') ? `\nPROJECTS:\n${serializeVaultItems(projectItems)}` : ''}
${enabledSections.includes('LEADERSHIP') ? `\nLEADERSHIP:\n${serializeVaultItems(leadershipItems)}` : ''}
${enabledSections.includes('CERTIFICATIONS') ? `\nCERTIFICATIONS:\n${serializeVaultItems(certificationItems)}` : ''}
${enabledSections.includes('AWARDS') ? `\nAWARDS:\n${serializeVaultItems(awardItems)}` : ''}

TARGET JD: ${targetJdTitle}. Skills: ${targetJdSkills}

Return ONLY the JSON. No markdown, no comments.`

      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      let resultText = "";
      const models = tailorEngine === "speed"
        ? ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"]
        : ["llama-3.3-70b-versatile", "llama-3.1-8b-instant"];
      let lastError = "";

      for (let i = 0; i < models.length; i++) {
        const model = models[i];
        try {
          console.log(`Lumina Tailoring: Attempting with ${model}...`);
          // Update toast or state to show which model is active
          if (i > 0) toast.loading(`Switching to fallback engine: ${model}...`, { id: "gen-toast" });

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 55000); // 55-second client-side timeout for 70B + 8192 tokens

          let rawData = null;
          let invokeError = null;

          try {
            const response = await supabase.functions.invoke("analyze", {
              body: {
                model: model,
                messages: [{ role: "user", content: prompt }],
                temperature: 0.5,
                max_tokens: 8192
                  },
                  signal: controller.signal
            });
            rawData = response.data;
            invokeError = response.error;
          } catch (err) {
            invokeError = err instanceof Error ? err : new Error(String(err));
            console.warn(`Lumina Tailoring: Supabase invoke aborted/failed for ${model}:`, err);
          } finally {
            clearTimeout(timeoutId);
          }

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
                  temperature: 0.5,
                  max_tokens: 8192
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

      const hydratedData = sanitizeGeneratedResume(
        structData, 
        summaryLines,
        experienceBullets,
        projectLines,
        productLines
      );

      const fullyRestoredData = restoreExactProfileData(hydratedData, vaultItems);

      // ── Pad bullets to match user settings (minimum 5 regardless of state) ──
      const targetExp = Math.max(experienceBullets || 5, 5);
      const targetProd = Math.max(productLines || 5, 5);
      const targetProj = Math.max(projectLines || 5, 5);
      const padBullets = (bullets: string[], target: number): string[] => {
        if (!bullets || bullets.length === 0) return Array(target).fill("Delivered solutions using Python and ML frameworks.");
        const cleaned = bullets.filter(Boolean);
        if (cleaned.length >= target) return cleaned.slice(0, target);
        const padded = [...cleaned];
        const fillerPool = cleaned.length >= 2
          ? cleaned.slice(1).concat(cleaned.slice(0, -1))
          : [cleaned[0], "Built pipelines for data preprocessing and model deployment using Python."];
        while (padded.length < target) {
          padded.push(fillerPool[(padded.length - cleaned.length) % fillerPool.length]);
        }
        return padded;
      };
      fullyRestoredData.experience?.forEach(item => { item.bullets = padBullets(item.bullets, targetExp); });
      fullyRestoredData.products?.forEach(item => { item.bullets = padBullets(item.bullets, targetProd); });
      fullyRestoredData.projects?.forEach(item => { item.bullets = padBullets(item.bullets, targetProj); });

      // ── Fallback: fill missing sections from vault items if LLM skipped them ──
      if (!fullyRestoredData.professional_summary) {
        const fallbackSummary = `${editableHeader.fullName || "Candidate"} is an AI professional targeting a ${targetJdTitle} role. Skilled in Python, LLMs, NLP, and machine learning, with hands-on experience building ML pipelines, RAG systems, and AI agents. Seeking to apply expertise in ${(jdSkills || []).slice(0, 3).map(s => s.skill).join(", ")} to drive impact.`;
        fullyRestoredData.professional_summary = fallbackSummary;
      }
      if (!fullyRestoredData.skills_section || fullyRestoredData.skills_section.length === 0) {
        const jdSkillNames = (jdSkills || []).map(s => s.skill);
        const coreCompetencies = jdSkillNames.slice(0, 8).join(", ");
        fullyRestoredData.skills_section = [
          `Core Competencies: ${coreCompetencies}`,
          `Languages: Python, SQL, TypeScript`,
          `AI & Machine Learning: LLMs, NLP, TensorFlow, PyTorch, Scikit-learn, XGBoost, Hugging Face, LangChain`,
          `Cloud & MLOps: Docker, AWS, Git, CI/CD, MLflow`,
        ];
      }
      if ((!fullyRestoredData.experience || fullyRestoredData.experience.length === 0)) {
        fullyRestoredData.experience = vaultItems.filter(v => v.type === 'professional').map(v => ({
          heading: `${v.title || "Role"} @ ${v.organization || ""}`,
          content: v.period || "",
          bullets: padBullets(v.bullets, targetExp)
        }));
      }
      if ((!fullyRestoredData.products || fullyRestoredData.products.length === 0)) {
        fullyRestoredData.products = vaultItems.filter(v => v.type === 'product').map(v => {
          const links = [v.github_link, v.live_link].filter(Boolean).join(" | ");
          return {
            heading: v.title || "",
            content: [v.period, links].filter(Boolean).join(" | "),
            bullets: padBullets(v.bullets, targetProd)
          };
        });
      }
      if ((!fullyRestoredData.projects || fullyRestoredData.projects.length === 0)) {
        fullyRestoredData.projects = vaultItems.filter(v => v.type === 'project').map(v => {
          const links = [v.github_link, v.live_link].filter(Boolean).join(" | ");
          return {
            heading: v.title || "",
            content: [v.period, links].filter(Boolean).join(" | "),
            bullets: padBullets(v.bullets, targetProj)
          };
        });
      }
      if (!fullyRestoredData.certifications || fullyRestoredData.certifications.length === 0) {
        fullyRestoredData.certifications = vaultItems.filter(v => v.type === 'certification').map(v => {
          const suffix = v.organization ? ` (${v.organization})` : "";
          return `${v.title}${suffix}`;
        });
      }

      setResume(fullyRestoredData);
      setEditableResume(fullyRestoredData);
      setIsOpen(true);
      toast.success("Silicon Valley Modern resume generated!");

      // ── Auto-save to Job Agent Vault ─────────────────────────────────────
      // Silently persists the generated resume so the Job Agent tab can
      // immediately select it without any manual export step.
      try {
        saveAgentResume({
          resume: fullyRestoredData,
          jdTitle: jdTitle || "Target Role",
          jdText: "",
          jdSkills: jdSkills || [],
          resumeText: buildResumeTextForAgent(fullyRestoredData),
          contactInfo: {
            fullName: editableHeader.fullName,
            email: editableHeader.email,
            phone: editableHeader.phone,
            location: editableHeader.location,
            linkedin: editableHeader.linkedin,
            github: editableHeader.github,
            website: editableHeader.portfolio,
          },
        });
      } catch {
        // Non-critical — agent vault save failure does not block resume display
      }
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
      // 1. Sync header details to the profiles table in Supabase
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: editableHeader.fullName,
          phone: editableHeader.phone,
          location: editableHeader.location,
          linkedin_url: editableHeader.linkedin,
          website_url: editableHeader.portfolio,
          github_url: editableHeader.github
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile synchronization error:", profileError);
      }

      // 2. Fetch latest master_vault items for the user
      const { data: latestVaultData, error: vaultFetchError } = await supabase
        .from("master_vault")
        .select("*")
        .eq("user_id", user.id);

      if (vaultFetchError) {
        console.error("Vault fetch error during sync:", vaultFetchError);
      } else {
        const latestVault = (latestVaultData as VaultItem[]) || [];

        const checkHasNumbers = (bulletsList: string[]) => {
          return (bulletsList || []).some(b => /[\d%]/.test(b));
        };

        // Sync Professional Experience
        if (Array.isArray(editableResume.experience)) {
          for (const exp of editableResume.experience) {
            const headingParts = (exp.heading || "").split('@');
            const role = headingParts[0]?.trim() || "";
            const orgParts = headingParts[1] ? headingParts[1].split(/\s+[-–—]\s+/) : [];
            const org = orgParts[0]?.trim() || "";
            if (!role && !org) continue;

            const matchedItem = latestVault.find(vItem => {
              if (vItem.type !== 'professional') return false;
              const vOrg = (vItem.organization || "").trim().toLowerCase();
              const vTitle = (vItem.title || "").trim().toLowerCase();
              if (org && vOrg && role && vTitle) {
                return vOrg === org.toLowerCase() && vTitle === role.toLowerCase();
              }
              return org && vOrg ? vOrg === org.toLowerCase() : (role && vTitle ? vTitle === role.toLowerCase() : false);
            });

            const hasNumbers = checkHasNumbers(exp.bullets || []);

            if (matchedItem) {
              await supabase
                .from("master_vault")
                .update({
                  title: role || matchedItem.title,
                  organization: org || matchedItem.organization,
                  period: exp.content || matchedItem.period,
                  bullets: exp.bullets || matchedItem.bullets,
                  is_quantified: hasNumbers
                })
                .eq("id", matchedItem.id);
            } else {
              await supabase
                .from("master_vault")
                .insert({
                  user_id: user.id,
                  type: 'professional',
                  title: role || "Role",
                  organization: org || "Company",
                  period: exp.content || "",
                  bullets: exp.bullets || [],
                  description: "",
                  skills: [],
                  is_quantified: hasNumbers
                });
            }
          }
        }

        // Sync Education
        if (Array.isArray(editableResume.education)) {
          for (const edu of editableResume.education) {
            const rawStr = edu || "";
            const sections = rawStr.split('|').map(s => s.trim());
            const mainSection = sections[0] || "";
            const timelineSection = sections[1] || "";
            const gpaSection = sections[2] || "";

            const mainParts = mainSection.split('@').map(s => s.trim());
            const degree = mainParts[0] || "";
            const schoolAndLoc = mainParts[1] || "";
            const schoolParts = schoolAndLoc.split('-').map(s => s.trim());
            const school = schoolParts[0] || "";
            const location = schoolParts[1] || "";

            if (!degree && !school) continue;

            const matchedItem = latestVault.find(vItem => {
              if (vItem.type !== 'education') return false;
              const vOrg = (vItem.organization || "").trim().toLowerCase();
              const vTitle = (vItem.title || "").trim().toLowerCase();
              if (school && vOrg && degree && vTitle) {
                return vOrg === school.toLowerCase() && vTitle === degree.toLowerCase();
              }
              return school && vOrg ? vOrg === school.toLowerCase() : (degree && vTitle ? vTitle === degree.toLowerCase() : false);
            });

            const gpaStr = gpaSection ? gpaSection.replace(/^(GPA:\s*)/i, "") : "";
            const descParts = [];
            if (gpaStr) descParts.push(`GPA: ${gpaStr}`);
            if (location) descParts.push(`Location: ${location}`);
            const nextDescription = descParts.join(' | ');

            if (matchedItem) {
              await supabase
                .from("master_vault")
                .update({
                  title: degree || matchedItem.title,
                  organization: school || matchedItem.organization,
                  period: timelineSection || matchedItem.period,
                  description: nextDescription || matchedItem.description
                })
                .eq("id", matchedItem.id);
            } else {
              await supabase
                .from("master_vault")
                .insert({
                  user_id: user.id,
                  type: 'education',
                  title: degree || "Degree",
                  organization: school || "University",
                  period: timelineSection || "",
                  description: nextDescription,
                  bullets: [],
                  skills: []
                });
            }
          }
        }

        // Sync Projects
        if (Array.isArray(editableResume.projects)) {
          for (const proj of editableResume.projects) {
            const headingParts = (proj.heading || "").split(/\s+[-–—]\s+/);
            const title = headingParts[0]?.trim() || "";
            const techStack = headingParts.slice(1).join(" | ") || "";
            if (!title) continue;

            const parsed = parseProductOrProjectContent(proj.content);
            const githubLink = parsed.urls.find(u => u.toLowerCase().includes("github.com")) || "";
            const liveLink = parsed.urls.find(u => !u.toLowerCase().includes("github.com")) || "";
            const period = parsed.statusOrYear || "";

            const matchedItem = latestVault.find(vItem => {
              if (vItem.type !== 'project') return false;
              const vTitle = (vItem.title || "").trim().toLowerCase();
              return vTitle === title.toLowerCase();
            });

            const hasNumbers = checkHasNumbers(proj.bullets || []);
            const parsedSkills = techStack.split(/[|,\-–—]+/).map(s => s.trim()).filter(Boolean);

            if (matchedItem) {
              await supabase
                .from("master_vault")
                .update({
                  title: title || matchedItem.title,
                  period: period || matchedItem.period,
                  github_link: githubLink || matchedItem.github_link,
                  live_link: liveLink || matchedItem.live_link,
                  bullets: proj.bullets || matchedItem.bullets,
                  skills: parsedSkills.length > 0 ? parsedSkills : matchedItem.skills,
                  is_quantified: hasNumbers
                })
                .eq("id", matchedItem.id);
            } else {
              await supabase
                .from("master_vault")
                .insert({
                  user_id: user.id,
                  type: 'project',
                  title: title || "Project Name",
                  period: period || "",
                  github_link: githubLink,
                  live_link: liveLink,
                  bullets: proj.bullets || [],
                  description: "",
                  skills: parsedSkills,
                  is_quantified: hasNumbers
                });
            }
          }
        }

        // Sync Products
        if (Array.isArray(editableResume.products)) {
          for (const prod of editableResume.products) {
            const headingParts = (prod.heading || "").split(/\s+[-–—]\s+/);
            const title = headingParts[0]?.trim() || "";
            const techStack = headingParts.slice(1).join(" | ") || "";
            if (!title) continue;

            const parsed = parseProductOrProjectContent(prod.content);
            const githubLink = parsed.urls.find(u => u.toLowerCase().includes("github.com")) || "";
            const liveLink = parsed.urls.find(u => !u.toLowerCase().includes("github.com")) || "";
            const period = parsed.statusOrYear || "";

            const matchedItem = latestVault.find(vItem => {
              if (vItem.type !== 'product') return false;
              const vTitle = (vItem.title || "").trim().toLowerCase();
              return vTitle === title.toLowerCase();
            });

            const hasNumbers = checkHasNumbers(prod.bullets || []);
            const parsedSkills = techStack.split(/[|,\-–—]+/).map(s => s.trim()).filter(Boolean);

            if (matchedItem) {
              await supabase
                .from("master_vault")
                .update({
                  title: title || matchedItem.title,
                  period: period || matchedItem.period,
                  github_link: githubLink || matchedItem.github_link,
                  live_link: liveLink || matchedItem.live_link,
                  bullets: prod.bullets || matchedItem.bullets,
                  skills: parsedSkills.length > 0 ? parsedSkills : matchedItem.skills,
                  is_quantified: hasNumbers
                })
                .eq("id", matchedItem.id);
            } else {
              await supabase
                .from("master_vault")
                .insert({
                  user_id: user.id,
                  type: 'product',
                  title: title || "Product Name",
                  period: period || "",
                  github_link: githubLink,
                  live_link: liveLink,
                  bullets: prod.bullets || [],
                  description: "",
                  skills: parsedSkills,
                  is_quantified: hasNumbers
                });
            }
          }
        }

        // Sync Leadership
        if (Array.isArray(editableResume.leadership)) {
          for (const lead of editableResume.leadership) {
            const headingParts = (lead.heading || "").split('@');
            const role = headingParts[0]?.trim() || "";
            const orgParts = headingParts[1] ? headingParts[1].split(/\s+[-–—]\s+/) : [];
            const org = orgParts[0]?.trim() || "";
            if (!role && !org) continue;

            const matchedItem = latestVault.find(vItem => {
              if (vItem.type !== 'leadership') return false;
              const vOrg = (vItem.organization || "").trim().toLowerCase();
              const vTitle = (vItem.title || "").trim().toLowerCase();
              if (org && vOrg && role && vTitle) {
                return vOrg === org.toLowerCase() && vTitle === role.toLowerCase();
              }
              return org && vOrg ? vOrg === org.toLowerCase() : (role && vTitle ? vTitle === role.toLowerCase() : false);
            });

            const hasNumbers = checkHasNumbers(lead.bullets || []);

            if (matchedItem) {
              await supabase
                .from("master_vault")
                .update({
                  title: role || matchedItem.title,
                  organization: org || matchedItem.organization,
                  period: lead.content || matchedItem.period,
                  bullets: lead.bullets || matchedItem.bullets,
                  is_quantified: hasNumbers
                })
                .eq("id", matchedItem.id);
            } else {
              await supabase
                .from("master_vault")
                .insert({
                  user_id: user.id,
                  type: 'leadership',
                  title: role || "Leadership Role",
                  organization: org || "Organization",
                  period: lead.content || "",
                  bullets: lead.bullets || [],
                  description: "",
                  skills: [],
                  is_quantified: hasNumbers
                });
            }
          }
        }
      }

      // Reload local vault state to reflect updates
      await loadVault();

      // 3. Save resume blueprint draft to generated_resumes table
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
          productLines,
          tailorEngine
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
      toast.success("Resume blueprint & master profile synchronized successfully!");
    } catch (err: unknown) {
      console.error("Unexpected save error:", err);
      const message = (err as { message?: string })?.message || (typeof err === 'string' ? err : "Unknown process error");
      toast.error(`Save crashed: ${message}`);
    }
  };

  const handleDownloadPDF = () => {
    if (!resume) return;
    const filename = `${(editableHeader.fullName || "resume").replace(/\s+/g, "_")}_${(jdTitle || "role").replace(/\s+/g, "_")}.pdf`;
    exportResumeAsHtmlPdf(
      resume as GeneratedResumeData,
      editableHeader as HeaderData,
      filename,
    );
    toast.success("PDF preview opened. Use Ctrl+P / Cmd+P → Save as PDF.");
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
        return sentences
          .slice(0, maxSentences)
          .map(s => s.trim() + (s.trim().endsWith(".") ? "" : "."))
          .join(" ");
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
          const rawDateText = parts[1]?.trim() || "";
          const dateText = (rawDateText === "No specific dates provided" || !rawDateText.trim()) ? "" : rawDateText;
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
          const bulletsToRender = (exp.bullets || []).slice(0, experienceBullets);
          const rawDate = exp.content || "";
          const dateText = (rawDate === "No specific dates provided" || !rawDate.trim()) ? "" : rawDate;

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${role}</td>
                <td style="text-align: right; font-weight: bold; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
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
          const bulletsToRender = (prod.bullets || []).slice(0, productLines);

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
          const bulletsToRender = (proj.bullets || []).slice(0, projectLines);

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
          const rawDate = lead.content || "";
          const dateText = (rawDate === "No specific dates provided" || !rawDate.trim()) ? "" : rawDate;

          return `
            <table class="meta-table">
              <tr>
                <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${lead.heading || "Role"}</td>
                <td style="text-align: right; font-size: 11px; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
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
 
      let bodyContentHtml = "";
      sectionOrder.forEach((sectionKey) => {
        if (!visibleSections[sectionKey]) return;

        switch (sectionKey) {
          case 'SUMMARY':
            bodyContentHtml += summaryHtml;
            break;
          case 'EDUCATION':
            bodyContentHtml += educationHtml;
            break;
          case 'EXPERIENCE':
            bodyContentHtml += experienceHtml;
            break;
          case 'PRODUCTS':
            bodyContentHtml += productsHtml;
            break;
          case 'PROJECTS':
            bodyContentHtml += projectsHtml;
            break;
          case 'LEADERSHIP':
            bodyContentHtml += leadershipHtml;
            break;
          case 'SKILLS':
            bodyContentHtml += skillsHtml;
            break;
          case 'CERTIFICATIONS':
            bodyContentHtml += certificationsHtml;
            break;
          case 'AWARDS':
            bodyContentHtml += awardsHtml;
            break;
        }
      });

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
          
          ${bodyContentHtml}
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
    const candidateName = editableHeader?.fullName || 'the candidate';
    const targetCompany = companyName || 'the company';
    
    const clSystemPrompt = `You are an elite Silicon Valley Career Strategist specializing in "Human-First" candidacy narratives.
Your goal is to write ONLY the body paragraphs of a cover letter. The letter header, date, recipient info, salutation ("Dear..."), and closing signature are handled separately by the application.

IMPORTANT OUTPUT RULES:
- Output ONLY the body paragraphs of the letter. Nothing else.
- Do NOT include any of these: "Dear...", "To:", "From:", "Subject:", "Date:", "Sincerely,", "Best regards,", "Yours truly,", "[Your Name]", "[Company Name]", any sign-off, any header, any salutation.
- Do NOT use markdown formatting. No **bold**, no *italic*, no bullet points, no headers (#).
- Output plain text paragraphs only, separated by blank lines.
- Use the candidate's actual name "${candidateName}" if referencing themselves, and the actual company name "${targetCompany}".

Tone: ${tone || 'Professional'}
Narrative Focus: ${clFocus || 'Technical Excellence'}
Length Mode: ${clLength || 'Concise'}

STRICT HUMANIZATION GUIDELINES:
1. NO AI-isms: Avoid words like "delve", "testament", "vibrant", "holistic", "meticulous", "passionate about", "unwavering", "synergy", "realm", "bespoke".
2. NO ROBOTIC STRUCTURES: Start with a punchy, unique hook. No generic openings.
3. VARY SENTENCE DYNAMICS: Mix short, impactful sentences with longer, complex ones. Use active voice.
4. BE SPECIFIC: Reference specific technical challenges or industry shifts relevant to the job.

ATS ALIGNMENT STRATEGY:
1. SEMANTIC MIRRORING: Identify the 5 most critical keywords/phrases from the Job Description and weave them naturally.
2. METRIC-DRIVEN IMPACT: Quantify achievements using the resume data (e.g., "Increased pipeline efficiency by 40%").
3. PROBLEM-SOLUTION FIT: Frame skills as a direct solution to the JD's specific pain points.
4. ${clFocus === 'Leadership' ? 'Prioritize leadership metrics and strategic oversight.' : clFocus === 'Cultural' ? 'Highlight mission alignment and team-first philosophy.' : 'Prioritize technical stack proficiency and architectural impact.'}

LENGTH: ${clLength === 'Concise' ? 'Under 250 words, 3-4 tight paragraphs.' : 'Under 450 words, 4-5 paragraphs with specific examples.'}`;

    const clUserPrompt = `Job Title: ${jdTitle || 'Not specified'}
Company: ${targetCompany}
Key Skills: ${jdSkills?.length ? jdSkills.map(s => s.skill).join(", ") : 'Not specified'}

Candidate Name: ${candidateName}
Candidate Resume Data:
${JSON.stringify(contextData)}

Write ONLY the body paragraphs. No salutation, no sign-off, no markdown, no placeholders.`;

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
            length: clLength,
            candidateName: candidateName,
            companyName: targetCompany,
            jdTitle: jdTitle || ''
          }
        });

        if (error) {
          console.warn("Cover Letter Edge Function error:", error);
          throw error;
        }
        
        // Supabase edge function returns the Groq response directly
        content = data?.choices?.[0]?.message?.content || "";
        
        // If data has error field, it means the edge function returned an error
        if (!content && data?.error) {
          console.warn("Cover Letter Edge Function returned error in data:", data.error);
          throw new Error(data.error);
        }
      } catch (invokeError) {
        console.warn("Cover Letter Edge Function failed. Falling back to secure Local API Proxy...", invokeError);
        toast.loading("Primary engine failed, trying fallback...", { id: "cl-gen" });
        
        const apiResponse = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
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
          const errorText = await apiResponse.text().catch(() => apiResponse.statusText);
          console.error("Fallback API error:", apiResponse.status, errorText);
          throw new Error(`API error (${apiResponse.status}): ${errorText}`);
        }
      }

      if (!content) throw new Error("AI returned empty content — try regenerating");

      // Post-process: strip markdown formatting, remove duplicate headers/sign-offs, replace placeholders
      content = content
        // Remove markdown bold/italic
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\*([^*]+)\*/g, '$1')
        .replace(/__([^_]+)__/g, '$1')
        .replace(/_([^_]+)_/g, '$1')
        // Remove any "Dear ..." or "To:" lines the AI might have added
        .replace(/^(Dear\s+.+[,:]\s*\n?)/i, '')
        .replace(/^(To:\s*.+\n?)/im, '')
        .replace(/^(From:\s*.+\n?)/im, '')
        .replace(/^(Subject:\s*.+\n?)/im, '')
        .replace(/^(Date:\s*.+\n?)/im, '')
        // Remove sign-off lines at the end
        .replace(/(Sincerely|Best regards|Yours truly|Warm regards|Kind regards|Respectfully|Best|Regards)[,.]?\s*\n?.*/is, '')
        // Replace common placeholders
        .replace(/\[Your Name\]/gi, candidateName)
        .replace(/\[Company Name\]/gi, targetCompany)
        .replace(/\[Company\]/gi, targetCompany)
        .replace(/\[Hiring Manager\]/gi, 'Hiring Manager')
        .replace(/\[Position\]/gi, jdTitle || 'this role')
        .replace(/\[Job Title\]/gi, jdTitle || 'this role')
        // Clean up excessive whitespace
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      setCoverLetter(content);
      setClActiveTab('cover-letter');
      setIsOpen(true);
      toast.success("Elite Cover Letter Synthesized!", { id: "cl-gen" });
      // Scroll to preview after a short delay for animation
      setTimeout(() => {
        previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 1000);
    } catch (err) {
      console.error("Cover Letter Error:", err);
      const errorMsg = err instanceof Error ? err.message : "Unknown error";
      toast.error(`Cover letter failed: ${errorMsg.slice(0, 100)}`, { id: "cl-gen" });
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
        <body style="font-family: Arial, sans-serif; line-height: 1.5; margin: 1in; color: #1E2A3A;">
          <div style="text-align: right; margin-bottom: 24px;">
            <h2 style="margin: 0 0 4px 0; font-size: 14pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">${editableHeader.fullName}</h2>
            ${editableHeader.location ? `<p style="margin: 0 0 2px 0; color: rgba(30,42,58,0.7); font-size: 10pt;">${editableHeader.location}</p>` : ''}
            ${editableHeader.email ? `<p style="margin: 0 0 2px 0; color: rgba(30,42,58,0.7); font-size: 10pt;">${editableHeader.email}</p>` : ''}
            ${editableHeader.phone ? `<p style="margin: 0 0 2px 0; color: rgba(30,42,58,0.7); font-size: 10pt;">${editableHeader.phone}</p>` : ''}
            ${editableHeader.linkedin ? `<p style="margin: 0; color: #2563eb; font-size: 10pt;">${editableHeader.linkedin}</p>` : ''}
          </div>
          <div style="margin-bottom: 24px; text-align: left;">
            ${companyName ? `<p style="margin: 0 0 2px 0; font-size: 11pt; font-weight: bold;">${companyName}</p>` : ''}
          </div>
          ${jdTitle ? `<p style="font-weight: bold; margin-bottom: 24px; font-size: 11pt; color: #000000;">Application for ${jdTitle}</p>` : ''}
          <p style="font-size: 11pt; margin-bottom: 20px;">Dear Hiring Manager,</p>
          <div style="white-space: pre-wrap; text-align: justify; font-size: 11pt; line-height: 1.6; color: rgba(30,42,58,0.9); margin-bottom: 28px;">${coverLetter}</div>
          <div style="margin-top: 20px;">
            <p style="font-size: 11pt; margin-bottom: 16px;">Sincerely,</p>
            <p style="font-size: 11pt; font-weight: bold; margin: 0;">${editableHeader.fullName || profile?.full_name || "Your Name"}</p>
          </div>
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
      
      // Header (Right Aligned)
      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      const name = (editableHeader.fullName || profile?.full_name || "Your Name").toUpperCase();
      pdf.text(name, pageWidth - margin, y, { align: "right" });
      y += 6;
      
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(80, 80, 80);
      if (editableHeader.location) {
        pdf.text(editableHeader.location, pageWidth - margin, y, { align: "right" });
        y += 5;
      }
      if (editableHeader.email) {
        pdf.text(editableHeader.email.toLowerCase(), pageWidth - margin, y, { align: "right" });
        y += 5;
      }
      if (editableHeader.phone) {
        pdf.text(editableHeader.phone, pageWidth - margin, y, { align: "right" });
        y += 5;
      }
      if (editableHeader.linkedin) {
        pdf.setTextColor(37, 99, 235);
        pdf.text(editableHeader.linkedin, pageWidth - margin, y, { align: "right" });
        y += 5;
      }
      
      pdf.setTextColor(30, 42, 58);
      y += 10;
      
      // Recipient Company (Prepverse)
      if (companyName) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(companyName, margin, y);
        y += 8;
      }
      
      // Subject (Application for ...)
      if (jdTitle) {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(11);
        pdf.text(`Application for ${jdTitle}`, margin, y);
        y += 10;
      }
      
      // Salutation
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text("Dear Hiring Manager,", margin, y);
      y += 10;
      
      // Body (Wrap-aware and multi-page proof)
      const lines = pdf.splitTextToSize(coverLetter, pageWidth - (margin * 2));
      pdf.setTextColor(40, 40, 40);
      for (let i = 0; i < lines.length; i++) {
        if (y + lineHeight > pageHeight - margin) {
          pdf.addPage();
          y = 20;
        }
        pdf.text(lines[i], margin, y);
        y += lineHeight;
      }
      
      y += 10;
      if (y + 30 > pageHeight - margin) {
        pdf.addPage();
        y = 20;
      }
      
      pdf.setTextColor(30, 42, 58);
      pdf.text("Sincerely,", margin, y);
      y += 12;
      pdf.setFont("helvetica", "bold");
      pdf.text(editableHeader.fullName || profile?.full_name || "Your Name", margin, y);
      
      pdf.save(`Lumina-Cover-Letter-${safeName}.pdf`);
    }
  };

  return (
    <div className="glass-panel rounded-[3rem] p-6 lg:p-10 relative overflow-hidden group border-white/20">
      <div className="absolute top-0 right-0 p-16 opacity-5 scale-150 group-hover:opacity-10 transition-opacity duration-1000 pointer-events-none">
        <img src="/logo.png" alt="Lumina Icon" className="w-80 h-auto rotate-12 grayscale" />
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

                  <div className="space-y-2 mb-4 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
                      <span>Tailoring Engine</span>
                      <span className="px-1.5 py-0.5 rounded bg-lumina-teal/10 text-lumina-teal text-[8px] font-black uppercase">
                        {tailorEngine === "speed" ? "Fast" : "Deep"}
                      </span>
                    </label>
                    <select 
                      value={tailorEngine} 
                      onChange={(e) => setTailorEngine(e.target.value as "speed" | "quality")}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-2 ring-lumina-teal/20 transition-all cursor-pointer shadow-sm text-slate-800"
                    >
                      <option value="speed">⚡ Blazing Fast Mode (Llama-3.1-8B)</option>
                      <option value="quality">🧠 Deep Intelligence Mode (Llama-3.3-70B)</option>
                    </select>
                    <p className="text-[9px] text-slate-400 leading-relaxed px-1">
                      {tailorEngine === "speed" 
                        ? "Optimized for speed. Generates customized resume in ~2-3 seconds with high reliability." 
                        : "Optimized for maximum accuracy and rich vocabulary. Takes ~15-20 seconds."}
                    </p>
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

            {/* Cover Letter Inline Preview + View & Edit Button */}
            {coverLetter && (
              <div className="space-y-4 pt-4 border-t border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 space-y-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Preview</p>
                  <p className="text-[12px] text-slate-700 leading-relaxed font-serif italic line-clamp-4">
                    {coverLetter.slice(0, 300)}{coverLetter.length > 300 ? '...' : ''}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setClActiveTab('cover-letter');
                    setIsOpen(true);
                    setTimeout(() => {
                      previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 1000);
                  }}
                  className="w-full py-4 rounded-2xl bg-slate-950 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-950/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-3"
                >
                  <Eye size={14} /> View & Edit Full Letter
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
        {isGenerating ? (
          <motion.div
            key="generator-skeleton"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-20 pt-20 border-t border-[#1E2A3A]/10 space-y-24"
          >
            <div className="relative">
              {/* Blur-under overlay pattern: the skeleton renders at opacity-35/40 with animate-pulse and blur-[2px] in the background, while the active glass loading card floats centered on top */}
              <div className="opacity-35 blur-[2px] pointer-events-none select-none">
                <GeneratorSkeleton />
              </div>
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="backdrop-blur-md bg-white/70 border border-white/40 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center space-y-6 max-w-sm text-center">
                  <div className="w-16 h-16 rounded-full border-4 border-lumina-teal/30 border-t-lumina-teal animate-spin" />
                  <div className="space-y-2">
                    <h3 className="text-sm font-display font-black uppercase tracking-[0.2em] text-[#1E2A3A]">Synthesizing Resume</h3>
                    <p className="text-[10px] font-semibold text-[#1E2A3A]/50">Tailoring skills and experience to match the target job description perfectly...</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        ) : isOpen && (resume || coverLetter) ? (
          <motion.div
            key="generator-preview"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mt-20 pt-20 border-t border-[#1E2A3A]/10 space-y-24"
          >
            {/* ── Unified Preview & Edit Experience ── */}
            <div ref={previewRef}>
            <ResumePreview 
              resume={editableResume || resume || { professional_summary: '', skills_section: [], experience: [], education: [], projects: [], products: [], certifications: [], awards: [], leadership: [] }}
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
              onUpdateCoverLetter={(updatedCL: string) => setCoverLetter(updatedCL)}
              companyName={companyName}
              jdTitle={jdTitle}
              initialTab={clActiveTab}
              activeTabOverride={clActiveTab}
              onTabChange={(tab: 'resume' | 'cover-letter') => setClActiveTab(tab)}
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
              visibleSections={visibleSections}
              sectionOrder={sectionOrder}
            />
            </div>

            <div className="flex justify-center pb-20">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-xs font-display font-bold uppercase tracking-[0.5em] text-[#1E2A3A]/40 hover:text-[#1E2A3A] transition-all"
              >
                Close Blueprint Preview
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};


