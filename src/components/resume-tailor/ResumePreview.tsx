import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, 
  Download, 
  RotateCcw, 
  Plus, 
  Minus, 
  User, 
  Briefcase, 
  Award, 
  GraduationCap, 
  Save,
  X,
  Database,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Github,
  Globe,
  Trash2,
  Type,
  Layers,
  Cpu,
  Sparkles,
  Rocket,
  Calendar,
  Edit3,
  PenTool,
  Building2
} from "lucide-react";
import { GeneratedResume, VaultItem } from "@/types/jd";
import { toast } from "sonner";
import { CollapsibleSection } from "./ui/CollapsibleSection";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = Array.from({ length: 21 }, (_, i) => String(2015 + i));

interface ResumeHeader {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
}

interface ResumePreviewProps {
  resume: GeneratedResume;
  header: ResumeHeader;
  vaultItems: VaultItem[];
  onUpdate: (updatedResume: GeneratedResume, updatedHeader: ResumeHeader) => void;
  onRegenerate: () => void;
  onDownloadPDF: () => void;
  onDownloadDOC: () => void;
  isGenerating: boolean;
  initialTab?: 'resume' | 'cover-letter';
  nameFontSize: number;
  headlineFontSize: number;
  subHeadlineFontSize: number;
  bodyFontSize: number;
  fontFamily: string;
  coverLetter: string | null;
  isGeneratingCL: boolean;
  onGenerateCL: () => void;
  onDownloadCL: (format: 'pdf' | 'doc') => void;
  onUpdateCoverLetter?: (updatedCL: string) => void;
  onSave?: () => void;
  summaryLines?: number;
  experienceBullets?: number;
  projectLines?: number;
  productLines?: number;
  marginSize?: number;
  lineSpacing?: number;
  visibleSections?: Record<string, boolean>;
  sectionOrder?: string[];
  companyName?: string;
  jdTitle?: string;
  activeTabOverride?: 'resume' | 'cover-letter';
  onTabChange?: (tab: 'resume' | 'cover-letter') => void;
}

const limitSummarySentences = (summaryText: string, maxSentences: number): string => {
  if (!summaryText) return "";
  // Split by sentence boundaries, handling abbreviations safely
  const sentences = summaryText.split(/\.\s+/).filter(Boolean);
  const sliced = sentences
    .slice(0, maxSentences)
    .map(s => s.trim() + (s.trim().endsWith(".") ? "" : "."))
    .join(" ");
    
  // Enforce a strict visual line budget of approximately 115 characters per line
  const budget = maxSentences === 1 ? 115 : maxSentences === 2 ? 230 : maxSentences * 115;
  if (sliced.length > budget + 15) {
    let current = "";
    for (const sent of sentences.slice(0, maxSentences)) {
      const candidate = current ? current + " " + sent : sent;
      if (candidate.length > budget + 10) {
        if (current.length > 50) {
          break; // Stop adding more sentences to protect the line count
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


const renderSubHeaderWithLinks = (
  heading: string, 
  content: string, 
  fontSizes: { subHeader: string; body: string }
) => {
  // 1. Split heading to get Title and Tech Stack (split on dash with spaces to protect inline hyphens like Scikit-learn)
  const headingParts = (heading || "").split(/\s+[-–—]\s+/);
  const title = headingParts[0] || "Title";
  const techStack = headingParts.slice(1).join(" | ");

  // 2. Parse content for Status/Year and Links
  const rawContent = content || "";
  
  // Find any URLs inside rawContent using robust regex
  const urlRegex = /(https?:\/\/[^\s|]+|github\.com\/[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const rawUrls = rawContent.match(urlRegex) || [];
  
  // Deduplicate URLs
  const urls: string[] = [];
  const seen = new Set<string>();
  rawUrls.forEach(u => {
    const norm = u.toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .trim();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      urls.push(u.trim());
    }
  });
  
  // Extract non-URL text (e.g. Year or Status like "2024", "Live", "Ongoing")
  let statusOrYear = rawContent;
  urls.forEach(url => {
    statusOrYear = statusOrYear.split(url).join("");
  });
  
  // Clean separators from statusOrYear
  statusOrYear = statusOrYear.replace(/[|\s-–—]+/g, " ").trim();

  // Remove redundant "Live" status, but preserve "Ongoing"
  if (statusOrYear.toLowerCase() === "live" || statusOrYear.toLowerCase() === "live |" || statusOrYear.toLowerCase() === "| live") {
    statusOrYear = "";
  }

  if (statusOrYear === "|" || statusOrYear === "-" || statusOrYear === "–" || statusOrYear === "—") {
    statusOrYear = "";
  }

  return (
    <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit', width: '100%' }}>
      {/* Left side: Title | Tech Stack */}
      <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>
        {title?.trim()}
        {techStack && (
          <span className="font-normal opacity-60 !font-inherit" style={{ fontFamily: 'inherit' }}>
            {" "}| {techStack.replace(/^\s*\|\s*/, "").trim()}
          </span>
        )}
      </span>

      {/* Right side: Year/Status | GitHub | Live Link */}
      <span className="flex-shrink-0 text-right ml-4 text-[11px] font-normal !font-inherit flex items-center gap-1.5" style={{ fontFamily: 'inherit' }}>
        {statusOrYear && (
          <span className="opacity-70 font-semibold mr-1">{statusOrYear}</span>
        )}
        
        {urls.map((url, idx) => {
          const href = url.startsWith("http") ? url : `https://${url}`;
          const isGithub = url.toLowerCase().includes("github.com");
          const label = isGithub ? "GitHub" : "Live Link";
          
          return (
            <React.Fragment key={idx}>
              {(statusOrYear || idx > 0) && <span className="opacity-30">|</span>}
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1E2A3A] font-bold hover:underline hover:text-lumina-teal transition-all"
                style={{ fontFamily: 'inherit' }}
              >
                {label}
              </a>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
};

export const ResumePreview = ({ 
  resume, 
  header, 
  vaultItems,
  onUpdate, 
  onRegenerate, 
  onDownloadPDF,
  onDownloadDOC,
  isGenerating,
  fontFamily,
  coverLetter,
  isGeneratingCL,
  onGenerateCL,
  onDownloadCL,
  onUpdateCoverLetter,
  onSave,
  initialTab,
  nameFontSize,
  headlineFontSize,
  subHeadlineFontSize,
  bodyFontSize,
  summaryLines = 3,
  experienceBullets = 3,
  projectLines = 3,
  productLines = 3,
  marginSize = 0.5,
  lineSpacing = 1.15,
  visibleSections,
  sectionOrder,
  companyName,
  jdTitle,
  activeTabOverride,
  onTabChange
}: ResumePreviewProps) => {
  const defaultSectionOrder = ['SUMMARY', 'EDUCATION', 'EXPERIENCE', 'PRODUCTS', 'PROJECTS', 'LEADERSHIP', 'SKILLS', 'AWARDS', 'CERTIFICATIONS'];
  const actualSectionOrder = sectionOrder || defaultSectionOrder;
  const actualVisibleSections = visibleSections || {
    'SUMMARY': true,
    'EDUCATION': true,
    'EXPERIENCE': true,
    'PROJECTS': true,
    'PRODUCTS': true,
    'LEADERSHIP': true,
    'SKILLS': true,
    'AWARDS': true,
    'CERTIFICATIONS': true
  };
  // ── Core Data State ──
  const [localResume, setLocalResume] = useState<GeneratedResume>(resume);
  const [localHeader, setLocalHeader] = useState<ResumeHeader>(header);

  const updateResumeState = (updated: GeneratedResume) => {
    const sortedProjects = [...(updated.projects || [])].sort((a, b) => {
      const getYear = (str: string): number => {
        const raw = (str || "").toLowerCase();
        if (raw.includes("ongoing") || raw.includes("present")) return 3000;
        const match = raw.match(/\b(20\d{2})\b/);
        return match ? parseInt(match[1], 10) : 0;
      };
      return getYear(b.content) - getYear(a.content);
    });
    const nextResume = { ...updated, projects: sortedProjects };
    setLocalResume(nextResume);
    onUpdate(nextResume, localHeader);
  };
  
  // ── UI Logic State ──
  const [openSection, setOpenSection] = useState<string | null>("profile");
  const [showVaultPicker, setShowVaultPicker] = useState<{ section: 'experience' | 'projects' | 'products' | 'education' | 'certifications', index?: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'resume' | 'cover-letter'>(initialTab || 'resume');

  // Sync active tab when parent overrides it (e.g., after cover letter generation)
  useEffect(() => {
    if (activeTabOverride) {
      setActiveTab(activeTabOverride);
    }
  }, [activeTabOverride]);

  // Notify parent when tab changes locally
  const handleTabChange = (tab: 'resume' | 'cover-letter') => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };
  
  // ── Cover Letter Editing State ──
  const [clDate, setClDate] = useState(new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
  const [clRecipientName, setClRecipientName] = useState('Hiring Manager');
  const [clRecipientTitle, setClRecipientTitle] = useState('');
  const [clRecipientCompany, setClRecipientCompany] = useState(companyName || '');
  const [clRecipientAddress, setClRecipientAddress] = useState('');
  const [clSignatureName, setClSignatureName] = useState(header.fullName || '');
  const [clEditableBody, setClEditableBody] = useState(coverLetter || '');
  
  // Sync editable body when cover letter changes from generation
  useEffect(() => {
    if (coverLetter) {
      setClEditableBody(coverLetter);
    }
  }, [coverLetter]);

  // Sync signature name when header changes
  useEffect(() => {
    if (header.fullName) setClSignatureName(header.fullName);
  }, [header.fullName]);

  // Sync company name
  useEffect(() => {
    if (companyName) setClRecipientCompany(companyName);
  }, [companyName]);

  const resumeRef = useRef<HTMLDivElement>(null);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    setLocalResume(resume);
    setLocalHeader(header);
  }, [resume, header]);

  useEffect(() => {
    if (resumeRef.current) {
      const height = resumeRef.current.scrollHeight;
      const a4HeightPx = (resumeRef.current.offsetWidth * 297) / 210;
      setPageCount(Math.ceil(height / a4HeightPx));
    }
  }, [localResume, localHeader, bodyFontSize, nameFontSize]);

  if (!localResume || !localHeader) {
    return (
      <div className="flex items-center justify-center p-12 bg-white/50 backdrop-blur-md rounded-[2.5rem] border border-slate-200/50 min-h-[300px]">
        <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em] animate-pulse">Synthesizing Executive Blueprint...</p>
      </div>
    );
  }

  const updateHeader = (field: keyof ResumeHeader, value: string) => {
    const updated = { ...localHeader, [field]: value };
    setLocalHeader(updated);
    onUpdate(localResume, updated);
  };

  const updateSummary = (value: string) => {
    const updated = { ...localResume, professional_summary: value };
    setLocalResume(updated);
    onUpdate(updated, localHeader);
  };

  const updateExperience = (index: number, field: 'heading' | 'content', value: string) => {
    const newExp = [...(localResume.experience || [])];
    newExp[index] = { ...newExp[index], [field]: value };
    const updated = { ...localResume, experience: newExp };
    setLocalResume(updated);
    onUpdate(updated, localHeader);
  };

  const updateBullet = (section: 'experience' | 'projects' | 'products', sectionIndex: number, bulletIndex: number, value: string) => {
    const newSections = [...(localResume[section] || [])];
    const newBullets = [...(newSections[sectionIndex].bullets || [])];
    newBullets[bulletIndex] = value;
    newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: newBullets };
    const updated = { ...localResume, [section]: newSections };
    setLocalResume(updated);
    onUpdate(updated, localHeader);
  };

  const addBullet = (section: 'experience' | 'projects' | 'products', sectionIndex: number) => {
    const newSections = [...(localResume[section] || [])];
    const newBullets = [...(newSections[sectionIndex].bullets || []), "New strategic impact metric..."];
    newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: newBullets };
    const updated = { ...localResume, [section]: newSections };
    setLocalResume(updated);
    onUpdate(updated, localHeader);
  };

  const removeBullet = (section: 'experience' | 'projects' | 'products', sectionIndex: number, bulletIndex: number) => {
    const newSections = [...(localResume[section] || [])];
    const newBullets = (newSections[sectionIndex].bullets || []).filter((_, i) => i !== bulletIndex);
    newSections[sectionIndex] = { ...newSections[sectionIndex], bullets: newBullets };
    const updated = { ...localResume, [section]: newSections };
    setLocalResume(updated);
    onUpdate(updated, localHeader);
  };

  const addFromVault = (item: VaultItem) => {
    let updatedResume = { ...localResume };
    
    // Clean string helper
    const cleanBullets = item.bullets && item.bullets.length > 0 
      ? item.bullets 
      : (item.description ? [item.description] : []);

    if (showVaultPicker?.section === 'experience') {
      const newItems = [...(localResume.experience || []), { 
        heading: item.organization ? `${item.title} @ ${item.organization} - Remote` : item.title, 
        content: item.period || "Jan 2023 – Present", 
        bullets: cleanBullets.length > 0 ? cleanBullets : ["[Enter role responsibilities, key achievements, and technologies used]"] 
      }];
      updatedResume = { ...localResume, experience: newItems };
    } else if (showVaultPicker?.section === 'projects') {
      const projects = localResume.projects || [];
      const techStack = item.skills && item.skills.length > 0 ? item.skills.join(', ') : 'React, Node.js';
      const year = item.period || new Date().getFullYear().toString();
      
      const contentParts = [year];
      if (item.github_link) contentParts.push(item.github_link.replace(/^https?:\/\//, ''));
      if (item.live_link) contentParts.push(item.live_link.replace(/^https?:\/\//, ''));
      const contentStr = contentParts.join(' | ');

      const newItems = [...projects, { 
        heading: `${item.title} - ${techStack}`, 
        content: contentStr, 
        bullets: cleanBullets.length > 0 ? cleanBullets : ["[Enter project goals, technical implementation details, and your specific contributions]"] 
      }];
      updatedResume = { ...localResume, projects: newItems };
    } else if (showVaultPicker?.section === 'products') {
      const products = localResume.products || [];
      const techStack = item.skills && item.skills.length > 0 ? item.skills.join(', ') : 'Next.js, FastAPI';
      const status = item.period?.toLowerCase().includes('present') || !item.period ? 'Ongoing' : 'Live';

      const contentParts = [status];
      if (item.github_link) contentParts.push(item.github_link.replace(/^https?:\/\//, ''));
      if (item.live_link) contentParts.push(item.live_link.replace(/^https?:\/\//, ''));
      const contentStr = contentParts.join(' | ');

      const newItems = [...products, { 
        heading: `${item.title} - ${techStack}`, 
        content: contentStr, 
        bullets: cleanBullets.length > 0 ? cleanBullets : ["[Enter venture goals, growth metrics, and technical contributions]"] 
      }];
      updatedResume = { ...localResume, products: newItems };
    } else if (showVaultPicker?.section === 'leadership') {
      const leadership = localResume.leadership || [];
      const newItems = [...leadership, { 
        heading: item.organization ? `${item.title} @ ${item.organization}` : item.title, 
        content: item.period || "2023 – Present", 
        bullets: cleanBullets.length > 0 ? cleanBullets : ["[Enter leadership responsibilities, team size, and key initiatives led]"] 
      }];
      updatedResume = { ...localResume, leadership: newItems };
    } else if (showVaultPicker?.section === 'education') {
      const education = localResume.education || [];
      const eduEntry = `${item.title} @ ${item.organization || "University"} - Bengaluru, India | ${item.period || "July 2020 – June 2024"} | GPA: 8.0/10`;
      updatedResume = { ...localResume, education: [...education, eduEntry] };
    } else if (showVaultPicker?.section === 'certifications') {
      const certifications = localResume.certifications || [];
      const certEntry = `${item.title} (${item.organization || "Issuer"}) - ${item.period || new Date().getFullYear()}`;
      updatedResume = { ...localResume, certifications: [...certifications, certEntry] };
    }
    setLocalResume(updatedResume);
    onUpdate(updatedResume, localHeader);
    setShowVaultPicker(null);
    toast.success(`Imported ${item.title} from vault!`);
  };

  // ── Dynamic Style Mappings ──
  const fontSizes = {
    name: `${nameFontSize}px`,
    header: `${headlineFontSize}px`,
    subHeader: `${subHeadlineFontSize}px`,
    body: `${bodyFontSize}px`,
    meta: `${bodyFontSize}px`,
  };



  const getHtmlFont = (font: string) => {
    switch(font) {
      case "Inter": return "Inter, sans-serif";
      case "Roboto": return "Roboto, sans-serif";
      case "Merriweather": return "Merriweather, serif";
      case "Arial": return "Arial, sans-serif";
      default: return "Inter, sans-serif";
    }
  };

  return (
    <div className="w-full px-4 sm:px-8 2xl:px-12 mx-auto min-h-[calc(100vh-140px)]">
      {/* ── SHARED CANDIDACY HUB ── */}
      <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white/40 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.05)] mb-10 gap-6">
        <div className="flex bg-slate-100/50 p-1.5 rounded-[1.8rem] border border-slate-200/50 shadow-inner">
          <button 
            onClick={() => handleTabChange('resume')}
            className={`flex items-center gap-2 px-8 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === 'resume' ? 'bg-[#1E2A3A] text-white shadow-xl scale-105' : 'text-[#1E2A3A]/40 hover:text-[#1E2A3A]'}`}
          >
            <Layers size={14} />
            Resume Blueprint
          </button>
          <button 
            onClick={() => handleTabChange('cover-letter')}
            className={`flex items-center gap-2 px-8 py-3 rounded-[1.4rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 ${activeTab === 'cover-letter' ? 'bg-[#1E2A3A] text-white shadow-xl scale-105' : 'text-[#1E2A3A]/40 hover:text-[#1E2A3A]'}`}
          >
            <Mail size={14} />
            Cover Letter
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === 'resume' ? (
            <div className="flex items-center gap-3">
              <button onClick={onRegenerate} disabled={isGenerating} className="p-3 rounded-2xl bg-white border border-slate-200 text-[#1E2A3A]/40 hover:text-lumina-teal hover:border-lumina-teal/20 transition-all shadow-sm group">
                <RotateCcw size={18} className={isGenerating ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
              </button>
              <button onClick={onSave} className="p-3 rounded-2xl bg-lumina-teal text-white shadow-lg shadow-lumina-teal/20 transition-all hover:scale-105">
                <Save size={18} />
              </button>
              <div className="h-8 w-px bg-slate-200 mx-2" />
              <button onClick={onDownloadPDF} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#1E2A3A] text-white shadow-lg shadow-[#1E2A3A]/20 transition-all hover:scale-105 group">
                <Download size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Export PDF</span>
              </button>
              <button onClick={onDownloadDOC} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-[#1E2A3A]/10 text-[#1E2A3A] shadow-lg shadow-slate-100 transition-all hover:scale-105 group">
                <FileText size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">Export Word</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              {!coverLetter ? (
                <button 
                  onClick={onGenerateCL} 
                  disabled={isGeneratingCL}
                  className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-lumina-teal text-white shadow-lg shadow-lumina-teal/20 transition-all hover:scale-105 font-black text-[10px] uppercase tracking-widest"
                >
                  {isGeneratingCL ? <RotateCcw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                  Synthesize Cover Letter
                </button>
              ) : (
                <>
                  <button onClick={onGenerateCL} disabled={isGeneratingCL} className="p-3 rounded-2xl bg-white border border-slate-200 text-[#1E2A3A]/40 hover:text-lumina-teal transition-all shadow-sm">
                    <RotateCcw size={18} className={isGeneratingCL ? 'animate-spin' : ''} />
                  </button>
                  <div className="h-8 w-px bg-slate-200 mx-2" />
                  <button onClick={() => onDownloadCL?.('pdf')} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#1E2A3A] text-white shadow-lg shadow-[#1E2A3A]/20 transition-all hover:scale-105">
                    <Download size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">CL PDF</span>
                  </button>
                  <button onClick={() => onDownloadCL?.('doc')} className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white border border-[#1E2A3A]/10 text-[#1E2A3A] shadow-lg shadow-slate-100 transition-all hover:scale-105">
                    <FileText size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">CL Word</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'resume' ? (
          <motion.div 
            key="resume-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-auto w-full"
          >
            {/* ── LEFT PANEL: EDITORS ── */}
            <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-4 space-y-6 h-auto">
              <CollapsibleSection 
                title="Profile Identity" 
                icon={User} 
                isOpen={openSection === "profile"} 
                onToggle={() => setOpenSection(openSection === "profile" ? null : "profile")}
              >
                <div className="grid grid-cols-1 gap-3 pt-2">
                  <input value={localHeader.fullName} onChange={(e) => updateHeader('fullName', e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-medium outline-none" placeholder="Full Name" />
                  <input value={localHeader.email} onChange={(e) => updateHeader('email', e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-medium outline-none" placeholder="Email" />
                  <input value={localHeader.phone} onChange={(e) => updateHeader('phone', e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-medium outline-none" placeholder="Phone" />
                  <input value={localHeader.location} onChange={(e) => updateHeader('location', e.target.value)} className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-xs font-medium outline-none" placeholder="Location" />
                  <div className="grid grid-cols-3 gap-2">
                    <input value={localHeader.linkedin} onChange={(e) => updateHeader('linkedin', e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2.5 text-[9px] font-bold outline-none" placeholder="LinkedIn" />
                    <input value={localHeader.github} onChange={(e) => updateHeader('github', e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2.5 text-[9px] font-bold outline-none" placeholder="GitHub" />
                    <input value={localHeader.portfolio} onChange={(e) => updateHeader('portfolio', e.target.value)} className="bg-slate-50 rounded-xl px-3 py-2.5 text-[9px] font-bold outline-none" placeholder="Portfolio" />
                  </div>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Professional Summary" 
                icon={FileText} 
                isOpen={openSection === "summary"} 
                onToggle={() => setOpenSection(openSection === "summary" ? null : "summary")}
              >
                <textarea 
                  value={localResume.professional_summary} 
                  onChange={(e) => updateSummary(e.target.value)}
                  className="w-full min-h-[120px] bg-slate-50/50 border-none rounded-2xl p-4 text-[11px] font-body leading-relaxed outline-none focus:ring-1 ring-lumina-teal/20"
                />
                {(() => {
                  const normalized = (localResume.professional_summary || "")
                    .replace(/([a-zA-Z])\.([A-Za-z])/g, '$1. $2')
                    .replace(/([a-zA-Z])!([A-Za-z])/g, '$1! $2')
                    .replace(/([a-zA-Z])\?([A-Za-z])/g, '$1? $2');
                  const sentences = normalized.match(/[^.!?]+[.!?]+(\s|$)/g) || [];
                  const count = sentences.filter(Boolean).length;
                  if (count > summaryLines) {
                    return (
                      <div className="mt-2 text-[9px] text-amber-600 font-medium px-2 flex flex-col gap-0.5">
                        <span>⚠️ Currently contains {count} sentences. Settings allow a maximum of {summaryLines} sentences.</span>
                        <span className="opacity-80">Only the first {summaryLines} sentences will be included in the PDF and exports.</span>
                      </div>
                    );
                  }
                  return null;
                })()}
              </CollapsibleSection>

              <CollapsibleSection 
                title="Experience" 
                icon={Briefcase} 
                isOpen={openSection === "experience"} 
                onToggle={() => setOpenSection(openSection === "experience" ? null : "experience")}
                action={<button onClick={() => setShowVaultPicker({ section: 'experience' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-4">
                  {(localResume.experience || []).map((exp, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-border/10 space-y-3 relative group/exp">
                      <button onClick={() => updateResumeState({...localResume, experience: (localResume.experience || []).filter((_, i) => i !== idx)})} className="absolute top-3 right-3 p-1.5 text-red-500 opacity-0 group-hover/exp:opacity-100 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={12} /></button>
                      {(() => {
                        const headingParts = (exp.heading || "").split('@');
                        const role = headingParts[0]?.trim() || "";
                        const orgParts = headingParts[1] ? headingParts[1].split(/\s+[-–—]\s+/) : [];
                        const org = orgParts[0]?.trim() || "";
                        const rawLocOrMode = orgParts[1]?.trim() || "";

                        let currentMode = "Remote";
                        let currentLocation = "";
                        if (rawLocOrMode.toLowerCase().includes("on-site") || rawLocOrMode.toLowerCase().includes("onsite")) {
                          currentMode = "On-site";
                          const locMatch = rawLocOrMode.match(/\(([^)]+)\)/);
                          if (locMatch) {
                            currentLocation = locMatch[1];
                          }
                        } else if (rawLocOrMode.toLowerCase().includes("offline")) {
                          currentMode = "Offline";
                          const locMatch = rawLocOrMode.match(/\(([^)]+)\)/);
                          if (locMatch) {
                            currentLocation = locMatch[1];
                          }
                        } else if (rawLocOrMode) {
                          const locMatch = rawLocOrMode.match(/\(([^)]+)\)/);
                          if (locMatch) {
                            currentLocation = locMatch[1];
                            currentMode = rawLocOrMode.split('(')[0].trim();
                          } else {
                            if (rawLocOrMode.toLowerCase() === "remote") {
                              currentMode = "Remote";
                            } else {
                              currentMode = "On-site";
                              currentLocation = rawLocOrMode;
                            }
                          }
                        }

                        const updateHeadingField = (field: 'role' | 'org' | 'mode' | 'location', val: string) => {
                          const nextRole = field === 'role' ? val : role;
                          const nextOrg = field === 'org' ? val : org;
                          const nextMode = field === 'mode' ? val : currentMode;
                          const nextLoc = field === 'location' ? val : currentLocation;

                          let headingStr = "";
                          if (nextRole || nextOrg) {
                            const companyPart = nextOrg ? ` @ ${nextOrg}` : "";
                            let modePart = "";
                            if (nextMode === "Remote") {
                              modePart = " - Remote";
                            } else if (nextMode === "Offline") {
                              modePart = nextLoc ? ` - Offline (${nextLoc})` : " - Offline";
                            } else {
                              modePart = nextLoc ? ` - On-site (${nextLoc})` : " - On-site";
                            }
                            headingStr = `${nextRole}${companyPart}${modePart}`;
                          }
                          updateExperience(idx, 'heading', headingStr);
                        };

                        return (
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-black text-[#1E2A3A]/40 uppercase tracking-wider">Role</label>
                              <input 
                                value={role} 
                                onChange={(e) => updateHeadingField('role', e.target.value)} 
                                className="w-full bg-white/70 rounded-lg px-3 py-1.5 font-bold outline-none border border-slate-200/50 focus:border-lumina-teal/20" 
                                placeholder="Job Title"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-black text-[#1E2A3A]/40 uppercase tracking-wider">Company</label>
                              <input 
                                value={org} 
                                onChange={(e) => updateHeadingField('org', e.target.value)} 
                                className="w-full bg-white/70 rounded-lg px-3 py-1.5 font-bold outline-none border border-slate-200/50 focus:border-lumina-teal/20" 
                                placeholder="Company"
                              />
                            </div>
                            <div className="flex flex-col gap-1">
                              <label className="text-[9px] font-black text-[#1E2A3A]/40 uppercase tracking-wider">Mode</label>
                              <select 
                                value={currentMode} 
                                onChange={(e) => updateHeadingField('mode', e.target.value)} 
                                className="w-full bg-white/70 rounded-lg px-3 py-1.5 outline-none border border-slate-200/50 focus:border-lumina-teal/20 font-semibold"
                              >
                                <option value="On-site">On-site</option>
                                <option value="Remote">Remote</option>
                                <option value="Offline">Offline</option>
                              </select>
                            </div>
                            {currentMode !== "Remote" && (
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-black text-[#1E2A3A]/40 uppercase tracking-wider">Location</label>
                                <input 
                                  value={currentLocation} 
                                  onChange={(e) => updateHeadingField('location', e.target.value)} 
                                  className="w-full bg-white/70 rounded-lg px-3 py-1.5 outline-none border border-slate-200/50 focus:border-lumina-teal/20" 
                                  placeholder="Bengaluru, India"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        const content = exp.content || "";
                        // Decompose exp.content (e.g. "July 2022 – June 2023" or "Jan 2023 – Present")
                        let parsedStartMonth = "January";
                        let parsedStartYear = "2023";
                        let parsedEndMonth = "June";
                        let parsedEndYear = "2026";
                        let parsedIsCurrent = false;

                        const parts = content.split(/\s*[-–—to]\s*/i).filter(Boolean);
                        if (parts.length >= 2) {
                          const start = parts[0].trim();
                          const end = parts[1].trim();
                          
                          const startParts = start.split(/\s+/);
                          if (startParts.length >= 2) {
                            const sm = startParts[0];
                            const sy = startParts[1];
                            const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(sm.toLowerCase()));
                            if (foundMonth) parsedStartMonth = foundMonth;
                            if (/^\d{4}$/.test(sy)) parsedStartYear = sy;
                          }
                          
                          if (end.toLowerCase() === 'present') {
                            parsedIsCurrent = true;
                          } else {
                            parsedIsCurrent = false;
                            const endParts = end.split(/\s+/);
                            if (endParts.length >= 2) {
                              const em = endParts[0];
                              const ey = endParts[1];
                              const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(em.toLowerCase()));
                              if (foundMonth) parsedEndMonth = foundMonth;
                              if (/^\d{4}$/.test(ey)) parsedEndYear = ey;
                            }
                          }
                        } else if (content.toLowerCase().includes('present')) {
                          parsedIsCurrent = true;
                          const startParts = content.split(/\s+/);
                          if (startParts.length >= 2) {
                            const sm = startParts[0];
                            const sy = startParts[1].replace(/[^0-9]/g, '');
                            const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(sm.toLowerCase()));
                            if (foundMonth) parsedStartMonth = foundMonth;
                            if (/^\d{4}$/.test(sy)) parsedStartYear = sy;
                          }
                        }

                        const updateDurationStr = (sm: string, sy: string, em: string, ey: string, curr: boolean) => {
                          const endPart = curr ? "Present" : `${em} ${ey}`;
                          const nextStr = `${sm} ${sy} – ${endPart}`;
                          updateExperience(idx, 'content', nextStr);
                        };

                        return (
                          <div className="space-y-2 bg-slate-100/30 p-3 rounded-lg border border-slate-200/50 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] uppercase tracking-widest font-black text-slate-500">Duration Builder</span>
                              <label className="flex items-center gap-1.5 cursor-pointer font-bold text-[10px] text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={parsedIsCurrent}
                                  onChange={(e) => updateDurationStr(parsedStartMonth, parsedStartYear, parsedEndMonth, parsedEndYear, e.target.checked)}
                                  className="rounded border-slate-200 text-lumina-teal focus:ring-0 w-3 h-3"
                                />
                                <span>Present</span>
                              </label>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Start Month</span>
                                <select
                                  value={parsedStartMonth}
                                  onChange={(e) => updateDurationStr(e.target.value, parsedStartYear, parsedEndMonth, parsedEndYear, parsedIsCurrent)}
                                  className="w-full bg-white rounded-lg px-2 py-1 text-[11px] outline-none border border-slate-200 focus:border-lumina-teal/20 cursor-pointer text-slate-800"
                                >
                                  {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Start Year</span>
                                <select
                                  value={parsedStartYear}
                                  onChange={(e) => updateDurationStr(parsedStartMonth, e.target.value, parsedEndMonth, parsedEndYear, parsedIsCurrent)}
                                  className="w-full bg-white rounded-lg px-2 py-1 text-[11px] outline-none border border-slate-200 focus:border-lumina-teal/20 cursor-pointer text-slate-800"
                                >
                                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                              </div>
                              {!parsedIsCurrent && (
                                <>
                                  <div className="flex flex-col gap-0.5 animate-in fade-in duration-300">
                                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">End Month</span>
                                    <select
                                      value={parsedEndMonth}
                                      onChange={(e) => updateDurationStr(parsedStartMonth, parsedStartYear, e.target.value, parsedEndYear, parsedIsCurrent)}
                                      className="w-full bg-white rounded-lg px-2 py-1 text-[11px] outline-none border border-slate-200 focus:border-lumina-teal/20 cursor-pointer text-slate-800"
                                    >
                                      {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                  </div>
                                  <div className="flex flex-col gap-0.5 animate-in fade-in duration-300">
                                    <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">End Year</span>
                                    <select
                                      value={parsedEndYear}
                                      onChange={(e) => updateDurationStr(parsedStartMonth, parsedStartYear, parsedEndMonth, e.target.value, parsedIsCurrent)}
                                      className="w-full bg-white rounded-lg px-2 py-1 text-[11px] outline-none border border-slate-200 focus:border-lumina-teal/20 cursor-pointer text-slate-800"
                                    >
                                      {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                    </select>
                                  </div>
                                </>
                              )}
                            </div>
                            <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-200/50">
                              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Text Preview</span>
                              <input 
                                value={content} 
                                onChange={(e) => updateExperience(idx, 'content', e.target.value)} 
                                className="w-full bg-slate-50/50 rounded-lg px-2.5 py-1 text-[10px] font-semibold outline-none border border-slate-200 focus:border-lumina-teal/20 text-slate-800"
                                placeholder="July 2022 – June 2023"
                              />
                            </div>
                          </div>
                        );
                      })()}
                      <div className="space-y-2">
                        {exp.bullets?.map((bullet, bullIdx) => {
                          const isOverLimit = bullIdx >= experienceBullets;
                          return (
                            <div key={bullIdx} className="flex flex-col gap-1 w-full">
                              <div className="flex gap-2 items-start group/bull">
                                <textarea 
                                  value={bullet} 
                                  onChange={(e) => updateBullet('experience', idx, bullIdx, e.target.value)} 
                                  className={`flex-1 bg-white/50 rounded-xl px-3 py-1.5 text-[11px] font-body outline-none min-h-[36px] border ${
                                    isOverLimit 
                                      ? 'border-amber-300/60 bg-amber-50/20 text-slate-500 line-through decoration-slate-400/40' 
                                      : 'border-transparent focus:border-lumina-teal/20'
                                  }`} 
                                />
                                <button onClick={() => removeBullet('experience', idx, bullIdx)} className="p-1.5 text-red-500 opacity-0 group-hover/bull:opacity-100"><Minus size={10} /></button>
                              </div>

                              {isOverLimit && (
                                <span className="text-[9px] text-amber-600 font-medium px-2 self-start flex items-center gap-1">
                                  ⚠️ Exceeds limit ({experienceBullets} bullets allowed in settings) - will be hidden in PDF
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={() => addBullet('experience', idx)} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest"><Plus size={10} /> Add Bullet</button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => updateResumeState({
                      ...localResume, 
                      experience: [...(localResume.experience || []), { 
                        heading: "New Job Role @ Company - Remote", 
                        content: "Jan 2024 – Present", 
                        bullets: ["Quantifying new business outcome or technical metric..."] 
                      }]
                    })} 
                    className="text-[9px] font-bold text-lumina-teal flex items-center gap-1.5 uppercase tracking-widest pt-3 border-t border-slate-100 mt-2 w-full justify-center hover:text-slate-800 transition-colors"
                  >
                    <Plus size={12} /> Add Experience
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Products / Startups" 
                icon={Rocket} 
                isOpen={openSection === "products"} 
                onToggle={() => setOpenSection(openSection === "products" ? null : "products")}
                action={<button onClick={() => setShowVaultPicker({ section: 'products' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-4">
                  {(localResume.products || []).map((prod, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-border/10 space-y-3 relative group/prod">
                      <button onClick={() => updateResumeState({...localResume, products: (localResume.products || []).filter((_, i) => i !== idx)})} className="absolute top-3 right-3 p-1.5 text-red-500 opacity-0 group-hover/prod:opacity-100 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={12} /></button>
                      <input value={prod.heading} onChange={(e) => {
                        const newProducts = [...(localResume.products || [])];
                        newProducts[idx] = { ...newProducts[idx], heading: e.target.value };
                        updateResumeState({ ...localResume, products: newProducts });
                      }} className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-lumina-teal/20" />
                      <input 
                        value={prod.content || ""} 
                        onChange={(e) => {
                          const newProducts = [...(localResume.products || [])];
                          newProducts[idx] = { ...newProducts[idx], content: e.target.value };
                          updateResumeState({ ...localResume, products: newProducts });
                        }} 
                        className="w-full bg-slate-100/50 rounded-lg px-3 py-1.5 text-[11px] font-body outline-none border border-slate-200/30 focus:border-lumina-teal/20" 
                        placeholder="Dates or Link (e.g., Jan 2023 - Present)" 
                      />
                      <div className="space-y-2">
                        {prod.bullets?.map((bullet, bullIdx) => {
                          const isOverLimit = bullIdx >= productLines;
                          return (
                            <div key={bullIdx} className="flex flex-col gap-1 w-full">
                              <div className="flex gap-2 items-start group/bull">
                                <textarea 
                                  value={bullet} 
                                  onChange={(e) => updateBullet('products', idx, bullIdx, e.target.value)} 
                                  className={`flex-1 bg-white/50 rounded-xl px-3 py-1.5 text-[11px] font-body outline-none min-h-[36px] border ${
                                    isOverLimit 
                                      ? 'border-amber-300/60 bg-amber-50/20 text-slate-500 line-through decoration-slate-400/40' 
                                      : 'border-transparent focus:border-lumina-teal/20'
                                  }`} 
                                />
                                <button onClick={() => removeBullet('products', idx, bullIdx)} className="p-1.5 text-red-500 opacity-0 group-hover/bull:opacity-100"><Minus size={10} /></button>
                              </div>

                              {isOverLimit && (
                                <span className="text-[9px] text-amber-600 font-medium px-2 self-start flex items-center gap-1">
                                  ⚠️ Exceeds limit ({productLines} bullets allowed in settings) - will be hidden in PDF
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={() => addBullet('products', idx)} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest"><Plus size={10} /> Add Bullet</button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => updateResumeState({
                      ...localResume, 
                      products: [...(localResume.products || []), { 
                        heading: "New Product - Next.js, FastAPI", 
                        content: "Live | github.com/username/product | product.live", 
                        bullets: ["Quantifying product achievements or growth metric..."] 
                      }]
                    })} 
                    className="text-[9px] font-bold text-lumina-teal flex items-center gap-1.5 uppercase tracking-widest pt-3 border-t border-slate-100 mt-2 w-full justify-center hover:text-slate-800 transition-colors"
                  >
                    <Plus size={12} /> Add Product / Startup
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Technical Projects" 
                icon={Database} 
                isOpen={openSection === "projects"} 
                onToggle={() => setOpenSection(openSection === "projects" ? null : "projects")}
                action={<button onClick={() => setShowVaultPicker({ section: 'projects' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-4">
                  {(localResume.projects || []).map((proj, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-border/10 space-y-3 relative group/proj">
                      <button onClick={() => updateResumeState({...localResume, projects: (localResume.projects || []).filter((_, i) => i !== idx)})} className="absolute top-3 right-3 p-1.5 text-red-500 opacity-0 group-hover/proj:opacity-100 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={12} /></button>
                      <input value={proj.heading} onChange={(e) => {
                        const newProjects = [...(localResume.projects || [])];
                        newProjects[idx] = { ...newProjects[idx], heading: e.target.value };
                        updateResumeState({ ...localResume, projects: newProjects });
                      }} className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-lumina-teal/20" />
                      <input 
                        value={proj.content || ""} 
                        onChange={(e) => {
                          const newProjects = [...(localResume.projects || [])];
                          newProjects[idx] = { ...newProjects[idx], content: e.target.value };
                          updateResumeState({ ...localResume, projects: newProjects });
                        }} 
                        className="w-full bg-slate-100/50 rounded-lg px-3 py-1.5 text-[11px] font-body outline-none border border-slate-200/30 focus:border-lumina-teal/20" 
                        placeholder="Dates or Link (e.g., 2024 | github.com/username/project | live-site.com)" 
                      />
                      <div className="space-y-2">
                        {proj.bullets?.map((bullet, bullIdx) => {
                          const isOverLimit = bullIdx >= projectLines;
                          return (
                            <div key={bullIdx} className="flex flex-col gap-1 w-full">
                              <div className="flex gap-2 items-start group/bull">
                                <textarea 
                                  value={bullet} 
                                  onChange={(e) => updateBullet('projects', idx, bullIdx, e.target.value)} 
                                  className={`flex-1 bg-white/50 rounded-xl px-3 py-1.5 text-[11px] font-body outline-none min-h-[36px] border ${
                                    isOverLimit 
                                      ? 'border-amber-300/60 bg-amber-50/20 text-slate-500 line-through decoration-slate-400/40' 
                                      : 'border-transparent focus:border-lumina-teal/20'
                                  }`} 
                                />
                                <button onClick={() => removeBullet('projects', idx, bullIdx)} className="p-1.5 text-red-500 opacity-0 group-hover/bull:opacity-100"><Minus size={10} /></button>
                              </div>

                              {isOverLimit && (
                                <span className="text-[9px] text-amber-600 font-medium px-2 self-start flex items-center gap-1">
                                  ⚠️ Exceeds limit ({projectLines} bullets allowed in settings) - will be hidden in PDF
                                </span>
                              )}
                            </div>
                          );
                        })}
                        <button onClick={() => addBullet('projects', idx)} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest"><Plus size={10} /> Add Bullet</button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => updateResumeState({
                      ...localResume, 
                      projects: [...(localResume.projects || []), { 
                        heading: "New Project - React, TailwindCSS", 
                        content: "2024 | github.com/username/project | demo-site.com", 
                        bullets: ["Quantifying project achievements or technical metric..."] 
                      }]
                    })} 
                    className="text-[9px] font-bold text-lumina-teal flex items-center gap-1.5 uppercase tracking-widest pt-3 border-t border-slate-100 mt-2 w-full justify-center hover:text-slate-800 transition-colors"
                  >
                    <Plus size={12} /> Add Project
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Leadership" 
                icon={User} 
                isOpen={openSection === "leadership"} 
                onToggle={() => setOpenSection(openSection === "leadership" ? null : "leadership")}
                action={<button onClick={() => setShowVaultPicker({ section: 'leadership' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-4">
                  {(localResume.leadership || []).map((lead, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-50/50 border border-border/10 space-y-3 relative group/lead">
                      <button onClick={() => updateResumeState({...localResume, leadership: (localResume.leadership || []).filter((_, i) => i !== idx)})} className="absolute top-3 right-3 p-1.5 text-red-500 opacity-0 group-hover/lead:opacity-100 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={12} /></button>
                      <input value={lead.heading} onChange={(e) => {
                        const newLead = [...(localResume.leadership || [])];
                        newLead[idx] = { ...newLead[idx], heading: e.target.value };
                        updateResumeState({ ...localResume, leadership: newLead });
                      }} className="w-full bg-transparent font-bold text-sm outline-none border-b border-transparent focus:border-lumina-teal/20" />
                      <div className="space-y-2">
                        {lead.bullets?.map((bullet, bullIdx) => (
                          <div key={bullIdx} className="flex flex-col gap-1 w-full">
                            <div className="flex gap-2 items-start group/bull">
                              <textarea 
                                value={bullet} 
                                onChange={(e) => {
                                  const newLead = [...(localResume.leadership || [])];
                                  const newBullets = [...(newLead[idx].bullets || [])];
                                  newBullets[bullIdx] = e.target.value;
                                  newLead[idx] = { ...newLead[idx], bullets: newBullets };
                                  updateResumeState({ ...localResume, leadership: newLead });
                                }} 
                                className="flex-1 bg-white/50 rounded-xl px-3 py-1.5 text-[11px] font-body outline-none min-h-[36px] border border-transparent focus:border-lumina-teal/20" 
                              />
                              <button onClick={() => {
                                const newLead = [...(localResume.leadership || [])];
                                const newBullets = (newLead[idx].bullets || []).filter((_, i) => i !== bullIdx);
                                newLead[idx] = { ...newLead[idx], bullets: newBullets };
                                updateResumeState({ ...localResume, leadership: newLead });
                              }} className="p-1.5 text-red-500 opacity-0 group-hover/bull:opacity-100"><Minus size={10} /></button>
                            </div>


                          </div>
                        ))}
                        <button onClick={() => {
                          const newLead = [...(localResume.leadership || [])];
                          const newBullets = [...(newLead[idx].bullets || []), "New leadership achievement..."];
                          newLead[idx] = { ...newLead[idx], bullets: newBullets };
                          updateResumeState({ ...localResume, leadership: newLead });
                        }} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest"><Plus size={10} /> Add Bullet</button>
                      </div>
                    </div>
                  ))}
                  <button 
                    onClick={() => updateResumeState({
                      ...localResume, 
                      leadership: [...(localResume.leadership || []), { 
                        heading: "Lead Organizer @ TechFest", 
                        content: "2024", 
                        bullets: ["New leadership highlight or impact detail..."] 
                      }]
                    })} 
                    className="text-[9px] font-bold text-lumina-teal flex items-center gap-1.5 uppercase tracking-widest pt-3 border-t border-slate-100 mt-2 w-full justify-center hover:text-slate-800 transition-colors"
                  >
                    <Plus size={12} /> Add Leadership
                  </button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Education" 
                icon={GraduationCap} 
                isOpen={openSection === "education"} 
                onToggle={() => setOpenSection(openSection === "education" ? null : "education")}
                action={<button onClick={() => setShowVaultPicker({ section: 'education' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-4">
                  {(localResume.education || []).map((edu, i) => (
                    <div key={i} className="w-full">
                      {(() => {
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

                        let parsedStartMonth = "July";
                        let parsedStartYear = "2023";
                        let parsedEndMonth = "June";
                        let parsedEndYear = "2026";
                        let parsedIsCurrent = false;

                        const parts = timelineSection.split(/\s*[-–—to]\s*/i).filter(Boolean);
                        if (parts.length >= 2) {
                          const start = parts[0].trim();
                          const end = parts[1].trim();
                          
                          const startParts = start.split(/\s+/);
                          if (startParts.length >= 2) {
                            const sm = startParts[0];
                            const sy = startParts[1];
                            const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(sm.toLowerCase()));
                            if (foundMonth) parsedStartMonth = foundMonth;
                            if (/^\d{4}$/.test(sy)) parsedStartYear = sy;
                          }
                          
                          if (end.toLowerCase() === 'present') {
                            parsedIsCurrent = true;
                          } else {
                            parsedIsCurrent = false;
                            const endParts = end.split(/\s+/);
                            if (endParts.length >= 2) {
                              const em = endParts[0];
                              const ey = endParts[1];
                              const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(em.toLowerCase()));
                              if (foundMonth) parsedEndMonth = foundMonth;
                              if (/^\d{4}$/.test(ey)) parsedEndYear = ey;
                            }
                          }
                        } else if (timelineSection.toLowerCase().includes('present')) {
                          parsedIsCurrent = true;
                          const startParts = timelineSection.split(/\s+/);
                          if (startParts.length >= 2) {
                            const sm = startParts[0];
                            const sy = startParts[1].replace(/[^0-9]/g, '');
                            const foundMonth = MONTHS.find(m => m.toLowerCase().startsWith(sm.toLowerCase()));
                            if (foundMonth) parsedStartMonth = foundMonth;
                            if (/^\d{4}$/.test(sy)) parsedStartYear = sy;
                          }
                        }

                        const updateEducationFields = (fields: { degree?: string; school?: string; location?: string; startMonth?: string; startYear?: string; endMonth?: string; endYear?: string; isCurrent?: boolean; gpa?: string }) => {
                          const nextDegree = fields.degree !== undefined ? fields.degree : degree;
                          const nextSchool = fields.school !== undefined ? fields.school : school;
                          const nextLocation = fields.location !== undefined ? fields.location : location;
                          
                          const nextStartMonth = fields.startMonth !== undefined ? fields.startMonth : parsedStartMonth;
                          const nextStartYear = fields.startYear !== undefined ? fields.startYear : parsedStartYear;
                          const nextEndMonth = fields.endMonth !== undefined ? fields.endMonth : parsedEndMonth;
                          const nextEndYear = fields.endYear !== undefined ? fields.endYear : parsedEndYear;
                          const nextIsCurrent = fields.isCurrent !== undefined ? fields.isCurrent : parsedIsCurrent;
                          const nextGpa = fields.gpa !== undefined ? fields.gpa : gpaSection;

                          const endPart = nextIsCurrent ? "Present" : `${nextEndMonth} ${nextEndYear}`;
                          const timelineStr = `${nextStartMonth} ${nextStartYear} – ${endPart}`;
                          
                          const schoolPart = nextSchool ? ` @ ${nextSchool}` : "";
                          const locPart = (nextSchool && nextLocation) ? ` - ${nextLocation}` : (nextLocation ? ` @ ${nextLocation}` : "");
                          const gpaPart = nextGpa ? ` | ${nextGpa}` : "";

                          const nextStr = `${nextDegree}${schoolPart}${locPart} | ${timelineStr}${gpaPart}`;

                          const newEdu = [...(localResume.education || [])];
                          newEdu[i] = nextStr;
                          updateResumeState({ ...localResume, education: newEdu });
                        };

                        return (
                          <div className="p-4 rounded-xl bg-slate-50/50 border border-border/10 space-y-3 relative group/edu w-full">
                            <button 
                              onClick={() => updateResumeState({...localResume, education: (localResume.education || []).filter((_, idx) => idx !== i)})} 
                              className="absolute top-2 right-2 p-1 text-red-500 opacity-0 group-hover/edu:opacity-100 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={12} />
                            </button>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Degree / Course</span>
                                <input
                                  value={degree}
                                  onChange={(e) => updateEducationFields({ degree: e.target.value })}
                                  className="w-full bg-white/70 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none border border-slate-200/50 focus:border-lumina-teal/20 text-slate-800"
                                  placeholder="e.g. BTech in Computer Science"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">School / Uni</span>
                                <input
                                  value={school}
                                  onChange={(e) => updateEducationFields({ school: e.target.value })}
                                  className="w-full bg-white/70 rounded-lg px-2.5 py-1 text-[11px] font-bold outline-none border border-slate-200/50 focus:border-lumina-teal/20 text-slate-800"
                                  placeholder="e.g. REVA University"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Location</span>
                                <input
                                  value={location}
                                  onChange={(e) => updateEducationFields({ location: e.target.value })}
                                  className="w-full bg-white/70 rounded-lg px-2.5 py-1 text-[11px] outline-none border border-slate-200/50 focus:border-lumina-teal/20 text-slate-800"
                                  placeholder="e.g. Bengaluru, India"
                                />
                              </div>
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">GPA / Grade</span>
                                <input
                                  value={gpaSection}
                                  onChange={(e) => updateEducationFields({ gpa: e.target.value })}
                                  className="w-full bg-white/70 rounded-lg px-2.5 py-1 text-[11px] outline-none border border-slate-200/50 focus:border-lumina-teal/20 text-slate-800"
                                  placeholder="e.g. GPA: 8.0/10"
                                />
                              </div>
                            </div>

                            <div className="space-y-2 bg-slate-100/30 p-2.5 rounded-lg border border-slate-200/50 text-[10px]">
                              <div className="flex items-center justify-between">
                                <span className="text-[8px] uppercase tracking-widest font-black text-slate-500">Duration Builder</span>
                                <label className="flex items-center gap-1 cursor-pointer font-bold text-[9px] text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={parsedIsCurrent}
                                    onChange={(e) => updateEducationFields({ isCurrent: e.target.checked })}
                                    className="rounded border-slate-200 text-lumina-teal focus:ring-0 w-2.5 h-2.5"
                                  />
                                  <span>Present</span>
                                </label>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">Start Month</span>
                                  <select
                                    value={parsedStartMonth}
                                    onChange={(e) => updateEducationFields({ startMonth: e.target.value })}
                                    className="w-full bg-white rounded px-1.5 py-0.5 text-[10px] outline-none border border-slate-200 cursor-pointer text-slate-800"
                                  >
                                    {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">Start Year</span>
                                  <select
                                    value={parsedStartYear}
                                    onChange={(e) => updateEducationFields({ startYear: e.target.value })}
                                    className="w-full bg-white rounded px-1.5 py-0.5 text-[10px] outline-none border border-slate-200 cursor-pointer text-slate-800"
                                  >
                                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                  </select>
                                </div>
                                {!parsedIsCurrent && (
                                  <>
                                    <div className="flex flex-col gap-0.5 animate-in fade-in duration-300">
                                      <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">End Month</span>
                                      <select
                                        value={parsedEndMonth}
                                        onChange={(e) => updateEducationFields({ endMonth: e.target.value })}
                                        className="w-full bg-white rounded px-1.5 py-0.5 text-[10px] outline-none border border-slate-200 cursor-pointer text-slate-800"
                                      >
                                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                      </select>
                                    </div>
                                    <div className="flex flex-col gap-0.5 animate-in fade-in duration-300">
                                      <span className="text-[7px] uppercase tracking-wider text-slate-400 font-bold">End Year</span>
                                      <select
                                        value={parsedEndYear}
                                        onChange={(e) => updateEducationFields({ endYear: e.target.value })}
                                        className="w-full bg-white rounded px-1.5 py-0.5 text-[10px] outline-none border border-slate-200 cursor-pointer text-slate-800"
                                      >
                                        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                                      </select>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-200/50">
                              <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Text Preview</span>
                              <input 
                                value={rawStr} 
                                onChange={(e) => {
                                  const newEdu = [...(localResume.education || [])];
                                  newEdu[i] = e.target.value;
                                  updateResumeState({ ...localResume, education: newEdu });
                                }} 
                                className="w-full bg-slate-100/50 rounded px-2 py-0.5 text-[9px] font-semibold outline-none border border-slate-200 focus:border-lumina-teal/20 text-slate-800"
                                placeholder="Btech in CS @ REVA University - BLR | Jan 2023 – Dec 2026 | GPA: 8.0/10"
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                  <button onClick={() => updateResumeState({...localResume, education: [...(localResume.education || []), "Btech in Computer Science @ REVA University - Bengaluru, India | July 2020 – June 2024 | GPA: 8.0/10"]})} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest pt-2"><Plus size={10} /> Add Education</button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Certifications" 
                icon={Award} 
                isOpen={openSection === "certifications"} 
                onToggle={() => setOpenSection(openSection === "certifications" ? null : "certifications")}
                action={<button onClick={() => setShowVaultPicker({ section: 'certifications' })} className="text-[8px] font-black uppercase text-lumina-teal flex items-center gap-1"><Plus size={10}/> Vault</button>}
              >
                <div className="space-y-2">
                  {(localResume.certifications || []).map((cert, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input value={cert} onChange={(e) => {
                        const newCerts = [...(localResume.certifications || [])];
                        newCerts[i] = e.target.value;
                        updateResumeState({ ...localResume, certifications: newCerts });
                      }} className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-[11px] font-medium outline-none" />
                      <button onClick={() => updateResumeState({...localResume, certifications: (localResume.certifications || []).filter((_, idx) => idx !== i)})} className="p-2 text-red-400"><Minus size={12}/></button>
                    </div>
                  ))}
                  <button onClick={() => updateResumeState({...localResume, certifications: [...(localResume.certifications || []), "AWS Solutions Architect (Amazon Web Services) - 2024"]})} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest pt-2"><Plus size={10} /> Add Certification</button>
                </div>
              </CollapsibleSection>

              <CollapsibleSection 
                title="Awards" 
                icon={Award} 
                isOpen={openSection === "awards"} 
                onToggle={() => setOpenSection(openSection === "awards" ? null : "awards")}
              >
                <div className="space-y-2">
                  {(localResume.awards || []).map((award, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <input value={award} onChange={(e) => {
                        const newAwards = [...(localResume.awards || [])];
                        newAwards[i] = e.target.value;
                        updateResumeState({ ...localResume, awards: newAwards });
                      }} className="flex-1 bg-slate-50 rounded-xl px-4 py-2 text-[11px] font-medium outline-none" />
                      <button onClick={() => updateResumeState({...localResume, awards: (localResume.awards || []).filter((_, idx) => idx !== i)})} className="p-2 text-red-400"><Minus size={12}/></button>
                    </div>
                  ))}
                  <button onClick={() => updateResumeState({...localResume, awards: [...(localResume.awards || []), "Hackathon Winner (Google Cloud) - 2024"]})} className="text-[8px] font-bold text-lumina-teal flex items-center gap-1 uppercase tracking-widest pt-2"><Plus size={10} /> Add Award</button>
                </div>
              </CollapsibleSection>
            </div>

            {/* ── RIGHT PANEL: PREVIEW ── */}
            <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-8 flex justify-center w-full">
              <div className="w-full flex-1 perspective-2000 rounded-[2.5rem] shadow-inner bg-slate-100/50 p-4 sm:p-6 md:p-8 border border-white/40">
                <motion.div 
                  ref={resumeRef}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative bg-white border border-[#1E2A3A]/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] mx-auto"
                  style={{ 
                    width: '100%', 
                    maxWidth: '850px',
                    minHeight: '297mm',
                    height: 'auto',
                    padding: `${marginSize}in`,
                    lineHeight: lineSpacing,
                    fontSize: fontSizes.body,
                    fontFamily: getHtmlFont(fontFamily)
                  }}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div className="text-center space-y-2 mb-3">
                      <h1 className="font-bold tracking-tight uppercase !font-inherit" style={{ fontSize: `${nameFontSize}px`, color: '#1E2A3A', fontFamily: 'inherit' }}>
                        {localHeader.fullName || "Your Name"}
                      </h1>
                      <div className="flex flex-wrap justify-center items-center gap-x-2 text-[#1E2A3A] font-medium !font-inherit" style={{ fontSize: fontSizes.meta }}>
                        {localHeader.location && (
                          <>
                            <span>{localHeader.location}</span>
                            <span className="opacity-30">|</span>
                          </>
                        )}
                        {localHeader.phone && (
                          <>
                            <span>{localHeader.phone}</span>
                            <span className="opacity-30">|</span>
                          </>
                        )}
                        {localHeader.email && (
                          <>
                            <a href={`mailto:${localHeader.email.toLowerCase()}`} className="hover:underline text-[#1E2A3A]">
                              {localHeader.email.toLowerCase()}
                            </a>
                            {(localHeader.linkedin || localHeader.github || localHeader.portfolio) && <span className="opacity-30">|</span>}
                          </>
                        )}
                        {localHeader.linkedin && (
                          <>
                            <a 
                              href={localHeader.linkedin.startsWith('http') ? localHeader.linkedin : `https://${localHeader.linkedin}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 underline hover:text-blue-800 transition-colors"
                            >
                              Linkedin
                            </a>
                            {(localHeader.github || localHeader.portfolio) && <span className="opacity-30">|</span>}
                          </>
                        )}
                        {localHeader.github && (
                          <>
                            <a 
                              href={localHeader.github.startsWith('http') ? localHeader.github : `https://${localHeader.github}`} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-blue-600 underline hover:text-blue-800 transition-colors"
                            >
                              GitHub
                            </a>
                            {localHeader.portfolio && <span className="opacity-30">|</span>}
                          </>
                        )}
                        {localHeader.portfolio && (
                          <a 
                            href={localHeader.portfolio.startsWith('http') ? localHeader.portfolio : `https://${localHeader.portfolio}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="text-blue-600 underline hover:text-blue-800 transition-colors"
                          >
                            Portfolio
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="flex flex-col" style={{ gap: '0.5px' }}>
                      {actualSectionOrder.map((sectionKey) => {
                        if (!actualVisibleSections[sectionKey]) return null;

                        switch (sectionKey) {
                          case 'SUMMARY':
                            return localResume.professional_summary ? (
                              <section key="SUMMARY" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Professional Summary</h4>
                                </div>
                                <p className="text-[#1E2A3A]/90 leading-relaxed !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                  {limitSummarySentences(localResume.professional_summary, summaryLines)}
                                </p>
                              </section>
                            ) : null;

                          case 'EDUCATION':
                            return (localResume.education && localResume.education.length > 0) ? (
                              <section key="EDUCATION" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Education</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '0.5px' }}>
                                  {(localResume.education || []).map((edu, i) => {
                                    const parts = (edu || "").split('|');
                                    const mainInfo = (parts[0] || "").split('@');
                                    const degree = mainInfo[0]?.trim() || "Degree";
                                    const schoolAndLoc = mainInfo[1] || "";
                                    const schoolParts = schoolAndLoc.split(/\s*[-–—]\s*/);
                                    const school = schoolParts[0]?.trim() || "University";
                                    const loc = schoolParts[1]?.trim() || localHeader.location || "";
                                    const rawDateText = parts[1]?.trim() || "";
                                    const dateText = (rawDateText === "No specific dates provided" || !rawDateText.trim()) ? "" : rawDateText;
                                    const metadata = parts.slice(2).map(p => p.trim()).filter(Boolean).join(' | ');
                                    
                                    return (
                                      <div key={i} className="space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                        <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.body, fontFamily: 'inherit' }}>
                                          <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>{school}</span>
                                          {dateText && (
                                            <span className="flex-shrink-0 text-right ml-4 text-[11px] !font-inherit" style={{ fontFamily: 'inherit' }}>{dateText}</span>
                                          )}
                                        </div>
                                        <div className="flex justify-between items-start italic !font-inherit" style={{ fontSize: `calc(${fontSizes.body} - 1px)`, fontFamily: 'inherit' }}>
                                          <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>{degree} {metadata && `| ${metadata}`}</span>
                                          <span className="flex-shrink-0 text-right ml-4 text-[11px] not-italic !font-inherit" style={{ fontFamily: 'inherit' }}>{loc}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'EXPERIENCE':
                            return (localResume.experience && localResume.experience.length > 0) ? (
                              <section key="EXPERIENCE" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Experience</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '1px' }}>
                                  {(localResume.experience || []).map((exp, expIdx) => {
                                    const parts = (exp.heading || "").split('@');
                                    const role = parts[0]?.trim() || "Role";
                                    
                                    // Split organization and mode/location by space-dash-space to preserve hyphens like "On-site"
                                    const orgParts = parts[1] ? parts[1].split(/\s+[-–—]\s+/) : [];
                                    const org = orgParts[0]?.trim() || "Organization";
                                    const rawLocOrMode = orgParts[1]?.trim() || "";
                                    
                                    let location = "";
                                    if (rawLocOrMode.toLowerCase().includes("remote")) {
                                      location = "Remote";
                                    } else {
                                      const match = rawLocOrMode.match(/\(([^)]+)\)/);
                                      if (match && match[1]) {
                                        location = match[1].trim();
                                      } else if (rawLocOrMode.toLowerCase().includes("on-site") || rawLocOrMode.toLowerCase().includes("on site")) {
                                        location = localHeader.location || "On-site";
                                      } else {
                                        location = rawLocOrMode || localHeader.location || "";
                                      }
                                    }
                                    
                                    const rawDate = exp.content || "";
                                    const dateText = (rawDate === "No specific dates provided" || !rawDate.trim()) ? "" : rawDate;
                                    
                                    return (
                                      <div key={expIdx} className="space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                        <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit' }}>
                                          <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>{role}</span>
                                          {dateText && (
                                            <span className="flex-shrink-0 text-right ml-4 text-[11px] !font-inherit" style={{ fontFamily: 'inherit' }}>{dateText}</span>
                                          )}
                                        </div>
                                        <div className="flex justify-between items-start italic text-[#1E2A3A]/80 !font-inherit" style={{ fontSize: `calc(${fontSizes.body} - 1px)`, fontFamily: 'inherit' }}>
                                          <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>{org}</span>
                                          <span className="flex-shrink-0 text-right ml-4 text-[11px] not-italic !font-inherit" style={{ fontFamily: 'inherit' }}>{location}</span>
                                        </div>
                                        <ul className="list-disc ml-5 space-y-0.5 pt-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                          {limitBullets(exp.bullets || [], experienceBullets).map((bullet, bullIdx) => (
                                            <li key={bullIdx} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                              {(bullet || "").replace(/^[•\s*-]+/, '').trim()}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'PRODUCTS':
                            return (localResume.products && localResume.products.length > 0) ? (
                              <section key="PRODUCTS" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Products & Ventures</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '1px' }}>
                                  {localResume.products?.map((prod, prodIdx) => {
                                    return (
                                      <div key={prodIdx} className="space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                        <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit' }}>
                                          {renderSubHeaderWithLinks(prod.heading || "", prod.content || "", fontSizes)}
                                        </div>
                                        <ul className="list-disc ml-5 space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                          {limitBullets(prod.bullets || [], productLines).map((bullet, bullIdx) => (
                                            <li key={bullIdx} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                              {(bullet || "").replace(/^[•\s*-]+/, '').trim()}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'PROJECTS':
                            return (localResume.projects && localResume.projects.length > 0) ? (
                              <section key="PROJECTS" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Projects</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '1px' }}>
                                  {localResume.projects?.map((proj, projIdx) => {
                                    return (
                                      <div key={projIdx} className="space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                        <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit' }}>
                                          {renderSubHeaderWithLinks(proj.heading || "", proj.content || "", fontSizes)}
                                        </div>
                                        <ul className="list-disc ml-5 space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                          {limitBullets(proj.bullets || [], projectLines).map((bullet, bullIdx) => (
                                            <li key={bullIdx} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                              {(bullet || "").replace(/^[•\s*-]+/, '').trim()}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'LEADERSHIP':
                            return (localResume.leadership && localResume.leadership.length > 0) ? (
                              <section key="LEADERSHIP" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Leadership</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '1px' }}>
                                  {localResume.leadership?.map((lead, idx) => {
                                    const rawDate = lead.content || "";
                                    const dateText = (rawDate === "No specific dates provided" || !rawDate.trim()) ? "" : rawDate;
                                    return (
                                      <div key={idx} className="space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                        <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit' }}>
                                          <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>{lead.heading || "Role"}</span>
                                          {dateText && (
                                            <span className="flex-shrink-0 text-right ml-4 text-[11px] font-normal !font-inherit" style={{ fontFamily: 'inherit' }}>{dateText}</span>
                                          )}
                                        </div>
                                        <ul className="list-disc ml-5 space-y-0.5 !font-inherit" style={{ fontFamily: 'inherit', margin: 0, padding: 0 }}>
                                          {(lead.bullets || []).map((bullet, bullIdx) => (
                                            <li key={bullIdx} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                              {(bullet || "").replace(/^[•\s*-]+/, '').trim()}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'SKILLS':
                            return (localResume.skills_section && localResume.skills_section.length > 0) ? (
                              <section key="SKILLS" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Skills</h4>
                                </div>
                                <div className="flex flex-col !font-inherit" style={{ fontFamily: 'inherit', gap: '0.5px' }}>
                                  {(localResume.skills_section || []).map((skillLine, i) => {
                                    const [category, skills] = (skillLine || "").split(':');
                                    return (
                                      <p key={i} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-left" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'left', margin: 0, padding: 0 }}>
                                        <span className="font-bold !font-inherit" style={{ fontFamily: 'inherit' }}>{(category || "").trim()}:</span> {(skills || "").trim()}
                                      </p>
                                    );
                                  })}
                                </div>
                              </section>
                            ) : null;

                          case 'CERTIFICATIONS':
                            return (localResume.certifications && localResume.certifications.length > 0) ? (
                              <section key="CERTIFICATIONS" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest !font-inherit" style={{ fontSize: `${headlineFontSize}px`, fontFamily: 'inherit' }}>Certifications</h4>
                                </div>
                                <div className="flex flex-col !font-inherit" style={{ fontFamily: 'inherit', gap: '0.5px' }}>
                                  {localResume.certifications?.map((cert, i) => (
                                    <p key={i} className="text-[#1E2A3A]/90 leading-tight !font-inherit text-justify" style={{ fontSize: fontSizes.body, fontFamily: 'inherit', textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                      • {cert}
                                    </p>
                                  ))}
                                </div>
                              </section>
                            ) : null;

                          case 'AWARDS':
                            return (localResume.awards && localResume.awards.length > 0) ? (
                              <section key="AWARDS" className="space-y-1">
                                <div className="flex items-center gap-3 text-[#1E2A3A] border-b border-[#1E2A3A] pb-0.5">
                                  <h4 className="font-bold uppercase tracking-widest" style={{ fontSize: fontSizes.header }}>Awards</h4>
                                </div>
                                <div className="flex flex-col" style={{ gap: '0.5px' }}>
                                  {localResume.awards?.map((award, i) => (
                                    <p key={i} className="text-[#1E2A3A]/90 leading-tight text-justify" style={{ fontSize: fontSizes.body, textAlign: 'justify', textAlignLast: 'left', margin: 0, padding: 0 }}>
                                      • {award}
                                    </p>
                                  ))}
                                </div>
                              </section>
                            ) : null;

                          default:
                            return null;
                        }
                      })}
                    </div>
                  </div>

                  {/* Dynamic Page Breaks */}
                  {pageCount > 1 && Array.from({ length: pageCount - 1 }).map((_, i) => (
                    <div key={i} className="absolute left-0 right-0 h-px border-t border-dashed border-[#1E2A3A]/10 flex items-center justify-center pointer-events-none animate-pulse" style={{ top: `${(i + 1) * 297}mm` }}>
                      <span className="bg-white px-4 text-[8px] font-black uppercase tracking-widest text-red-500/80">Crossed Page {i + 1} — Continued On Next Page</span>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="cl-view"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-auto w-full"
          >
            {/* ── LEFT PANEL: COVER LETTER EDITOR ── */}
            <div className="lg:col-span-4 xl:col-span-4 2xl:col-span-4 space-y-6 h-auto">
              <CollapsibleSection 
                title="Letter Info" 
                icon={Mail} 
                isOpen={openSection === "cl-info"} 
                onToggle={() => setOpenSection(openSection === "cl-info" ? null : "cl-info")}
              >
                <p className="text-xs text-[#1E2A3A]/60 leading-relaxed font-medium pb-3">
                  This cover letter is synthesized using your <strong>Tailored Resume Blueprint</strong> and the target <strong>Job Description</strong> to ensure 100% thematic consistency.
                </p>
                {!coverLetter && (
                  <button 
                    onClick={onGenerateCL}
                    disabled={isGeneratingCL}
                    className="w-full py-4 rounded-2xl bg-[#1E2A3A] text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all"
                  >
                    Generate Now
                  </button>
                )}
              </CollapsibleSection>

              {/* ── Cover Letter Edit Fields ── */}
              {coverLetter && (
                <>
                  <CollapsibleSection 
                    title="Date & Recipient" 
                    icon={Calendar} 
                    isOpen={openSection === "cl-recipient"} 
                    onToggle={() => setOpenSection(openSection === "cl-recipient" ? null : "cl-recipient")}
                  >
                    <div className="space-y-3 pt-2">
                      {/* Date */}
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Date</span>
                        <input
                          value={clDate}
                          onChange={(e) => setClDate(e.target.value)}
                          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                          placeholder="May 21, 2026"
                        />
                      </div>

                      {/* Recipient Name */}
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Recipient Name</span>
                        <input
                          value={clRecipientName}
                          onChange={(e) => setClRecipientName(e.target.value)}
                          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                          placeholder="e.g. John Smith / Hiring Manager"
                        />
                      </div>

                      {/* Recipient Title */}
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Recipient Title</span>
                        <input
                          value={clRecipientTitle}
                          onChange={(e) => setClRecipientTitle(e.target.value)}
                          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                          placeholder="e.g. Engineering Manager"
                        />
                      </div>

                      {/* Company & Address */}
                      <div className="grid grid-cols-1 gap-2">
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Company</span>
                          <input
                            value={clRecipientCompany}
                            onChange={(e) => setClRecipientCompany(e.target.value)}
                            className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                            placeholder="e.g. Google"
                          />
                        </div>
                        <div className="space-y-1">
                          <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Company Address</span>
                          <input
                            value={clRecipientAddress}
                            onChange={(e) => setClRecipientAddress(e.target.value)}
                            className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                            placeholder="e.g. 1600 Amphitheatre Pkwy, Mountain View, CA"
                          />
                        </div>
                      </div>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection 
                    title="Signature" 
                    icon={PenTool} 
                    isOpen={openSection === "cl-signature"} 
                    onToggle={() => setOpenSection(openSection === "cl-signature" ? null : "cl-signature")}
                  >
                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <span className="text-[8px] uppercase tracking-wider text-slate-400 font-bold">Signature Name</span>
                        <input
                          value={clSignatureName}
                          onChange={(e) => setClSignatureName(e.target.value)}
                          className="w-full bg-slate-50 rounded-xl px-4 py-2.5 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20"
                          placeholder="Your Full Name"
                        />
                      </div>
                    </div>
                  </CollapsibleSection>

                  <CollapsibleSection 
                    title="Letter Body" 
                    icon={Edit3} 
                    isOpen={openSection === "cl-body"} 
                    onToggle={() => setOpenSection(openSection === "cl-body" ? null : "cl-body")}
                  >
                    <div className="space-y-3 pt-2">
                      <textarea
                        value={clEditableBody}
                        onChange={(e) => setClEditableBody(e.target.value)}
                        className="w-full bg-slate-50 rounded-xl px-4 py-3 text-[11px] font-medium outline-none border border-transparent focus:border-lumina-teal/20 min-h-[300px] resize-y leading-relaxed"
                        placeholder="Edit your cover letter body here..."
                      />
                      <button
                        onClick={() => {
                          onUpdateCoverLetter?.(clEditableBody);
                          toast.success('Cover letter body saved!');
                        }}
                        className="w-full py-3 rounded-2xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 hover:bg-emerald-600 hover:scale-[1.02]"
                      >
                        <Save size={12} /> Save Changes
                      </button>
                    </div>
                  </CollapsibleSection>
                </>
              )}
            </div>

            {/* ── RIGHT PANEL: COVER LETTER PREVIEW ── */}
            <div className="lg:col-span-8 xl:col-span-8 2xl:col-span-8 flex justify-center w-full">
              <div className="w-full flex-1 perspective-2000 rounded-[2.5rem] shadow-inner bg-slate-100/50 p-4 sm:p-6 md:p-8 border border-white/40">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="relative bg-white border border-[#1E2A3A]/5 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.12)] mx-auto"
                  style={{ 
                    width: '100%', 
                    maxWidth: '850px',
                    minHeight: '297mm',
                    height: 'auto',
                    padding: '1in',
                    fontFamily: getHtmlFont(fontFamily)
                  }}
                >
                  {isGeneratingCL ? (
                    <div className="flex flex-col items-center justify-center space-y-6" style={{ minHeight: '600px' }}>
                      <RotateCcw size={48} className="animate-spin text-lumina-teal" />
                      <p className="text-xs font-black uppercase tracking-[0.3em] text-[#1E2A3A]/40">Synthesizing Narrative...</p>
                    </div>
                  ) : coverLetter ? (
                    <div className="space-y-0 relative z-10 flex flex-col" style={{ fontFamily: getHtmlFont(fontFamily) }}>
                      {/* ── Sender Info Block ── */}
                      <div style={{ marginBottom: '20px' }}>
                        <p style={{ fontSize: fontSizes.body, fontWeight: 'bold', color: '#1E2A3A', margin: '0 0 2px 0', lineHeight: 1.4 }}>{localHeader.fullName}</p>
                        {localHeader.location && <p style={{ fontSize: `calc(${fontSizes.body} - 1px)`, color: 'rgba(30,42,58,0.7)', margin: '0 0 1px 0', lineHeight: 1.4 }}>{localHeader.location}</p>}
                        {localHeader.phone && <p style={{ fontSize: `calc(${fontSizes.body} - 1px)`, color: 'rgba(30,42,58,0.7)', margin: '0 0 1px 0', lineHeight: 1.4 }}>{localHeader.phone}</p>}
                        {localHeader.email && <p style={{ fontSize: `calc(${fontSizes.body} - 1px)`, color: 'rgba(30,42,58,0.7)', margin: '0 0 1px 0', lineHeight: 1.4 }}>{localHeader.email}</p>}
                        {localHeader.linkedin && <p style={{ fontSize: `calc(${fontSizes.body} - 1px)`, color: '#2563eb', margin: '0', lineHeight: 1.4 }}>{localHeader.linkedin}</p>}
                      </div>

                      {/* ── Date ── */}
                      <p style={{ fontSize: fontSizes.body, color: '#1E2A3A', margin: '0 0 20px 0', lineHeight: 1.4 }}>{clDate}</p>

                      {/* ── Recipient Block ── */}
                      <div style={{ marginBottom: '20px' }}>
                        {clRecipientName && <p style={{ fontSize: fontSizes.body, color: '#1E2A3A', margin: '0 0 1px 0', lineHeight: 1.4 }}>{clRecipientName}</p>}
                        {clRecipientTitle && <p style={{ fontSize: fontSizes.body, color: 'rgba(30,42,58,0.7)', fontStyle: 'italic', margin: '0 0 1px 0', lineHeight: 1.4 }}>{clRecipientTitle}</p>}
                        {clRecipientCompany && <p style={{ fontSize: fontSizes.body, color: '#1E2A3A', margin: '0 0 1px 0', lineHeight: 1.4 }}>{clRecipientCompany}</p>}
                        {clRecipientAddress && <p style={{ fontSize: fontSizes.body, color: 'rgba(30,42,58,0.7)', margin: '0', lineHeight: 1.4 }}>{clRecipientAddress}</p>}
                      </div>

                      {/* ── Salutation ── */}
                      <p style={{ fontSize: fontSizes.body, color: '#1E2A3A', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                        Dear {clRecipientName || 'Hiring Manager'},
                      </p>

                      {/* ── Letter Body (Justified) ── */}
                      <div 
                        className="whitespace-pre-wrap flex-1"
                        style={{ 
                          fontSize: fontSizes.body, 
                          color: 'rgba(30,42,58,0.85)', 
                          lineHeight: lineSpacing + 0.45,
                          textAlign: 'justify',
                          textAlignLast: 'left',
                          margin: '0 0 24px 0',
                          fontFamily: getHtmlFont(fontFamily)
                        }}
                      >
                        {clEditableBody || coverLetter}
                      </div>

                      {/* ── Closing & Signature ── */}
                      <div style={{ marginTop: '8px' }}>
                        <p style={{ fontSize: fontSizes.body, color: '#1E2A3A', margin: '0 0 24px 0', lineHeight: 1.4 }}>Sincerely,</p>
                        <p style={{ fontSize: '16px', fontWeight: 600, color: '#1E2A3A', fontStyle: 'italic', fontFamily: '"Brush Script MT", "Segoe Script", cursive', margin: '0 0 4px 0' }}>
                          {clSignatureName || localHeader.fullName}
                        </p>
                        <p style={{ fontSize: fontSizes.body, fontWeight: 500, color: '#1E2A3A', margin: 0 }}>{clSignatureName || localHeader.fullName}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-8 text-center px-12" style={{ minHeight: '600px' }}>
                      <div className="w-24 h-24 rounded-full bg-slate-50 flex items-center justify-center text-slate-200">
                        <Mail size={40} />
                      </div>
                      <div className="space-y-3">
                        <h5 className="text-lg font-serif font-bold text-[#1E2A3A]">Letter Vault Empty</h5>
                        <p className="text-sm text-[#1E2A3A]/40 max-w-sm leading-relaxed">
                          Your resume is ready! Now, let&apos;s craft the perfect narrative to open the door.
                        </p>
                      </div>
                      <button 
                        onClick={onGenerateCL}
                        className="px-10 py-4 rounded-2xl bg-lumina-teal text-white text-[10px] font-black uppercase tracking-[0.3em] shadow-xl shadow-lumina-teal/20 hover:scale-105 transition-all"
                      >
                        Synthesize Narrative
                      </button>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVaultPicker && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#1E2A3A]/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-8 border-b border-[#1E2A3A]/5 flex items-center justify-between">
                <h4 className="text-xl font-serif font-bold text-[#1E2A3A]">Tactical Vault</h4>
                <button onClick={() => setShowVaultPicker(null)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {vaultItems.filter(item => {
                    if (showVaultPicker.section === 'experience') return item.type === 'professional';
                    if (showVaultPicker.section === 'projects') return item.type === 'project';
                    if (showVaultPicker.section === 'education') return item.type === 'education';
                    if (showVaultPicker.section === 'certifications') return item.type === 'certification';
                    return true;
                  }).map((item) => (
                    <div key={item.id} onClick={() => addFromVault(item)} className="p-6 rounded-2xl border border-[#1E2A3A]/5 hover:border-lumina-teal hover:bg-lumina-teal/5 transition-all cursor-pointer">
                      <h5 className="text-lg font-serif font-bold text-[#1E2A3A]">{item.title}</h5>
                      <p className="text-xs text-[#1E2A3A]/40 italic">{item.period}</p>
                    </div>
                  ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
