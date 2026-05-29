import { useState, useEffect, useRef } from "react";
// Important: Use static import with ?url so Vite bundler properly packages the worker file for Vercel
import pdfWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.mjs?url";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Briefcase, Code, GraduationCap, Award, Trash2, Edit3, Save, X, Loader2, Sparkles, User, Globe, Linkedin, Mail, Phone, MapPin, Github, Import, Zap, Clock, RefreshCw, AlertCircle, Rocket, Shield, BrainCircuit, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { UsageMeter } from "./ui/UsageMeter";
import { useUsage } from "@/hooks/useUsage";
import type { VaultItem, VaultItemType, UserProfileWithVault } from "@/types/jd";
import { VaultSkeleton } from "./dashboard/VaultSkeleton";
import { generateAndStoreEmbedding, batchGenerateEmbeddings } from "@/lib/embeddingClient";

const getFieldLabels = (type?: VaultItemType) => {
  switch (type) {
    case 'education': return {
      titleStr: "Degree / Major", titleEx: "e.g. Master of Computer Science",
      orgStr: "University / College", orgEx: "e.g. Stanford University",
      periodStr: "Graduation Timeline", periodEx: "e.g. Aug 2020 - May 2024",
      descStr: "Coursework & Academic Highlights", descEx: "List key coursework, thesis details, and academic achievements..."
    };
    case 'project': return {
      titleStr: "Project Name", titleEx: "e.g. Decentralized File System",
      orgStr: "Tech Stack / Context", orgEx: "e.g. React, Node.js, Web3",
      periodStr: "Development Timeline", periodEx: "e.g. Jan 2023 - Mar 2023",
      descStr: "Technical Details & Architecture", descEx: "Describe the systems built, technologies used, and functional impact..."
    };
    case 'product': return {
      titleStr: "Venture / Product Name", titleEx: "e.g. Lumina Resume Engine",
      orgStr: "Product Role / Ownership", orgEx: "e.g. Founder & CTO",
      periodStr: "Operational Lifecycle", periodEx: "e.g. Feb 2023 - Present",
      descStr: "Technical Moat & Market Impact", descEx: "Detail the problem solved, user metrics (DAU/MAU), tech stack used, and market differentiation..."
    };
    case 'certification': return {
      titleStr: "Certificate Name", titleEx: "e.g. AWS Solutions Architect Professional",
      orgStr: "Issuing Entity", orgEx: "e.g. Amazon Web Services",
      periodStr: "Date Issued / Expiration", periodEx: "e.g. Issued Oct 2023 - Valid till 2026",
      descStr: "Credential Details & Skills", descEx: "Enter Credential ID, skills validated, or link..."
    };
    case 'leadership': return {
      titleStr: "Role / Impact", titleEx: "e.g. Lead Volunteer",
      orgStr: "Organization / Community", orgEx: "e.g. Tech For Good",
      periodStr: "Service Timeline", periodEx: "e.g. Jun 2022 - Present",
      descStr: "Leadership Contribution", descEx: "Detail your impact, team size, and specific initiatives led..."
    };
    case 'award': return {
      titleStr: "Award / Honor Name", titleEx: "e.g. Hackathon Winner",
      orgStr: "Awarding Body", orgEx: "e.g. Google Cloud",
      periodStr: "Recognition Date", periodEx: "e.g. Mar 2024",
      descStr: "Achievement Context", descEx: "Describe the selection criteria, competitive landscape, and why you won..."
    };
    case 'professional': default: return {
      titleStr: "Title / Designation", titleEx: "e.g. Lead Product Designer",
      orgStr: "Organization / Brand", orgEx: "e.g. OpenAI",
      periodStr: "Time Horizon", periodEx: "e.g. Oct 2022 - Current",
      descStr: "Raw Achievement Data (Full Context)", descEx: "Input all raw achievements here. Include internal project names, budgets, and team sizes. The AI will curate this into polished bullets later."
    };
  }
};

interface ParsedExperience { job_role: string; company_name: string; duration?: string; mode?: string; location?: string; description?: string; bullets?: string[]; }
interface ParsedEducation { college_name: string; course: string; specialization: string; gpa?: string; start_date?: string; end_date?: string; location?: string; details?: string[]; }
interface ParsedProject { title: string; tech_stack: string; year?: string; live_link?: string; github_link?: string; description?: string; }
interface ParsedCert { certificate_name: string; company_name: string; year?: string; }
interface ParsedAward { name: string; organization: string; date?: string; details?: string[]; }
interface ParsedProduct { name: string; status: string; live_link?: string; description?: string; }

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const YEARS = Array.from({ length: 21 }, (_, i) => String(2015 + i));

const parseMonthYear = (dateStr: string): { month: string | null; year: string | null } => {
  dateStr = dateStr.trim();
  if (!dateStr) return { month: null, year: null };

  const yearMatch = dateStr.match(/\b\d{4}\b/);
  const year = yearMatch ? yearMatch[0] : null;

  let rest = dateStr;
  if (year) {
    rest = dateStr.replace(year, "").replace(/[\s,./\-_]+/g, "").trim();
  }

  let month: string | null = null;
  if (rest) {
    if (/^\d{1,2}$/.test(rest)) {
      const monthIdx = parseInt(rest, 10) - 1;
      if (monthIdx >= 0 && monthIdx < 12) {
        month = MONTHS[monthIdx];
      }
    } else {
      const foundMonth = MONTHS.find(m => 
        m.toLowerCase().startsWith(rest.toLowerCase()) || 
        rest.toLowerCase().startsWith(m.toLowerCase().substring(0, 3))
      );
      if (foundMonth) {
        month = foundMonth;
      }
    }
  }

  return { month, year };
};

const calculateCompletion = (profile: UserProfileWithVault | null, items: VaultItem[]) => {
  if (!profile) return 0;
  
  let score = 0;
  // Basic Info (30%)
  if (profile.full_name?.trim()) score += 5;
  if (profile.email?.trim()) score += 5;
  if (profile.phone?.trim()) score += 5;
  if (profile.location?.trim()) score += 5;
  if (profile.linkedin_url?.trim()) score += 5;
  if (profile.website_url?.trim()) score += 5;

  // Master Summary (10%)
  if (profile.summary_master && profile.summary_master.length > 50) score += 10;

  // Experience (30%)
  const safeItems = Array.isArray(items) ? items : [];
  const expCount = safeItems.filter(i => i && i.type === 'professional').length;
  score += Math.min(expCount * 15, 30);

  // Education & Others (30%)
  const eduCount = safeItems.filter(i => i && i.type === 'education').length;
  const certCount = safeItems.filter(i => i && i.type === 'certification').length;
  const projCount = safeItems.filter(i => i && i.type === 'project').length;
  
  score += Math.min(eduCount * 10 + certCount * 10 + projCount * 10, 30);

  return Math.min(score, 100);
};

export const MasterVault = () => {
  // Version: 1.0.1 - Force build to resolve production ReferenceError
  const { user, loading: authLoading } = useAuth();
  const { scansUsed, scansTotal, tailorsUsed, tailorsTotal, refreshUsage } = useUsage();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<VaultItemType | 'profile'>('profile');
  const [items, setItems] = useState<VaultItem[]>([]);
  const [profile, setProfile] = useState<UserProfileWithVault | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<VaultItem> | null>(null);
  const [expMode, setExpMode] = useState<string>("On-site");
  const [expLocation, setExpLocation] = useState<string>("");
  const [productStatus, setProductStatus] = useState<string>("Ongoing");
  const [eduCgpa, setEduCgpa] = useState<string>("");
  const [eduLocation, setEduLocation] = useState<string>("");
  
  // Duration selectors
  const [startMonth, setStartMonth] = useState<string>("January");
  const [startYear, setStartYear] = useState<string>("2023");
  const [endMonth, setEndMonth] = useState<string>("June");
  const [endYear, setEndYear] = useState<string>("2026");
  const [isCurrent, setIsCurrent] = useState<boolean>(false);

  const userId = user?.id;

  // ── Engine Configuration States ──
  const [testingDiagnostics, setTestingDiagnostics] = useState(false);
  const [diagnosticStatus, setDiagnosticStatus] = useState({
    supabase: "idle",
    vercel: "idle",
    groq: "idle"
  });

  const runDiagnosticsTest = async () => {
    setTestingDiagnostics(true);
    
    // 1. Supabase Check
    let sbStatus = "ERROR";
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      sbStatus = error ? "OFFLINE" : "OK";
    } catch (e) {
      sbStatus = "CRASHED";
    }

    // 2. Vercel & Groq via api/diagnose check
    let vercelStatus = "OFFLINE";
    let groqStatus = "MISSING_KEY";
    try {
      const res = await fetch("/api/diagnose");
      if (res.ok) {
        const dData = await res.json();
        vercelStatus = "OK";
        if (dData?.groq_test) {
          groqStatus = dData.groq_test.includes("OK") ? "OK" : dData.groq_test;
        } else if (dData?.diagnostics?.groq_key_set) {
          groqStatus = "KEY_SET";
        }
      } else {
        vercelStatus = `HTTP ${res.status}`;
      }
    } catch (e) {
      vercelStatus = "UNREACHABLE";
    }

    setDiagnosticStatus({
      supabase: sbStatus,
      vercel: vercelStatus,
      groq: groqStatus
    });
    setTestingDiagnostics(false);
  };

  // Run diagnostics once on mount when profile is loaded
  useEffect(() => {
    if (userId) {
      runDiagnosticsTest();
    }
  }, [userId]);

  useEffect(() => {
    if (!authLoading && userId) {
      // Initial bootstrap: Try to get draft first for instant UI responsiveness
      const draftedProfileStr = localStorage.getItem(`draft_profile_${userId}`);
      if (draftedProfileStr) {
        try {
          const draftedProfile = JSON.parse(draftedProfileStr);
          setProfile(draftedProfile);
          // If we have a draft, we can set loading to false early to show the UI
          setIsLoading(false);
        } catch (e) {
          console.error("Draft recovery failed", e);
        }
      }

      // Sync with DB in background
      fetchData();

      // Restore drafted summary on load
      const draftedSummary = localStorage.getItem(`draft_summary_${userId}`);
      if (draftedSummary && !profile?.summary_master && !draftedProfileStr) {
        setProfile(prev => prev ? { ...prev, summary_master: draftedSummary } : null);
      }

      // Nudge logic...
      const hasNudged = sessionStorage.getItem(`nudge_${userId}`);
      if (!hasNudged) {
        setTimeout(() => {
          toast("Intelligence Nudge: Complete your profile to 100% for elite AI tailoring.", {
            description: "High-density profiles land 10x more clinical interviews.",
            icon: <Sparkles className="text-primary w-4 h-4" />,
          });
          sessionStorage.setItem(`nudge_${userId}`, "true");
        }, 2000);
      }
    } else if (!authLoading && !userId) {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, authLoading]);

  // Persistence for Profile Draft
  useEffect(() => {
    if (user && profile) {
      localStorage.setItem(`draft_profile_${user.id}`, JSON.stringify(profile));
    }
  }, [profile, user]);

  // Persistence for Profile Summary
  useEffect(() => {
    if (user && profile?.summary_master) {
      localStorage.setItem(`draft_summary_${user.id}`, profile.summary_master);
    }
  }, [profile?.summary_master, user]);

  // Persistence for Editing Item Draft
  useEffect(() => {
    if (user && editingItem) {
      localStorage.setItem(`draft_vault_item_${user.id}`, JSON.stringify(editingItem));
    }
  }, [editingItem, user]);

  // Persistence for Mode & Location Drafts
  useEffect(() => {
    if (user && editingItem?.type === 'professional') {
      localStorage.setItem(`draft_exp_mode_${user.id}`, expMode);
      localStorage.setItem(`draft_exp_location_${user.id}`, expLocation);
    }
  }, [expMode, expLocation, user, editingItem]);

  // Persistence for Product Status Draft
  useEffect(() => {
    if (user && editingItem?.type === 'product') {
      localStorage.setItem(`draft_product_status_${user.id}`, productStatus);
    }
  }, [productStatus, user, editingItem]);

  // Persistence for Duration selectors
  useEffect(() => {
    if (user && (editingItem?.type === 'professional' || editingItem?.type === 'education')) {
      localStorage.setItem(`draft_start_month_${user.id}`, startMonth);
      localStorage.setItem(`draft_start_year_${user.id}`, startYear);
      localStorage.setItem(`draft_end_month_${user.id}`, endMonth);
      localStorage.setItem(`draft_end_year_${user.id}`, endYear);
      localStorage.setItem(`draft_is_current_${user.id}`, String(isCurrent));
    }
  }, [startMonth, startYear, endMonth, endYear, isCurrent, user, editingItem]);

  const updateDurationPeriod = (sm: string, sy: string, em: string, ey: string, curr: boolean) => {
    const endPart = curr ? "Present" : `${em} ${ey}`;
    const periodStr = `${sm} ${sy} – ${endPart}`;
    setEditingItem(prev => {
      if (!prev) return null;
      return { ...prev, period: periodStr };
    });
  };

  const handleStartEdit = (item: Partial<VaultItem>) => {
    if (item.type === 'professional' || item.type === 'education') {
      let cleanDesc = item.description || "";
      let parsedMode = "On-site";
      let parsedLoc = "";
      
      if (item.type === 'professional') {
        const desc = item.description || "";
        const lines = desc.split("\n");
        
        const modeLineIdx = lines.findIndex(l => l.trim().toLowerCase().startsWith("mode:"));
        if (modeLineIdx !== -1) {
          const line = lines[modeLineIdx].trim();
          const match = line.match(/mode:\s*([^\s(]+)(?:\s*\(([^)]+)\))?/i);
          if (match) {
            const m = match[1].toLowerCase();
            if (m === 'remote') parsedMode = 'Remote';
            else if (m === 'offline') parsedMode = 'Offline';
            else parsedMode = 'On-site';
            parsedLoc = match[2] || "";
          }
        }
        
        if (modeLineIdx !== -1) {
          lines.splice(modeLineIdx, 1);
          cleanDesc = lines.join("\n").trim();
          if (cleanDesc.toLowerCase().startsWith("description:")) {
            cleanDesc = cleanDesc.substring("description:".length).trim();
          }
        }
      }

      if (item.type === 'education') {
        // Extract GPA and Location from description into dedicated state fields
        const rawDesc = item.description || "";
        const gpaMatch = rawDesc.match(/GPA:\s*([^|\n]+)/i);
        const locMatch = rawDesc.match(/Location:\s*([^|\n]+)/i);
        setEduCgpa(gpaMatch ? gpaMatch[1].trim() : "");
        setEduLocation(locMatch ? locMatch[1].trim() : "");
        // Strip those metadata segments so they don't show in the Coursework textarea
        cleanDesc = cleanDesc
          .split('|')
          .map(s => s.trim())
          .filter(s => !/^(gpa:|location:)/i.test(s))
          .join(' | ')
          .trim();
      } else {
        setEduCgpa("");
        setEduLocation("");
      }

      setExpMode(parsedMode);
      setExpLocation(parsedLoc);

      // Reset duration builder assistant states to defaults first
      setStartMonth("January");
      setStartYear("2023");
      setEndMonth("June");
      setEndYear("2026");
      setIsCurrent(false);

      // Parse period into selectors
      const period = item.period || "";
      const parts = period.split(/\s*[-–—to]\s*/i).filter(Boolean);
      if (parts.length >= 2) {
        const start = parts[0].trim();
        const end = parts[1].trim();
        
        const startParsed = parseMonthYear(start);
        if (startParsed.month) setStartMonth(startParsed.month);
        if (startParsed.year && YEARS.includes(startParsed.year)) setStartYear(startParsed.year);
        
        if (/present|current|ongoing|now/i.test(end)) {
          setIsCurrent(true);
        } else {
          setIsCurrent(false);
          const endParsed = parseMonthYear(end);
          if (endParsed.month) setEndMonth(endParsed.month);
          if (endParsed.year && YEARS.includes(endParsed.year)) setEndYear(endParsed.year);
        }
      } else if (period.trim()) {
        if (/present|current|ongoing|now/i.test(period)) {
          setIsCurrent(true);
          const cleanPeriod = period.replace(/present|current|ongoing|now/i, "").trim();
          const startParsed = parseMonthYear(cleanPeriod);
          if (startParsed.month) setStartMonth(startParsed.month);
          if (startParsed.year && YEARS.includes(startParsed.year)) setStartYear(startParsed.year);
        } else {
          const parsed = parseMonthYear(period);
          if (parsed.month) setStartMonth(parsed.month);
          if (parsed.year && YEARS.includes(parsed.year)) setStartYear(parsed.year);
        }
      }

      setEditingItem({
        ...item,
        description: cleanDesc
      });
    } else if (item.type === 'product') {
      const desc = item.description || "";
      const lines = desc.split("\n");
      let parsedStatus = "Ongoing";
      
      const statusLineIdx = lines.findIndex(l => l.trim().toLowerCase().startsWith("status:"));
      if (statusLineIdx !== -1) {
        const line = lines[statusLineIdx].trim();
        const match = line.match(/status:\s*([^\s]+)/i);
        if (match) {
          const s = match[1].toLowerCase();
          if (s === 'shipped') parsedStatus = 'Shipped';
          else parsedStatus = 'Ongoing';
        }
      }
      
      let cleanDesc = desc;
      if (statusLineIdx !== -1) {
        lines.splice(statusLineIdx, 1);
        cleanDesc = lines.join("\n").trim();
        if (cleanDesc.toLowerCase().startsWith("description:")) {
          cleanDesc = cleanDesc.substring("description:".length).trim();
        }
      }
      
      setProductStatus(parsedStatus);
      setEditingItem({
        ...item,
        description: cleanDesc
      });
    } else {
      setEditingItem(item);
    }
  };

  // Restore drafting item on focus/mount
  useEffect(() => {
    if (user && !editingItem) {
      const saved = localStorage.getItem(`draft_vault_item_${user.id}`);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed === 'object' && parsed.type) { 
            const safeItem = {
              ...parsed,
              skills: Array.isArray(parsed.skills) ? parsed.skills : [],
              bullets: Array.isArray(parsed.bullets) ? parsed.bullets : []
            };
            handleStartEdit(safeItem);

            if (parsed.type === 'professional') {
              const savedMode = localStorage.getItem(`draft_exp_mode_${user.id}`);
              if (savedMode) setExpMode(savedMode);
              const savedLoc = localStorage.getItem(`draft_exp_location_${user.id}`);
              if (savedLoc) setExpLocation(savedLoc);
            }
            if (parsed.type === 'product') {
              const savedStatus = localStorage.getItem(`draft_product_status_${user.id}`);
              if (savedStatus) setProductStatus(savedStatus);
            }
            if (parsed.type === 'professional' || parsed.type === 'education') {
              const savedStartMonth = localStorage.getItem(`draft_start_month_${user.id}`);
              if (savedStartMonth) setStartMonth(savedStartMonth);
              const savedStartYear = localStorage.getItem(`draft_start_year_${user.id}`);
              if (savedStartYear) setStartYear(savedStartYear);
              const savedEndMonth = localStorage.getItem(`draft_end_month_${user.id}`);
              if (savedEndMonth) setEndMonth(savedEndMonth);
              const savedEndYear = localStorage.getItem(`draft_end_year_${user.id}`);
              if (savedEndYear) setEndYear(savedEndYear);
              const savedIsCurrent = localStorage.getItem(`draft_is_current_${user.id}`);
              if (savedIsCurrent) setIsCurrent(savedIsCurrent === "true");
            }
          }
        } catch (e) {
          console.error("Failed to parse drafted item", e);
          localStorage.removeItem(`draft_vault_item_${user.id}`);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchData = async () => {
    // Only show full-page loader if we don't have any data yet (fresh session)
    if (!profile && items.length === 0) {
      setIsLoading(true);
    }
    
    try {
      console.log("── VAULT DATA FETCH INITIATED ──");
      const { data: profileData, error: pError } = await supabase.from("profiles").select("*").eq("id", userId).single();
      const { data: vaultData, error: vError } = await supabase.from("master_vault").select("*").eq("user_id", userId).order('created_at', { ascending: false });

      if (pError && pError.code !== 'PGRST116') {
        console.error("Profile Fetch Error:", pError);
      }
      if (vError) {
        console.error("Vault Fetch Error:", vError);
      }

      // Check if we already have a draft in progress
      const draftedProfileStr = localStorage.getItem(`draft_profile_${user?.id}`);
      if (draftedProfileStr) {
        try {
          const draftedProfile = JSON.parse(draftedProfileStr);
          // Only merge if the draft is newer or we prefer the draft
          setProfile({ ...profileData, ...draftedProfile } as UserProfileWithVault);
        } catch (e) {
          setProfile(profileData as UserProfileWithVault);
        }
      } else {
        setProfile(profileData as UserProfileWithVault);
      }
      
      setItems(vaultData as VaultItem[] || []);
    } catch (err) {
      console.error("MasterVault Fetch Fatal Error:", err);
      toast.error("Initialization Failed", { description: "The tactical library could not be synchronized." });
    } finally {
      setIsLoading(false);
    }
  };

  const extractTextFromPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      
      // Extract visible text
      const content = await page.getTextContent();
      /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
      const pageText = (content.items as any[]).map((item: any) => item.str || "").join(" ");
      fullText += pageText + "\n";

      // Extract hidden URLs from hyperlinks (Annotations)
      try {
        const annotations = await page.getAnnotations();
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const urls = annotations.filter((a: any) => a.subtype === 'Link' && a.url).map((a: any) => a.url);
        if (urls.length > 0) {
          fullText += "\n[Extracted URLs from document links]:\n" + urls.join("\n") + "\n";
        }
      } catch (e) {
        console.warn("Could not extract annotations", e);
      }
    }
    return fullText.trim();
  };

  const handleImportResume = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsSyncing(true);
    const toastId = toast.loading("Smart Sync: Parsing your resume locally...");
    let resultText = "";

    try {
      let rawText = "";
      if (file.type === "application/pdf") {
        rawText = await extractTextFromPDF(file);
      } else {
        rawText = await file.text();
      }

      if (!rawText || rawText.trim().length < 50) {
        throw new Error("Could not extract sufficient text from this file.");
      }

      // v2.7 Resilience: Cap resume text to prevent TPM (Tokens Per Minute) spikes
      const cappedText = rawText.substring(0, 10000);

      toast.loading("[Lumina AI v2.7] Analysing & Structuring...", { id: toastId });

      const syncPrompt = `You are an expert resume parser. Extract ALL professional experience, education, startup products/ventures, projects, certifications, and high-impact achievements/awards from this resume text.
Also extract the candidate's personal details.

Resume Text:
${cappedText}

IMPORTANT - EXTRACTION SCHEMA MANDATES:
1. For EDUCATION:
   - "college_name": Full college or university name (e.g., REVA University).
   - "course": Degree level, e.g., "BTech", "MTech", "BSc", "MS".
   - "specialization": Course specialization details, e.g., "BTech in Artificial intelligence and data science" or "Computer Science".
   - "gpa": GPA score format, e.g., "7.5/10" or "8.2/10".
   - "start_date": Extraction start date, e.g., "July 2020" or "Jul 2020".
   - "end_date": Extraction end date, e.g., "June 2024" or "Jun 2024".
   - "location": College campus location, e.g., "Bengaluru, Karnataka" or "Bengaluru, India".
2. For EXPERIENCE:
   - "job_role": Job role or title, e.g., "Software Engineer Intern".
   - "company_name": Full company or employer name.
   - "duration": Complete duration timeline, e.g., "January 2023 to March 2025" or "July 2022 to Present".
   - "mode": Work model, strictly either "remote" or "on site".
   - "location": City and State/Country location, e.g., "Bengaluru, Karnataka" or "Bengaluru, India" if "on site". Leave blank if "remote".
   - "description": Summary overview of the duties and accomplishments.
   - "bullets": High-impact, metric-driven bullet points detailing key accomplishments.
3. For STARTUP PRODUCTS/VENTURES (if any exist, map to "products"):
   - "name": Name of the product or startup.
   - "status": Strictly either "live" or "ongoing".
   - "live_link": Live demo link/URL if status is "live".
   - "description": Full startup product/venture description and traction metrics.
4. For PROJECTS:
   - "title": Title of the technical project.
   - "tech_stack": Comma-separated tech stack used, e.g., "React, Node.js, Web3".
   - "year": Year of the project, e.g., "2024".
   - "live_link": Live link of the project if available.
   - "github_link": GitHub repository link if available.
   - "description": Key descriptions of the project.
5. For CERTIFICATIONS:
   - "certificate_name": Certificate or course name.
   - "company_name": Issuing company or academy where taken (e.g. AWS, Coursera, Udemy).
   - "year": Year certification was completed/issued.
6. For AWARDS:
   - "name": Award/honor name.
   - "organization": Awarding body or organization.
   - "date": Year or date received.
   - "details": Bulleted details of the award context.

RETURN JSON FORMAT ONLY:
{
  "personal_details": { "full_name": "", "email": "", "phone": "", "location": "", "linkedin": "", "github": "", "portfolio": "", "summary": "" },
  "experience": [{ "job_role": "", "company_name": "", "duration": "", "mode": "", "location": "", "description": "", "bullets": [] }],
  "education": [{ "college_name": "", "course": "", "specialization": "", "gpa": "", "start_date": "", "end_date": "", "location": "", "details": [] }],
  "products": [{ "name": "", "status": "", "live_link": "", "description": "" }],
  "projects": [{ "title": "", "tech_stack": "", "year": "", "live_link": "", "github_link": "", "description": "" }],
  "certifications": [{ "certificate_name": "", "company_name": "", "year": "" }],
  "awards": [{ "name": "", "organization": "", "date": "", "details": [] }]
}`;

      const techModels = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant"
      ];

      // Helper for exponential backoff
      const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

      let lastError = "";
      for (let i = 0; i < techModels.length; i++) {
        const model = techModels[i];
        try {
          if (i > 0) {
            toast.loading(`Resilience: Engine busy, waiting 2s for slot... (${model.split('-')[2] || 'Alt'})`, { id: toastId });
            await sleep(2000); // 2 second pause to let TPM reset
          }

          console.log(`Smart Sync v2.7: Requesting ${model}...`);
          let { data: rawData, error: invokeError } = await supabase.functions.invoke("analyze", {
            body: {
              model: model,
              messages: [{ role: "user", content: syncPrompt + "\n\nIMPORTANT: Return ONLY valid JSON." }],
              response_format: { type: "json_object" }
            },
          });

          // ── EMERGENCY FALLBACK: Try Local API Proxy if Edge Function Fails ──
          if (invokeError && (invokeError.message?.includes("Failed to send a request") || invokeError.status === 404)) {
            console.warn(`Smart Sync: Edge Function unreachable. Switching to Local API Proxy for ${model}...`);
            try {
              const apiResponse = await fetch("/api/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  model: model,
                  messages: [{ role: "user", content: syncPrompt + "\n\nIMPORTANT: Return ONLY valid JSON." }],
                  response_format: { type: "json_object" }
                })
              });
              if (apiResponse.ok) {
                rawData = await apiResponse.json();
                invokeError = null;
              }
            } catch (apiErr) {
              console.error("Local API Proxy also failed:", apiErr);
            }
          }

          if (invokeError) {
            // Resilience: Continue on Rate Limit (429) OR Discovery Error (400/404)
            console.warn(`Smart Sync: Model ${model} failed (${invokeError.message}).`);
            lastError = `Model ${model} failed (${invokeError.message})`;
            continue;
          }

          if (!rawData) {
            lastError = `Model ${model} returned null data`;
            continue;
          }

          if (rawData.error) {
            lastError = rawData.error;
            console.warn(`Smart Sync: Model ${model} reported error: ${rawData.error}`);
            continue;
          }

          resultText = rawData.choices?.[0]?.message?.content;
          if (resultText) {
            console.log(`Smart Sync: Success with ${model}`);
            break;
          }
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : String(err);
          if (lastError.includes("429") || lastError.includes("Rate Limit")) continue;
          throw err;
        }
      }

      if (!resultText) {
        throw new Error(`[SYNC_FAULT_v2.7] ${lastError || "All engines currently reaching capacity."}`);
      }


      const firstBrace = resultText.indexOf("{");
      const lastBrace = resultText.lastIndexOf("}");
      if (firstBrace === -1 || lastBrace === -1) throw new Error("AI returned no valid JSON.");

      const structData = JSON.parse(resultText.substring(firstBrace, lastBrace + 1));

      let incomingItems: Omit<VaultItem, 'id' | 'created_at'>[] = [];

      if (structData?.experience) {
        incomingItems = incomingItems.concat(structData.experience.map((exp: ParsedExperience) => {
          const modeStr = exp.mode === 'remote' ? 'Remote' : 'On-site';
          const locStr = exp.location ? ` (${exp.location})` : '';
          const fullDesc = `Mode: ${modeStr}${locStr}\n\nDescription: ${exp.description || ""}`.trim();
          return {
            user_id: user.id,
            type: 'professional',
            title: exp.job_role || "Imported Role",
            organization: exp.company_name || "Imported Org",
            period: exp.duration || "Not Specified",
            description: fullDesc,
            bullets: exp.bullets || [],
            skills: [],
            is_quantified: (exp.bullets || []).some((b: string) => /[\d%]/.test(b))
          };
        }));
      }

      if (structData?.education) {
        incomingItems = incomingItems.concat(structData.education.map((edu: ParsedEducation) => {
          const specStr = edu.specialization ? ` in ${edu.specialization}` : '';
          const fullTitle = `${edu.course || "Degree"}${specStr}`;
          const gpaStr = edu.gpa ? `GPA: ${edu.gpa}` : '';
          const locStr = edu.location ? `Location: ${edu.location}` : '';
          const fullDesc = [gpaStr, locStr].filter(Boolean).join(' | ');
          const startStr = edu.start_date || "";
          const endStr = edu.end_date || "";
          const fullPeriod = startStr && endStr ? `${startStr} – ${endStr}` : (startStr || endStr || "Not Specified");

          return {
            user_id: user.id,
            type: 'education',
            title: fullTitle,
            organization: edu.college_name || "Institution",
            period: fullPeriod,
            description: fullDesc,
            bullets: edu.details || [],
            skills: [],
            is_quantified: false
          };
        }));
      }

      if (structData?.products) {
        incomingItems = incomingItems.concat(structData.products.map((prod: ParsedProduct) => ({
          user_id: user.id,
          type: 'product',
          title: prod.name || "Startup Product/Venture",
          organization: prod.status === 'live' ? 'Live Product' : 'Ongoing Product',
          period: prod.status || "ongoing",
          live_link: prod.live_link || "",
          description: prod.description || "",
          bullets: [],
          skills: [],
          is_quantified: false
        })));
      }

      if (structData?.projects) {
        incomingItems = incomingItems.concat(structData.projects.map((proj: ParsedProject) => ({
          user_id: user.id,
          type: 'project',
          title: proj.title || "Project",
          organization: proj.tech_stack || "Tech Context",
          period: proj.year || "Not Specified",
          live_link: proj.live_link || "",
          github_link: proj.github_link || "",
          description: proj.description || "",
          bullets: [],
          skills: [],
          is_quantified: false
        })));
      }

      if (structData?.certifications) {
        incomingItems = incomingItems.concat(structData.certifications.map((cert: ParsedCert) => ({
          user_id: user.id,
          type: 'certification',
          title: cert.certificate_name || "Certificate",
          organization: cert.company_name || "Issuer",
          period: cert.year || "Not Specified",
          description: `Certificate issued by ${cert.company_name || "Issuer"} in ${cert.year || "Not Specified"}`,
          bullets: [],
          skills: [],
          is_quantified: false
        })));
      }

      if (structData?.awards) {
        incomingItems = incomingItems.concat(structData.awards.map((award: ParsedAward) => ({
          user_id: user.id,
          type: 'award',
          title: award.name || "Award",
          organization: award.organization || "Recognition",
          period: award.date || "Not Specified",
          description: (award.details || []).join("\n"),
          bullets: award.details || [],
          skills: [],
          is_quantified: false
        })));
      }

      // ── DUPLICATE DETECTION LOGIC ──
      const existingTitles = new Set(items.map(i => i.title.toLowerCase().trim()));
      const duplicates: Omit<VaultItem, 'id' | 'created_at'>[] = [];
      const uniques: Omit<VaultItem, 'id' | 'created_at'>[] = [];

      incomingItems.forEach(item => {
        if (existingTitles.has(item.title.toLowerCase().trim())) {
          duplicates.push(item);
        } else {
          uniques.push(item);
        }
      });

      if (uniques.length > 0) {
        const { data: insertedRows, error: insertError } = await supabase.from("master_vault").insert(uniques).select("id, title, organization, description, bullets, skills, type, period");
        if (insertError) throw insertError;

        // ── RAG: Batch-generate embeddings for all newly imported items (non-blocking) ──
        if (insertedRows && insertedRows.length > 0) {
          batchGenerateEmbeddings(insertedRows).catch(err =>
            console.warn("[RAG] Batch embedding generation failed (non-blocking):", err)
          );
        }
      }

      // Store duplicates in temporary session state to show them to user
      if (duplicates.length > 0) {
        const existingDups = JSON.parse(sessionStorage.getItem(`dupes_${user.id}`) || "[]");
        sessionStorage.setItem(`dupes_${user.id}`, JSON.stringify([...existingDups, ...duplicates]));
        toast.info(`${duplicates.length} potential duplicates identified and moved to review section.`);
      }

      if (structData?.personal_details) {
        const pd = structData.personal_details;
        const updateParams: { full_name?: string; email?: string; phone?: string; location?: string; linkedin_url?: string; github_url?: string; website_url?: string; summary_master?: string } = {};
        if (pd.full_name && pd.full_name !== "Full Name") updateParams.full_name = pd.full_name;
        if (pd.email && pd.email !== "Email") updateParams.email = pd.email;
        if (pd.phone && pd.phone !== "Phone Number") updateParams.phone = pd.phone;
        if (pd.location && pd.location !== "City, State") updateParams.location = pd.location;
        
        // Smart URL verification to avoid overwriting with just the word "LinkedIn"
        const isValidLink = (str: string) => str && str.trim().length > 3 && !['linkedin', 'github', 'portfolio', 'website'].includes(str.trim().toLowerCase());
        
        // Only overwrite existing links if they are empty
        const currentProfile = profile;
        if (pd.linkedin && isValidLink(pd.linkedin) && !currentProfile?.linkedin_url) updateParams.linkedin_url = pd.linkedin;
        if (pd.github && isValidLink(pd.github) && !currentProfile?.github_url) updateParams.github_url = pd.github;
        if (pd.portfolio && isValidLink(pd.portfolio) && !currentProfile?.website_url) updateParams.website_url = pd.portfolio;
        
        if (pd.summary && pd.summary !== "Create a strong executive summary matching their profile (max 3 sentences).") {
          updateParams.summary_master = pd.summary;
        }

        if (Object.keys(updateParams).length > 0) {
          const { error: profileError } = await supabase.from("profiles").update(updateParams).eq("id", user.id);
          if (profileError) console.error("Auto profile update failed:", profileError);
        }
      }

      toast.success("Smart Sync complete: Experience structured into vault!", { id: toastId });
      fetchData();
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : (typeof err === "object" ? JSON.stringify(err) : String(err));
      toast.error(`Smart Sync failed: ${msg}`, { id: toastId, duration: 8000 });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setIsSaving(true);
    try {
      // Field Sanitization: Only send fields that belong in the profiles table
      const { id, email, created_at, ...updateData } = profile;

      console.log("MasterVault: Updating profile with data:", updateData);

      const { error } = await supabase.from("profiles").update(updateData).eq("id", user?.id);
      if (error) {
        console.error("MasterVault Profile Update Error:", error);
        throw error;
      }

      localStorage.removeItem(`draft_profile_${user.id}`);
      localStorage.removeItem(`draft_summary_${user.id}`);
      toast.success("Profile updated in Master Vault.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuggestMetrics = () => {
    if (!editingItem?.description) return;
    toast.info("Quantifier Assistant: Look for areas where you improved efficiency, saved cost, or reduced time.");
    const suggested = editingItem.description + "\n\n[?] Tip: Add a metric here (e.g. 'Improved efficiency by 25%').";
    setEditingItem({ ...editingItem, description: suggested });
  };

  const handleSaveItem = async () => {
    if (!editingItem || !user) return;
    try {
      let finalDesc = (editingItem.description || "").trim();
      if (editingItem.type === 'professional') {
        if (expMode === "Remote") {
          finalDesc = `Mode: Remote\n\n${finalDesc}`;
        } else if (expLocation) {
          finalDesc = `Mode: ${expMode} (${expLocation})\n\n${finalDesc}`;
        } else {
          finalDesc = `Mode: ${expMode}\n\n${finalDesc}`;
        }
      }

      if (editingItem.type === 'education') {
        // Prepend GPA and Location metadata back to description before saving
        const metaParts: string[] = [];
        if (eduCgpa.trim()) metaParts.push(`GPA: ${eduCgpa.trim()}`);
        if (eduLocation.trim()) metaParts.push(`Location: ${eduLocation.trim()}`);
        if (metaParts.length > 0) {
          finalDesc = finalDesc
            ? `${metaParts.join(' | ')} | ${finalDesc}`
            : metaParts.join(' | ');
        }
      }

      if (editingItem.type === 'product') {
        if (productStatus === 'Shipped' && !editingItem.live_link?.trim()) {
          toast.error("Live Demo Link Required", {
            description: "Shipped products must include a live demo link."
          });
          return;
        }
        finalDesc = `Status: ${productStatus}\n\n${finalDesc}`;
      }

      // Field Sanitization: Remove system fields & detect quantification
      const hasNumbers = /[\d%]/.test(finalDesc) || (editingItem.bullets || []).some(b => /[\d%]/.test(b));

      const itemToSave = {
        ...editingItem,
        description: finalDesc,
        is_quantified: hasNumbers
      };

      console.log("MasterVault: Archiving item:", itemToSave);

      if (editingItem.id) {
        const { error } = await supabase.from("master_vault").update(itemToSave).eq("id", editingItem.id);
        if (error) {
          console.error("MasterVault Update Error:", error);
          throw error;
        }
        // ── RAG: Regenerate embedding for updated item (non-blocking) ──
        generateAndStoreEmbedding(editingItem.id, itemToSave).catch(err =>
          console.warn("[RAG] Embedding update failed (non-blocking):", err)
        );
      } else {
        const { data: insertedData, error } = await supabase.from("master_vault").insert({
          ...itemToSave,
          user_id: user.id,
          type: editingItem.type || 'professional'
        }).select("id").single();
        if (error) {
          console.error("MasterVault Insert Error:", error);
          throw error;
        }
        // ── RAG: Generate embedding for new item (non-blocking) ──
        if (insertedData?.id) {
          generateAndStoreEmbedding(insertedData.id, itemToSave).catch(err =>
            console.warn("[RAG] Embedding generation failed (non-blocking):", err)
          );
        }
      }

      toast.success(`${editingItem.title || "Entry"} archived successfully.`, {
        description: "Your master profile has been synchronized.",
        icon: <Save className="w-4 h-4 text-emerald-500" />
      });
      localStorage.removeItem(`draft_vault_item_${user.id}`);
      localStorage.removeItem(`draft_exp_mode_${user.id}`);
      localStorage.removeItem(`draft_exp_location_${user.id}`);
      localStorage.removeItem(`draft_product_status_${user.id}`);
      localStorage.removeItem(`draft_start_month_${user.id}`);
      localStorage.removeItem(`draft_start_year_${user.id}`);
      localStorage.removeItem(`draft_end_month_${user.id}`);
      localStorage.removeItem(`draft_end_year_${user.id}`);
      localStorage.removeItem(`draft_is_current_${user.id}`);
      setEditingItem(null);
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Failed to save item. Check if you have special characters or if a field is too long.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    toast.error("Are you sure you want to remove this item?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            const deletedItem = items.find(i => i.id === id);
            const { error } = await supabase.from("master_vault").delete().eq("id", id);
            if (error) throw error;
            fetchData();
            toast.success(`${deletedItem?.title || "Entry"} removed from vault.`, {
              icon: <Trash2 className="w-4 h-4 text-red-500" />
            });
          } catch (err) {
            console.error(err);
            toast.error("Failed to delete item.");
          }
        }
      },
      duration: 5000,
    });
  };

  if (isLoading) {
    return (
      <div className="relative w-full min-h-[60vh] p-4 sm:p-6 md:p-8 animate-in fade-in duration-700">
        {/* Pulsing vault outline under blur */}
        <div className="opacity-35 blur-[2px] pointer-events-none select-none">
          <VaultSkeleton />
        </div>
        {/* Central glass loading card */}
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="backdrop-blur-md bg-white/70 border border-white/40 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center justify-center space-y-6 max-w-sm text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-lumina-teal/30 border-t-lumina-teal animate-spin" />
              <img 
                src="/logo.png" 
                alt="Lumina" 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-auto animate-pulse" 
              />
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-display font-black uppercase tracking-[0.2em] text-[#1E2A3A]">Initializing Tactical Library</h3>
              <p className="text-[10px] font-semibold text-[#1E2A3A]/50 uppercase tracking-widest">Securing Career Intelligence Signal...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 py-24 text-center space-y-8 min-h-[60vh]">
        <div className="w-24 h-24 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner">
          <User className="w-10 h-10 text-primary/40" />
        </div>
        <div className="space-y-4">
          <h3 className="text-3xl font-display font-bold tracking-tight text-foreground">Tactical Profile Restricted</h3>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto leading-relaxed">Your persistent career library is securely encrypted. Sign in to access smart-sync and AI tailoring features.</p>
        </div>
        <Link to="/auth" className="group relative px-10 py-4 bg-lumina-teal text-white rounded-full text-xs font-bold uppercase tracking-widest transition-all hover:scale-[1.05] active:scale-95 shadow-2xl overflow-hidden">
          <span className="relative z-10">Proceed to Secure Login</span>
          <div className="absolute inset-0 bg-accent-blue translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-12 max-w-5xl mx-auto pb-24 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-accent-emerald animate-pulse" />
            <span className="text-[10px] uppercase font-black tracking-[0.3em] text-accent-emerald">Signal Active</span>
          </div>
          <h2 className="text-5xl font-display font-bold tracking-tighter text-foreground flex items-center gap-4">
            Tactical Profile
          </h2>
          <p className="text-muted-foreground font-medium max-w-lg">Your master career dataset. Every achievement stored here powers the AI generation engine.</p>
        </div>
        <button
          onClick={fetchData}
          disabled={isLoading}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all disabled:opacity-50"
        >
          {isLoading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Refresh Vault
        </button>
      </div>

      {/* ── READINESS PROGRESS BAR (RELOCATED) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-4">
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 shadow-inner">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${calculateCompletion(profile, items)}%` }}
                className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary shadow-[0_0_20px_rgba(59,130,246,0.5)]"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">{calculateCompletion(profile, items)}% Integrity</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase">Readiness Signal</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8">
          <UsageMeter label="Intelligence Scans" used={scansUsed} total={scansTotal} color="#10B981" />
          <UsageMeter label="Elite Tailorings" used={tailorsUsed} total={tailorsTotal} color="#3B82F6" />
        </div>
      </div>

      {/* ── SMART SYNC HERO CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative group overflow-hidden rounded-[3rem] p-[1px] bg-gradient-to-br from-primary/40 via-white/5 to-secondary/40 shadow-2xl transition-all"
      >
        <div className="relative bg-slate-950/90 rounded-[3rem] p-8 lg:p-12 overflow-hidden flex flex-col lg:flex-row items-center gap-10">
          <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
            <Zap className="w-64 h-64 text-primary" />
          </div>

          <div className="flex-1 space-y-6 relative z-10 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
              <img src="/logo.png" alt="" className="w-5 h-auto object-contain animate-pulse" />
              <span className="text-[9px] font-black uppercase tracking-[0.2em]">Zero-Effort Architecture</span>
            </div>

            <div className="space-y-4">
              <h3 className="text-3xl lg:text-4xl font-serif italic text-white leading-tight">
                Extract Details From <br className="hidden md:block" /> Your Professional Resume
              </h3>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto lg:mx-0 leading-relaxed font-medium">
                Our AI extraction engine instantly structures your historical candidacy data.
                Upload your resume to automatically populate your tactical profile with 0.1% accuracy.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportResume}
                accept=".pdf,.docx,.txt"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isSyncing}
                className="group relative flex items-center gap-4 px-10 py-5 rounded-2xl bg-lumina-navy text-white text-xs font-black uppercase tracking-[0.2em] shadow-2xl hover:scale-105 active:scale-95 disabled:opacity-50 transition-all overflow-hidden border border-white/10"
              >
                <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
                {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Import className="w-5 h-5 text-primary group-hover:scale-125 transition-transform" />}
                Attach Resume File
              </button>

              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-black uppercase tracking-widest px-4 border-l border-white/10 h-full">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
                Smart Sync Ready
              </div>
            </div>
          </div>

          <div className="lg:w-1/3 flex items-center justify-center relative">
            <div className="w-32 lg:w-48 h-32 lg:h-48 rounded-full bg-primary/20 blur-[60px] absolute" />
            <div className="relative p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-md transform -rotate-3 hover:rotate-0 transition-transform pointer-events-none">
              <div className="w-full space-y-3">
                <div className="h-2 w-24 bg-white/20 rounded-full" />
                <div className="h-2 w-32 bg-white/10 rounded-full" />
                <div className="h-2 w-16 bg-white/5 rounded-full" />
              </div>
              <div className="absolute -bottom-4 -right-4 p-4 rounded-xl bg-primary shadow-xl">
                <img 
                  src="/logo.png" 
                  alt="" 
                  className="w-10 h-auto object-contain brightness-0 invert" 
                />
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── MANUAL ENTRY BRIDGING SECTION ── */}
      <div className="relative py-12 flex flex-col items-center">
        <div className="absolute inset-0 flex items-center justify-center px-4">
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        </div>
        <div className="relative px-8 bg-background flex flex-col items-center gap-3 text-center">
          <div className="flex items-center gap-4">
            <div className="w-8 h-px bg-primary/30" />
            <span className="text-[11px] font-black uppercase tracking-[0.5em] text-primary/60">OR</span>
            <div className="w-8 h-px bg-primary/30" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-primary">
            Refine Your Tactical Profile Manually
          </p>
        </div>
      </div>


      <div className="grid grid-cols-1 gap-12 pt-8">

        {/* ── SECTION: IDENTITY ── */}
        <div className="space-y-6">
          <div className="flex items-center gap-4 pl-4">
            <User size={18} className="text-primary" />
            <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Personal Identity</h3>
            <div className="h-px flex-1 bg-gradient-to-r from-white/10 to-transparent" />
          </div>

          <div className="premium-card p-8 lg:p-10 space-y-8 relative overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Identity</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.full_name || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, full_name: e.target.value }) : null)}
                    placeholder="Full Legal Name"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Base Location</label>
                <div className="relative group">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.location || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                    placeholder="e.g. Bangalore, KA"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Secure Contact</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.phone || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, phone: e.target.value }) : null)}
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">LinkedIn HQ</label>
                <div className="relative group">
                  <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.linkedin_url || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, linkedin_url: e.target.value }) : null)}
                    placeholder="linkedin.com/in/username"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">GitHub / Code</label>
                <div className="relative group">
                  <Github className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.github_url || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, github_url: e.target.value }) : null)}
                    placeholder="github.com/username"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Portfolio / Website</label>
                <div className="relative group">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full bg-background/40 border border-border/40 rounded-2xl pl-12 pr-4 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={profile?.website_url || ""}
                    onChange={(e) => setProfile(prev => prev ? ({ ...prev, website_url: e.target.value }) : null)}
                    placeholder="portfolio.com"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Master Professional Summary</label>
              <textarea
                className="w-full bg-background/40 border border-border/40 rounded-3xl p-6 text-sm focus:ring-2 ring-primary/20 transition-all h-40 resize-none outline-none"
                value={profile?.summary_master || ""}
                onChange={(e) => setProfile(prev => prev ? ({ ...prev, summary_master: e.target.value }) : null)}
                placeholder="Paste every achievement, skill, and mission statement here. The AI will distill the 0.1% strongest parts for every application."
              />
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    if (confirm("CLEAR IDENTITY: This will wipe your name, location, and links. Professional experience remains safe. Proceed?")) {
                      setProfile(prev => prev ? {
                        ...prev,
                        full_name: "",
                        location: "",
                        phone: "",
                        linkedin_url: "",
                        github_url: "",
                        website_url: "",
                        summary_master: ""
                      } : null);
                      toast.success("Identity fields cleared locally.");
                    }
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
                >
                  Clear Identity
                </button>
                <button
                  onClick={() => {
                    if (confirm("EMERGENCY RESET: This will clear all local drafts and unsaved changes. Your saved vault items remain safe in the cloud. Proceed?")) {
                      localStorage.removeItem(`draft_profile_${user.id}`);
                      localStorage.removeItem(`draft_summary_${user.id}`);
                      localStorage.removeItem(`draft_vault_item_${user.id}`);
                      fetchData();
                      toast.success("Local state re-synchronized.");
                    }
                  }}
                  className="text-[9px] font-black uppercase tracking-widest text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  Emergency Reset
                </button>
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-3 px-10 py-4 rounded-2xl text-sm font-bold bg-lumina-teal text-white hover:scale-[1.05] transition-all shadow-xl shadow-teal-500/10 active:scale-95 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Identity Signal
              </button>
            </div>
          </div>
        </div>

        {/* ── SECTION: EXPERIENCE ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <Briefcase size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Strategic Experience</h3>
              <div className="h-px w-32 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  if (confirm("CLEAR EXPERIENCE: This will permanently delete ALL professional roles from your vault. Proceed?")) {
                    const { error } = await supabase.from("master_vault").delete().eq("user_id", user.id).eq("type", "professional");
                    if (error) toast.error("Failed to clear experience.");
                    else {
                      fetchData();
                      toast.success("Strategic experience cleared.");
                    }
                  }
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear Experience
              </button>
              <button
                onClick={() => handleStartEdit({ type: 'professional', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Plus size={14} /> Add Role
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {items.filter(item => item.type === 'professional').map((item) => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  key={item.id}
                  className="premium-card p-8 flex flex-col justify-between gap-6 group hover:border-primary/40 transition-all hover:shadow-2xl hover:shadow-primary/5"
                >
                  <div className="space-y-4">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h4 className="font-display font-bold text-xl leading-none">{item.title}</h4>
                        <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{item.organization}</p>
                      </div>
                      {item.is_quantified && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[9px] font-bold text-green-500 uppercase tracking-tighter">
                          <Zap className="w-3 h-3 fill-current" />
                          Quantified
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium bg-muted/30 w-fit px-3 py-1 rounded-full border border-white/5">
                      <Clock className="w-3 h-3" />
                      {item.period}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground/70 line-clamp-3 italic">"{item.description}"</p>
                  </div>
                  <div className="flex gap-2 pt-4 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                    <button onClick={() => handleStartEdit(item)} className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/40 hover:bg-muted text-[10px] font-bold uppercase tracking-widest transition-all"><Edit3 className="w-3.5 h-3.5" /> Edit</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-xl bg-muted/40 hover:bg-red-500/10 hover:text-red-500 text-muted-foreground transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {items.filter(item => item.type === 'professional').length === 0 && (
              <div className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-[3rem] text-center text-muted-foreground text-sm font-medium italic opacity-40">
                No tactical experience mapped. Use "Smart Sync" or "Add Role" to begin.
              </div>
            )}
          </div>
        </div>

        {/* ── SECTION: EDUCATION ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <GraduationCap size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Academic Pedigree</h3>
              <div className="h-px w-32 bg-gradient-to-r from-white/10 to-transparent" />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  toast.error("CLEAR EDUCATION: This will permanently delete ALL academic entries.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "education");
                        if (error) toast.error("Failed to clear education.");
                        else {
                          fetchData();
                          toast.success("Academic pedigree cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear Education
              </button>
              <button
                onClick={() => handleStartEdit({ type: 'education', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                <Plus size={14} /> Add Degree
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence>
              {items.filter(item => item.type === 'education').map((item) => (
                <motion.div
                  key={item.id}
                  className="premium-card p-8 flex flex-col justify-between gap-4 group"
                >
                  <div className="space-y-2">
                    <h4 className="font-display font-bold text-lg">{item.title}</h4>
                    <p className="text-[11px] font-bold text-primary uppercase tracking-widest">{item.organization}</p>
                    <p className="text-xs text-muted-foreground">{item.period}</p>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={() => handleStartEdit(item)} className="p-2.5 rounded-xl bg-muted/40 hover:bg-muted font-bold text-[10px] uppercase tracking-widest flex items-center gap-2"><Edit3 size={14} /> Edit</button>
                    <button onClick={() => handleDeleteItem(item.id)} className="p-2.5 rounded-xl bg-muted/40 hover:text-red-500 transition-all"><Trash2 size={14} /></button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* ── SECTION: PROJECTS ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <Code size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Projects</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.error("CLEAR PROJECTS: This will permanently delete ALL technical projects.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "project");
                        if (error) toast.error("Failed to clear projects.");
                        else {
                          fetchData();
                          toast.success("Technical projects cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => handleStartEdit({ type: 'project', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.filter(item => item.type === 'project').map(item => (
              <div key={item.id} className="premium-card p-6 flex justify-between items-center group">
                <div>
                  <h5 className="font-display font-bold text-base">{item.title}</h5>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.organization}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleStartEdit(item)} className="text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION: PRODUCTS / STARTUPS ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <Rocket size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Products / Startups</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.error("CLEAR PRODUCTS: This will permanently delete ALL product/startup entries.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "product");
                        if (error) toast.error("Failed to clear products.");
                        else {
                          fetchData();
                          toast.success("Product entries cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => handleStartEdit({ type: 'product', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.filter(item => item.type === 'product').map(item => (
              <div key={item.id} className="premium-card p-6 flex justify-between items-center group">
                <div>
                  <h5 className="font-display font-bold text-base">{item.title}</h5>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.organization}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleStartEdit(item)} className="text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION: CREDENTIALS ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <Award size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Credentials</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.error("CLEAR CREDENTIALS: This will permanently delete ALL certifications and awards.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "certification");
                        if (error) toast.error("Failed to clear credentials.");
                        else {
                          fetchData();
                          toast.success("Credentials cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => handleStartEdit({ type: 'certification', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.filter(item => item.type === 'certification').map(item => (
              <div key={item.id} className="premium-card p-6 flex justify-between items-center group">
                <div>
                  <h5 className="font-display font-bold text-base">{item.title}</h5>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.organization}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleStartEdit(item)} className="text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION: LEADERSHIP ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <User size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Leadership & Impact</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.error("CLEAR LEADERSHIP: This will permanently delete ALL leadership entries.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "leadership");
                        if (error) toast.error("Failed to clear leadership.");
                        else {
                          fetchData();
                          toast.success("Leadership entries cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => handleStartEdit({ type: 'leadership', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.filter(item => item.type === 'leadership').map(item => (
              <div key={item.id} className="premium-card p-6 flex justify-between items-center group">
                <div>
                  <h5 className="font-display font-bold text-base">{item.title}</h5>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.organization}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleStartEdit(item)} className="text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── SECTION: AWARDS ── */}
        <div className="space-y-6">
          <div className="flex items-center justify-between pl-4">
            <div className="flex items-center gap-4">
              <Sparkles size={18} className="text-primary" />
              <h3 className="text-xs font-black uppercase tracking-[0.3em] text-foreground/70">Honors & Awards</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  toast.error("CLEAR AWARDS: This will permanently delete ALL award entries.", {
                    action: {
                      label: "Proceed",
                      onClick: async () => {
                        const { error } = await supabase.from("master_vault").delete().eq("user_id", user?.id).eq("type", "award");
                        if (error) toast.error("Failed to clear awards.");
                        else {
                          fetchData();
                          toast.success("Award entries cleared.");
                        }
                      }
                    },
                    duration: 5000,
                  });
                }}
                className="text-[9px] font-black uppercase tracking-widest text-red-500/40 hover:text-red-500 transition-colors"
              >
                Clear
              </button>
              <button onClick={() => handleStartEdit({ type: 'award', bullets: [], skills: [], title: '', organization: '', period: '', description: '' })} className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-all"><Plus size={20} /></button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {items.filter(item => item.type === 'award').map(item => (
              <div key={item.id} className="premium-card p-6 flex justify-between items-center group">
                <div>
                  <h5 className="font-display font-bold text-base">{item.title}</h5>
                  <p className="text-[10px] text-muted-foreground uppercase">{item.organization}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                  <button onClick={() => handleStartEdit(item)} className="text-muted-foreground hover:text-primary"><Edit3 size={14} /></button>
                  <button onClick={() => handleDeleteItem(item.id)} className="text-muted-foreground hover:text-red-500"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Modal - Upgraded for Quantifier Assistant */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
            // Removed backdrop-click close to prevent accidental data loss
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="premium-card w-full max-w-3xl p-10 relative z-10 overflow-hidden border border-white/10 shadow-3xl shadow-black/50"
            >
              <div className="flex justify-between items-center mb-10">
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-bold">Refine Tactical Detail</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Type: {editingItem.type}</p>
                </div>
                <button
                  onClick={() => {
                    setEditingItem(null);
                    toast.info("Unsaved changes held in draft.", { duration: 3000 });
                  }}
                  className="p-3 rounded-2xl hover:bg-muted transition-all"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8 max-h-[65vh] overflow-y-auto pr-4 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">{getFieldLabels(editingItem.type).titleStr}</label>
                    <input
                      className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                      value={editingItem.title || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                      placeholder={getFieldLabels(editingItem.type).titleEx}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">{getFieldLabels(editingItem.type).orgStr}</label>
                    <input
                      className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                      value={editingItem.organization || ""}
                      onChange={(e) => setEditingItem({ ...editingItem, organization: e.target.value })}
                      placeholder={getFieldLabels(editingItem.type).orgEx}
                    />
                  </div>
                </div>

                 <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">{getFieldLabels(editingItem.type).periodStr}</label>
                  <input
                    className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={editingItem.period || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, period: e.target.value })}
                    placeholder={getFieldLabels(editingItem.type).periodEx}
                  />
                 </div>

                {/* ── Education: Optional CGPA + Location ── */}
                {editingItem.type === 'education' && (
                  <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Academic Details</label>
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-widest">Optional</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground ml-1">CGPA / GPA Score</label>
                        <input
                          className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                          value={eduCgpa}
                          onChange={(e) => setEduCgpa(e.target.value)}
                          placeholder="e.g. 8.5/10 or 3.8/4.0"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground ml-1">Campus Location</label>
                        <input
                          className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                          value={eduLocation}
                          onChange={(e) => setEduLocation(e.target.value)}
                          placeholder="e.g. Bengaluru, India"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {(editingItem.type === 'professional' || editingItem.type === 'education') && (
                  <div className="space-y-3 bg-muted/10 p-5 rounded-2xl border border-white/5 animate-in fade-in duration-300">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] uppercase tracking-widest font-black text-primary">Duration Builder Assistant</label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold">
                        <input
                        type="checkbox"
                        checked={isCurrent}
                        onChange={(e) => {
                          setIsCurrent(e.target.checked);
                          updateDurationPeriod(startMonth, startYear, endMonth, endYear, e.target.checked);
                        }}
                        className="rounded border-white/10 text-primary focus:ring-0 w-4 h-4 bg-muted/20"
                      />
                      <span>Currently {editingItem.type === 'education' ? 'Studying' : 'Working'} Here (Present)</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Start Month</span>
                      <select
                        value={startMonth}
                        onChange={(e) => {
                          setStartMonth(e.target.value);
                          updateDurationPeriod(e.target.value, startYear, endMonth, endYear, isCurrent);
                        }}
                        className="w-full bg-muted/20 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                      >
                        {MONTHS.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">Start Year</span>
                      <select
                        value={startYear}
                        onChange={(e) => {
                          setStartYear(e.target.value);
                          updateDurationPeriod(startMonth, e.target.value, endMonth, endYear, isCurrent);
                        }}
                        className="w-full bg-muted/20 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                      >
                        {YEARS.map(y => <option key={y} value={y} className="bg-background text-foreground">{y}</option>)}
                      </select>
                    </div>
                    {!isCurrent && (
                      <>
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">End Month</span>
                          <select
                            value={endMonth}
                            onChange={(e) => {
                              setEndMonth(e.target.value);
                              updateDurationPeriod(startMonth, startYear, e.target.value, endYear, isCurrent);
                            }}
                            className="w-full bg-muted/20 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                          >
                            {MONTHS.map(m => <option key={m} value={m} className="bg-background text-foreground">{m}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">End Year</span>
                          <select
                            value={endYear}
                            onChange={(e) => {
                              setEndYear(e.target.value);
                              updateDurationPeriod(startMonth, startYear, endMonth, e.target.value, isCurrent);
                            }}
                            className="w-full bg-muted/20 border border-border/40 rounded-xl px-3 py-2 text-xs text-foreground outline-none cursor-pointer"
                          >
                            {YEARS.map(y => <option key={y} value={y} className="bg-background text-foreground">{y}</option>)}
                          </select>
                        </div>
                      </>
                    )}
                    </div>
                  </div>
                )}

                {editingItem.type === 'product' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Venture Status</label>
                      <select
                        className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none appearance-none cursor-pointer text-foreground"
                        value={productStatus}
                        onChange={(e) => setProductStatus(e.target.value)}
                      >
                        <option value="Ongoing" className="bg-background text-foreground">Ongoing</option>
                        <option value="Shipped" className="bg-background text-foreground">Shipped</option>
                      </select>
                    </div>
                  </div>
                )}

                {editingItem.type === 'professional' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Experience Mode</label>
                      <select
                        className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none appearance-none cursor-pointer text-foreground"
                        value={expMode}
                        onChange={(e) => setExpMode(e.target.value)}
                      >
                        <option value="On-site" className="bg-background text-foreground">On-site</option>
                        <option value="Remote" className="bg-background text-foreground">Remote</option>
                        <option value="Offline" className="bg-background text-foreground">Offline</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className={`text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1 transition-opacity ${expMode === 'Remote' ? 'opacity-40' : ''}`}>
                        Location {expMode === 'Remote' && '(Not required for Remote)'}
                      </label>
                      <input
                        className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                        value={expMode === 'Remote' ? "" : expLocation}
                        onChange={(e) => setExpLocation(e.target.value)}
                        placeholder="e.g. Bengaluru, India"
                        disabled={expMode === 'Remote'}
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">{getFieldLabels(editingItem.type).descStr}</label>
                    <button
                      onClick={handleSuggestMetrics}
                      className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[9px] font-bold text-primary uppercase tracking-widest hover:bg-primary/20 transition-all"
                    >
                      <Zap className="w-3 h-3" /> Suggest Metrics
                    </button>
                  </div>
                  <textarea
                    className="w-full bg-muted/20 border border-border/40 rounded-3xl p-6 text-sm h-48 resize-none focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={editingItem.description || ""}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                    placeholder={getFieldLabels(editingItem.type).descEx}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">Keyword Tags (Comma separated)</label>
                  <input
                    className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                    value={Array.isArray(editingItem.skills) ? editingItem.skills.join(", ") : ""}
                    onChange={(e) => setEditingItem({ ...editingItem, skills: e.target.value.split(",").map(s => s.trim()).filter(s => s) })}
                    placeholder="Vector DBs, LLM Fine-tuning, PyTorch..."
                  />
                </div>

                {(editingItem.type === 'project' || editingItem.type === 'product') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">GitHub Link (Optional)</label>
                      <input
                        className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                        value={editingItem.github_link || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, github_link: e.target.value })}
                        placeholder="github.com/your-username/repo"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground ml-1">
                        Live Demo Link {editingItem.type === 'product' && productStatus === 'Shipped' ? '(Required for Shipped)' : '(Optional)'}
                      </label>
                      <input
                        className="w-full bg-muted/20 border border-border/40 rounded-2xl px-5 py-4 text-sm focus:ring-2 ring-primary/20 transition-all outline-none"
                        value={editingItem.live_link || ""}
                        onChange={(e) => setEditingItem({ ...editingItem, live_link: e.target.value })}
                        placeholder="your-project.vercel.app"
                        required={editingItem.type === 'product' && productStatus === 'Shipped'}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-4 pt-10 mt-6 border-t border-white/5">
                <button
                  onClick={() => {
                    toast.error("Discard draft permanently? All typed content will be erased.", {
                      action: {
                        label: "Discard",
                        onClick: () => {
                          localStorage.removeItem(`draft_vault_item_${user?.id}`);
                          localStorage.removeItem(`draft_exp_mode_${user?.id}`);
                          localStorage.removeItem(`draft_exp_location_${user?.id}`);
                          localStorage.removeItem(`draft_product_status_${user?.id}`);
                          localStorage.removeItem(`draft_start_month_${user?.id}`);
                          localStorage.removeItem(`draft_start_year_${user?.id}`);
                          localStorage.removeItem(`draft_end_month_${user?.id}`);
                          localStorage.removeItem(`draft_end_year_${user?.id}`);
                          localStorage.removeItem(`draft_is_current_${user?.id}`);
                          setEditingItem(null);
                        }
                      },
                      duration: 5000,
                    });
                  }}
                  className="px-8 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground hover:bg-muted/30 transition-all"
                >
                  Discard Draft
                </button>
                <button
                  onClick={handleSaveItem}
                  disabled={isSaving}
                  className="flex items-center gap-3 px-12 py-4 rounded-2xl text-xs font-bold uppercase tracking-[0.2em] bg-foreground text-background hover:scale-105 transition-all shadow-2xl shadow-foreground/20 active:scale-95 disabled:opacity-50"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save to Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── SECTION: POTENTIAL DUPLICATES ── */}
      {(() => {
        if (typeof window === 'undefined') return null;
        const dupes = JSON.parse(sessionStorage.getItem(`dupes_${user?.id}`) || "[]");
        if (dupes.length === 0) return null;
        
        return (
          <div className="max-w-7xl mx-auto px-6 pb-24 border-t border-white/5 pt-12 mt-12">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <RefreshCw size={20} className="text-amber-500 animate-spin-slow" />
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.3em] text-amber-500">Duplicate Intelligence</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Reviewing conflicts from multi-resume sync</p>
                </div>
              </div>
              <button
                onClick={() => {
                  sessionStorage.removeItem(`dupes_${user?.id}`);
                  fetchData();
                }}
                className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest hover:bg-amber-500/20 transition-all"
              >
                Clear Review Queue
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dupes.map((item: Omit<VaultItem, 'id' | 'created_at'>, idx: number) => (
                <div key={idx} className="premium-card p-6 border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all group">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-1">
                      <h4 className="font-display font-bold text-base line-clamp-1">{item.title}</h4>
                      <p className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">{item.organization}</p>
                    </div>
                    <div className="p-1.5 rounded bg-amber-500/10 text-amber-500">
                      <AlertCircle size={14} />
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-muted-foreground line-clamp-3 mb-6 italic leading-relaxed">
                    "{item.description}"
                  </p>
                  
                  <div className="flex gap-3 pt-4 border-t border-white/5">
                    <button 
                      onClick={async () => {
                        const { error } = await supabase.from("master_vault").insert(item);
                        if (!error) {
                          const newDupes = dupes.filter((_: Omit<VaultItem, 'id' | 'created_at'>, i: number) => i !== idx);
                          sessionStorage.setItem(`dupes_${user?.id}`, JSON.stringify(newDupes));
                          fetchData();
                          toast.success("Conflict resolved: Saved to vault!");
                        } else {
                          toast.error("Failed to save entry.");
                        }
                      }}
                      className="flex-1 py-2 rounded-lg bg-lumina-teal text-white text-[10px] font-black uppercase tracking-widest hover:bg-lumina-teal/90 transition-all text-center"
                    >
                      Keep Item
                    </button>
                    <button
                      onClick={() => {
                        const newDupes = dupes.filter((_: Omit<VaultItem, 'id' | 'created_at'>, i: number) => i !== idx);
                        sessionStorage.setItem(`dupes_${user?.id}`, JSON.stringify(newDupes));
                        fetchData();
                        toast.info("Conflict resolved: Item discarded.");
                      }}
                      className="flex-1 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all text-center"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
