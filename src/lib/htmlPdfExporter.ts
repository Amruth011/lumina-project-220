/**
 * htmlPdfExporter.ts — HTML → PDF export for ATS-friendly resumes
 *
 * Instead of jsPDF programmatic layout, this builds an HTML string from
 * the generated resume data, opens it in a new window, and uses the
 * browser's native print dialog (Save as PDF).
 *
 * The template at /ats-cv-template.html is ATS-optimized and uses
 * standard web fonts (Helvetica/Arial) for clean text extraction.
 */

export interface HeaderData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio: string;
  github: string;
}

export interface ExperienceItem {
  heading: string;
  content: string;
  bullets: string[];
}

export interface GeneratedResumeData {
  professional_summary: string;
  skills_section: string[];
  experience: ExperienceItem[];
  products?: ExperienceItem[];
  projects: ExperienceItem[];
  education: string[];
  certifications: string[];
  awards: string[];
  leadership?: ExperienceItem[];
}

const escapeHtml = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const buildContactHtml = (header: HeaderData): string => {
  const parts: string[] = [];
  if (header.location) parts.push(escapeHtml(header.location));
  if (header.phone) parts.push(escapeHtml(header.phone));
  if (header.email) parts.push(escapeHtml(header.email));
  if (header.linkedin) parts.push(`<a href="${escapeHtml(header.linkedin)}">LinkedIn</a>`);
  if (header.github) parts.push(`<a href="${escapeHtml(header.github)}">GitHub</a>`);
  if (header.portfolio) parts.push(`<a href="${escapeHtml(header.portfolio)}">Portfolio</a>`);
  return parts.join(' &nbsp;|&nbsp; ');
};

const buildBulletsHtml = (bullets: string[]): string => {
  if (!bullets || bullets.length === 0) return "";
  const items = bullets
    .map(b => {
      const clean = b.replace(/^[•\s]+/, "").trim();
      return `<li>${escapeHtml(clean)}</li>`;
    })
    .join("\n");
  return `<ul>\n${items}\n</ul>`;
};

const buildExperienceHtml = (items: ExperienceItem[]): string => {
  if (!items || items.length === 0) return "";
  return items
    .map(item => {
      const heading = escapeHtml(item.heading);
      const content = item.content ? `<div class="item-sub">${escapeHtml(item.content)}</div>` : "";
      const bullets = buildBulletsHtml(item.bullets);
      return `<div class="item">\n<div class="item-header">${heading}</div>\n${content}\n${bullets}\n</div>`;
    })
    .join("\n");
};

const buildProjectsHtml = (items: ExperienceItem[]): string => {
  if (!items || items.length === 0) return "";
  return items
    .map(item => {
      const heading = escapeHtml(item.heading);
      const bullets = buildBulletsHtml(item.bullets);
      return `<div class="item">\n<div class="item-header">${heading}</div>\n${bullets}\n</div>`;
    })
    .join("\n");
};

const buildEducationHtml = (items: string[]): string => {
  if (!items || items.length === 0) return "";
  return items
    .map(edu => `<div class="item">${escapeHtml(edu)}</div>`)
    .join("\n");
};

const buildSkillsHtml = (skills: string[]): string => {
  if (!skills || skills.length === 0) return "";
  return skills
    .map(s => {
      const clean = s.replace(/^[:\s]+/, "").trim();
      return `<div class="skills-line">${escapeHtml(clean)}</div>`;
    })
    .join("\n");
};

const buildCompetenciesHtml = (skills: string[]): string => {
  if (!skills || skills.length === 0) return "";
  // Extract individual skills from section strings
  const allSkills: string[] = [];
  skills.forEach(section => {
    const afterColon = section.includes(":") ? section.split(":").slice(1).join(":") : section;
    afterColon.split(",").forEach(s => {
      const t = s.trim();
      if (t) allSkills.push(t);
    });
  });
  // Take top 12
  const top = allSkills.slice(0, 12);
  return top.map(s => `<span class="comp-tag">${escapeHtml(s)}</span>`).join("\n");
};

/**
 * Build a complete HTML document from resume data.
 * Uses the ats-cv-template.html as base structure.
 */
export const buildResumeHtml = (
  data: GeneratedResumeData,
  header: HeaderData,
): string => {
  const competenciesHtml = buildCompetenciesHtml(data.skills_section || []);
  const skillsHtml = buildSkillsHtml(data.skills_section || []);
  const experienceHtml = buildExperienceHtml(data.experience || []);
  const projectsHtml = buildProjectsHtml(data.projects || []);
  const educationHtml = buildEducationHtml(data.education || []);

  const summarySection = data.professional_summary
    ? `<div class="section"><div class="section-title">Professional Summary</div><div class="summary-text">${escapeHtml(data.professional_summary)}</div></div>`
    : "";

  const competenciesSection = competenciesHtml
    ? `<div class="section"><div class="section-title">Core Competencies</div><div class="comp-grid">${competenciesHtml}</div></div>`
    : "";

  const experienceSection = experienceHtml
    ? `<div class="section"><div class="section-title">Experience</div>${experienceHtml}</div>`
    : "";

  const projectsSection = projectsHtml
    ? `<div class="section"><div class="section-title">Projects</div>${projectsHtml}</div>`
    : "";

  const educationSection = educationHtml
    ? `<div class="section"><div class="section-title">Education</div>${educationHtml}</div>`
    : "";

  const skillsSection = skillsHtml
    ? `<div class="section"><div class="section-title">Technical Skills</div>${skillsHtml}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 11px; line-height: 1.5; color: #1a1a2e; background: #fff; padding: 12mm 10mm; }
  .header { margin-bottom: 12px; }
  .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.5px; margin-bottom: 2px; }
  .header-line { height: 2px; background: #222; margin-bottom: 5px; }
  .contact { font-size: 9.5px; color: #555; display: flex; flex-wrap: wrap; gap: 3px 10px; }
  .contact a { color: #2a5c8a; text-decoration: none; }
  .section { margin-bottom: 10px; }
  .section-title { font-size: 10.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #ccc; padding-bottom: 2px; margin-bottom: 5px; }
  .summary-text { font-size: 10px; line-height: 1.5; color: #222; }
  .comp-grid { display: flex; flex-wrap: wrap; gap: 4px 6px; }
  .comp-tag { font-size: 9px; background: #f0f0f0; padding: 2px 6px; border-radius: 2px; color: #333; }
  .item { margin-bottom: 6px; }
  .item-header { font-weight: 700; font-size: 10.5px; }
  .item-sub { font-size: 9.5px; color: #555; }
  .item ul { padding-left: 15px; margin-top: 2px; }
  .item li { font-size: 9.5px; line-height: 1.45; margin-bottom: 2px; }
  .skills-line { font-size: 9.5px; margin-bottom: 1px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(header.fullName).toUpperCase()}</h1>
    <div class="header-line"></div>
    <div class="contact">${buildContactHtml(header)}</div>
  </div>
  ${summarySection}
  ${competenciesSection}
  ${experienceSection}
  ${projectsSection}
  ${educationSection}
  ${skillsSection}
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
};

/**
 * Export a resume as PDF by opening HTML in a new window.
 * The user uses the browser's native Save as PDF (Ctrl+P / Cmd+P).
 */
export const exportResumeAsHtmlPdf = (
  data: GeneratedResumeData,
  header: HeaderData,
  filename: string = "resume.pdf",
): void => {
  const html = buildResumeHtml(data, header);

  // Create a blob URL and open in new tab
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);

  const win = window.open(url, "_blank");
  if (win) {
    win.document.title = filename.replace(".pdf", "");
  }

  // Clean up the blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60000);
};
