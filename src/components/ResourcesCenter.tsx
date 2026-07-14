import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, 
  ExternalLink, 
  Copy, 
  Check, 
  Search, 
  Award, 
  BrainCircuit, 
  Trophy, 
  Zap, 
  ChevronRight, 
  ArrowLeft, 
  Mail, 
  MessageSquare, 
  HelpCircle, 
  Info,
  CheckCircle2,
  ListChecks,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";

interface ResourceTopic {
  id: string;
  title: string;
  category: "technical" | "behavioral" | "strategy";
  description: string;
  icon: any;
  color: string;
  content: {
    overview: string;
    sections: {
      title: string;
      bullets?: string[];
      code?: string;
      tips?: string[];
    }[];
    externalLink?: string;
    templates?: {
      title: string;
      subject?: string;
      body: string;
    }[];
  };
}

export const ResourcesCenter = () => {
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const filteredTopics = topics.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Detail View */}
      <AnimatePresence mode="wait">
        {selectedTopicId && activeTopic ? (
          <motion.div
            key="detail"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-100/20 p-6 md:p-10 relative overflow-hidden"
          >
            {/* Header / Back navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6 mb-6">
              <button
                onClick={() => setSelectedTopicId(null)}
                className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 hover:text-lumina-teal transition-colors self-start"
              >
                <ArrowLeft size={14} /> Back to Library
              </button>

              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl bg-${activeTopic.color}/5 border border-${activeTopic.color}/20 flex items-center justify-center text-${activeTopic.color} shadow-sm`}>
                  <activeTopic.icon size={20} />
                </div>
                <div>
                  <span className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-widest">{activeTopic.category}</span>
                  <h3 className="text-lg font-display font-black text-slate-800 tracking-tight">{activeTopic.title}</h3>
                </div>
              </div>
            </div>

            {/* Read Content */}
            <div className="space-y-8 max-w-4xl mx-auto">
              
              {/* Overview Callout */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100/60 text-[12.5px] leading-relaxed text-slate-600 font-sans italic">
                {activeTopic.content.overview}
              </div>

              {/* Core Content Sections */}
              {activeTopic.content.sections.map((sec, idx) => (
                <div key={idx} className="space-y-4">
                  <h4 className="text-sm font-display font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-1.5 h-4 bg-lumina-teal rounded-full" />
                    {sec.title}
                  </h4>

                  {sec.bullets && (
                    <ul className="list-disc pl-5 space-y-2 text-[12px] text-slate-600 font-sans leading-relaxed">
                      {sec.bullets.map((b, bIdx) => (
                        <li key={bIdx}>{b}</li>
                      ))}
                    </ul>
                  )}

                  {sec.code && (
                    <div className="relative rounded-2xl bg-slate-900 border border-slate-800 p-5 font-mono text-[11px] leading-relaxed text-slate-300 overflow-x-auto shadow-inner">
                      <button
                        onClick={() => handleCopyText(sec.code!, `code-${idx}`)}
                        className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                        title="Copy Code"
                      >
                        {copiedIndex === `code-${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                      <pre className="whitespace-pre">{sec.code}</pre>
                    </div>
                  )}

                  {sec.tips && (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-amber-700 flex items-center gap-1.5 font-display">
                        <AlertCircle size={12} /> Pro Tip / Recruiter Lens:
                      </span>
                      <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600 font-sans">
                        {sec.tips.map((t, tIdx) => (
                          <li key={tIdx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}

              {/* Email templates (Only for negotiation) */}
              {activeTopic.content.templates && (
                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <h4 className="text-sm font-display font-bold text-slate-800">High-Leverage Negotiation Templates</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {activeTopic.content.templates.map((tpl, tIdx) => (
                      <div key={tIdx} className="rounded-2xl border border-slate-200 bg-slate-50/30 p-5 space-y-3 relative shadow-inner">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">{tpl.title}</span>
                          <button
                            onClick={() => handleCopyText(tpl.body, `tpl-${tIdx}`)}
                            className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                            title="Copy Template"
                          >
                            {copiedIndex === `tpl-${tIdx}` ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                          </button>
                        </div>
                        {tpl.subject && (
                          <div className="text-[11px] text-slate-500 font-mono">
                            <span className="font-bold">Subject:</span> {tpl.subject}
                          </div>
                        )}
                        <p className="text-[11px] leading-relaxed text-slate-500 font-mono whitespace-pre-wrap border-t border-slate-100 pt-3">
                          {tpl.body}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* External Call Action */}
              {activeTopic.content.externalLink && (
                <div className="pt-6 border-t border-slate-100 flex justify-end">
                  <a
                    href={activeTopic.content.externalLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-2 px-6 py-3.5 rounded-full bg-lumina-teal text-white text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                  >
                    Access Official Documentation <ExternalLink size={12} />
                  </a>
                </div>
              )}

            </div>
          </motion.div>
        ) : (
          /* Grid Index View */
          <motion.div
            key="index"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8"
          >
            {/* Header & Search */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
              <div className="space-y-1">
                <h2 className="text-xl font-display font-black tracking-tight text-slate-800 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-lumina-teal/10 border border-lumina-teal/20 flex items-center justify-center text-lumina-teal shadow-md shadow-emerald-500/5">
                    <BookOpen size={20} />
                  </div>
                  Lumina Resources Hub
                </h2>
                <p className="text-[12px] text-slate-500 max-w-xl">
                  Interactive reference libraries, code checklists, negotiation templates, and behavioral strategies.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative max-w-md w-full md:w-80">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  placeholder="Search cheat sheets..."
                  className="w-full bg-slate-100/70 border border-slate-200 focus:border-lumina-teal rounded-xl pl-10 pr-4 py-2.5 text-xs outline-none transition-colors text-slate-700"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTopics.map((topic) => (
                <div
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className="bg-white border border-slate-100 hover:border-slate-200 p-6 rounded-[2.5rem] shadow-[0_4px_20px_rgba(0,0,0,0.01)] hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                >
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-2xl bg-${topic.color}/5 border border-${topic.color}/20 flex items-center justify-center text-${topic.color} shadow-sm group-hover:scale-105 transition-transform`}>
                        <topic.icon size={18} />
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 block mb-0.5 uppercase tracking-widest">{topic.category}</span>
                        <h4 className="text-sm font-display font-black text-slate-700 tracking-tight">{topic.title}</h4>
                      </div>
                    </div>

                    <p className="text-[11.5px] leading-relaxed text-slate-500 font-sans">
                      {topic.description}
                    </p>
                  </div>

                  <div className="mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-lumina-teal/10 hover:text-lumina-teal hover:border-lumina-teal/20 transition-all text-[10px] font-black uppercase tracking-wider text-slate-600 text-center">
                    Open Cheat Sheet <ChevronRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              ))}

              {filteredTopics.length === 0 && (
                <div className="col-span-full py-16 text-center text-slate-400 font-sans text-xs">
                  No resources found matching your search.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

// Curated comprehensive topic database
const topics: ResourceTopic[] = [
  {
    id: "system-design",
    title: "System Design & Scaling Blueprint",
    category: "technical",
    description: "Architectural rules, consistent hashing, caching topology, replication patterns, database partitioning, and SLA budgets for senior-plus roles.",
    icon: BrainCircuit,
    color: "indigo-500",
    content: {
      overview: "System design interviews test your ability to design scalable architectures from scratch. Focus on structural boundaries, data-flows, and trade-offs.",
      sections: [
        {
          title: "1. Basic Scalability Math (Estimations)",
          bullets: [
            "QPS (Queries Per Second): 1 Million Daily Active Users (DAU) * 10 Queries/user = 10 Million queries daily. 10,000,000 / 86,400 ≈ 115 QPS average (Peak QPS is roughly 2x average = 230 QPS).",
            "Storage: 1 Million DAU uploading 1 image (100KB) daily = 100GB disk space per day. 36.5 Terabytes annually.",
            "Memory: Cache 20% of read traffic (80/20 rule). If daily queries total 100M read operations, keep 20M requests cached."
          ]
        },
        {
          title: "2. Key Design Checklist",
          bullets: [
            "Data Layer: relational (PostgreSQL) for ACID compliance (financial/orders) vs. NoSQL (MongoDB/Cassandra) for high volume, loose-schema reads/writes.",
            "Caching Strategy: Cache-aside (lazy loading) for reads. Write-through/Write-behind for write-heavy syncs. Use Redis Cluster.",
            "Consistent Hashing: Prevents bulk cache invalidation when servers are added/removed in horizontal scaling.",
            "Load Balancers: Round-robin, least connections, or consistent hash routing. Place at DNS, API Gateway, and Internal RPC layers."
          ],
          tips: [
            "Never say 'I will use a load balancer' without detailing the health checking and routing protocol.",
            "Clearly distinguish between read path latency (requires CDN/Redis) and write path scalability (requires Kafka/sharding)."
          ]
        }
      ],
      externalLink: "https://github.com/donnemartin/system-design-primer"
    }
  },
  {
    id: "coding-patterns",
    title: "High-Yield Coding Patterns",
    category: "technical",
    description: "Core algorithms patterns (Sliding Window, Two Pointers, BFS/DFS, Binary Search, DP) with complexity benchmarks.",
    icon: ListChecks,
    color: "blue-500",
    content: {
      overview: "Do not memorize answers. Master the pattern archetypes to solve any unseen array, graph, or matrix problem.",
      sections: [
        {
          title: "1. Sliding Window (O(N) Time, O(1) Space)",
          bullets: [
            "Use when asked to find contiguous subarrays, substrings, or subsegments meeting a constraint.",
            "Maintain left and right boundaries, expanding the right pointer, and conditionally contracting the left pointer."
          ],
          code: `// Sliding Window Example: Max Sum Subarray of Size K
function maxSubarraySum(arr, k) {
  let maxSum = 0, windowSum = 0;
  for (let i = 0; i < arr.length; i++) {
    windowSum += arr[i];
    if (i >= k - 1) {
      maxSum = Math.max(maxSum, windowSum);
      windowSum -= arr[i - (k - 1)]; // contract left edge
    }
  }
  return maxSum;
}`
        },
        {
          title: "2. BFS Graph Traversal (O(V+E) Time, O(V) Space)",
          bullets: [
            "Use for shortest path in unweighted graphs or level-order node processing.",
            "Implements queue (FIFO) and tracks visited sets to prevent cycles."
          ],
          code: `// BFS implementation outline
function bfs(graph, startNode) {
  const queue = [startNode];
  const visited = new Set([startNode]);
  
  while (queue.length > 0) {
    const node = queue.shift();
    // Process node...
    for (const neighbor of graph[node]) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }
}`
        }
      ],
      externalLink: "https://www.techinterviewhandbook.org/"
    }
  },
  {
    id: "salary-negotiation",
    title: "Salary Negotiation Blueprint",
    category: "strategy",
    description: "Base compensation anchoring, sign-on leverage scripts, and complete email templates for handling multiple competing offers.",
    icon: Trophy,
    color: "amber-500",
    content: {
      overview: "Negotiation is an informational balance game. Never present salary targets first; instead, focus on market data alignments.",
      sections: [
        {
          title: "1. Negotiation Golden Rules",
          bullets: [
            "Golden Rule 1: Never disclose current compensation or desired target numbers in initial screening calls. Deflect using: 'I am focused on finding the right role match, and I trust you are compensating competitively based on market metrics.'",
            "Golden Rule 2: Anchor high when they offer. Always request a review of the total compensation package (Base + Equity + Sign-on).",
            "Golden Rule 3: Use competing offers. Recruiters are significantly more flexible when you have active parallel loops at a matching/higher tier."
          ],
          tips: [
            "Recruiters will tell you 'this is the absolute cap for this tier.' This is almost always false; sign-ons and equity are allocated from secondary pools."
          ]
        }
      ],
      templates: [
        {
          title: "Competing Offer Leverage",
          subject: "Lumina Offer Review - [Your Name]",
          body: `Hi [Recruiter Name],

Thank you for sending over the offer details for the [Role Title] position. I am highly excited about the team and the initiatives we discussed.

As an update, I have received a competing offer from another firm that is offering a total compensation package of [Competing Amount/Details] (specifically with a stronger equity allocation).

Lumina remains my top choice due to [Team focus/Scale challenge]. If we are able to align the base salary and equity components to match [Competing Amount], I am prepared to sign and withdraw from all other active loops immediately.

Let me know if we can schedule a quick call to finalize this.

Best regards,
[Your Name]`
        },
        {
          title: "Polite Counters (No Competing Offer)",
          subject: "Lumina Offer - [Your Name]",
          body: `Hi [Recruiter Name],

Thank you for sharing the offer details. I am thrilled by the prospect of joining Lumina!

Looking at the package, I wanted to ask if we have any flexibility regarding the [base salary / sign-on bonus] allocation. Given my specialized background in [Key Technology/System scale], I was hoping to align the base closer to [Target Number, e.g., $10k-15k higher] to feel fully aligned with current market rates.

I am eager to get started and support the team's expansion goals. Please let me know if this adjustment is possible.

Best regards,
[Your Name]`
        }
      ]
    }
  },
  {
    id: "reverse-interview",
    title: "Reverse Interviewing Deck",
    category: "strategy",
    description: "Curated questions to ask Engineering Directors, Tech Leads, and Recruiters to audit company health, tech debt, and culture.",
    icon: MessageSquare,
    color: "pink-500",
    content: {
      overview: "An interview is a two-way street. The questions you ask signal your engineering seniority and business due-diligence.",
      sections: [
        {
          title: "1. Questions for Engineering Directors & Managers",
          bullets: [
            "How does the engineering department balance feature delivery against technical debt and architectural refactoring?",
            "What did the onboarding cycle look like for the last engineer that joined this team? How long before their first code production push?",
            "What has been the team's retention rate over the past 12-18 months? What is the main reason engineers cite when leaving?",
            "How do you measure individual engineering performance on this team?"
          ],
          tips: [
            "Avoid asking trivial questions about benefits. Focus on production friction, on-call schedules, and engineering autonomy."
          ]
        },
        {
          title: "2. Questions for Peer Engineers (Team Leads)",
          bullets: [
            "What is the biggest operational hurdle or friction point in the daily deploy/release process?",
            "How does the team handle pager duty and incident post-mortems? Is there a blameless post-mortem culture?",
            "What is one codebase decision that the team regrets, and what is the remediation roadmap?"
          ]
        }
      ]
    }
  },
  {
    id: "star-method",
    title: "The STAR Framework Blueprint",
    category: "behavioral",
    description: "Construct situational interview stories. Tips on balancing durations and using powerful action verbs.",
    icon: Award,
    color: "emerald-500",
    content: {
      overview: "STAR ensures your stories are highly structured, keeping recruiters engaged and providing clear data markers.",
      sections: [
        {
          title: "1. Time Allocation Breakdown (Total 3 Minutes)",
          bullets: [
            "Situation (S) [30-45s]: Introduce the company, team, project, and the immediate crisis or goal.",
            "Task (T) [30s]: Explain your specific role, scope of work, and responsibility.",
            "Action (A) [90s]: The bulk of your answer. Walk through the technical architecture, leadership challenges, and steps *you* spearheaded.",
            "Result (R) [45s]: Provide the numerical impact of your actions (latency reduction, cost saving, revenue lift)."
          ]
        },
        {
          title: "2. Power Action Verbs vs. Passive Fillers",
          bullets: [
            "DO NOT USE: 'helped migrate', 'was involved in', 'supported team', 'participated in meetings'. These dilute your impact.",
            "DO USE: 'spearheaded', 'architected', 'pioneered', 'engineered', 'refactored', 'consolidated', 'negotiated', 'streamlined'."
          ],
          tips: [
            "Recruiters listen specifically for 'I' vs. 'We'. Focus on your individual actions even inside team efforts."
          ]
        }
      ]
    }
  }
];
