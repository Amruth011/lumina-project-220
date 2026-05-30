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

const buildProductsHtml = (items: ExperienceItem[]): string => {
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
const renderEducation = (edu: string): string => {
  const parts = edu.split(" @ ");
  const degree = parts[0]?.trim() || "";
  const rest = parts.slice(1).join(" @ ");
  const dashParts = rest.split(" — ");
  const school = dashParts[0]?.trim() || rest;
  const extra = dashParts.slice(1).join(" — ");
  const extraParts = extra.split(" | ");
  const loc = extraParts.slice(0, -1).join(" | ");
  const dates = extraParts[extraParts.length - 1] || "";
  return `<div class="edu-block"><div class="edu-degree">${escapeHtml(degree)}</div><div class="edu-school">${escapeHtml(school)}</div>${dates ? `<div class="edu-dates">${escapeHtml(dates)}</div>` : ""}${loc ? `<div class="edu-loc">${escapeHtml(loc)}</div>` : ""}</div>`;
};

export const buildResumeHtml = (
  data: GeneratedResumeData,
  header: HeaderData,
): string => {
  const skillsHtml = buildSkillsHtml(data.skills_section || []);
  const experienceHtml = buildExperienceHtml(data.experience || []);
  const productsHtml = buildProductsHtml(data.products || []);
  const projectsHtml = buildProjectsHtml(data.projects || []);
  const leadershipHtml = buildExperienceHtml(data.leadership || []);
  const certHtml = data.certifications?.length
    ? data.certifications.map(c => `<div class="cert-item">• ${escapeHtml(c)}</div>`).join("\n")
    : "";
  const awardsHtml = data.awards?.length
    ? data.awards.map(a => `<div class="cert-item">${escapeHtml(a)}</div>`).join("\n")
    : "";

  const sections: string[] = [];

  if (data.professional_summary) {
    sections.push(`<div class="section"><div class="section-title">Professional Summary</div><div class="summary-text">${escapeHtml(data.professional_summary)}</div></div>`);
  }
  if (data.education?.length) {
    sections.push(`<div class="section"><div class="section-title">Education</div>${data.education.map(renderEducation).join("\n")}</div>`);
  }
  if (experienceHtml) {
    sections.push(`<div class="section"><div class="section-title">Experience</div>${experienceHtml}</div>`);
  }
  if (productsHtml) {
    sections.push(`<div class="section"><div class="section-title">Products &amp; Ventures</div>${productsHtml}</div>`);
  }
  if (projectsHtml) {
    sections.push(`<div class="section"><div class="section-title">Projects</div>${projectsHtml}</div>`);
  }
  if (leadershipHtml) {
    sections.push(`<div class="section"><div class="section-title">Leadership</div>${leadershipHtml}</div>`);
  }
  if (skillsHtml) {
    sections.push(`<div class="section"><div class="section-title">Skills</div>${skillsHtml}</div>`);
  }
  if (certHtml) {
    sections.push(`<div class="section"><div class="section-title">Certifications</div>${certHtml}</div>`);
  }
  if (awardsHtml) {
    sections.push(`<div class="section"><div class="section-title">Awards</div>${awardsHtml}</div>`);
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', 'Helvetica', 'Arial', sans-serif; font-size: 9px; line-height: 1.15; color: #1E2A3A; background: #fff; padding: 0.5in; max-width: 100%; }
  .header { text-align: center; margin-bottom: 8px; }
  .header h1 { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; text-transform: uppercase; color: #1E2A3A; margin-bottom: 3px; }
  .contact { font-size: 8px; color: #1E2A3A; font-weight: 500; display: flex; flex-wrap: wrap; justify-content: center; gap: 1px 5px; }
  .contact a { color: #2563eb; text-decoration: underline; }
  .section { margin-bottom: 5px; }
  .section-title { font-size: 8.5px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #1E2A3A; padding-bottom: 1px; margin-bottom: 3px; color: #1E2A3A; }
  .summary-text { font-size: 8px; line-height: 1.45; color: #1E2A3A; text-align: justify; }
  .item { margin-bottom: 4px; }
  .item-header { font-weight: 700; font-size: 8.5px; color: #1E2A3A; }
  .item-sub { font-size: 7.5px; color: #555; }
  .item ul { padding-left: 13px; margin-top: 1px; list-style: disc; }
  .item li { font-size: 7.5px; line-height: 1.35; margin-bottom: 1px; color: #1E2A3A; }
  .edu-block { margin-bottom: 3px; }
  .edu-degree { font-weight: 700; font-size: 8px; }
  .edu-school { font-size: 7.5px; }
  .edu-dates { font-size: 7px; color: #555; }
  .edu-loc { font-size: 7px; color: #555; }
  .skills-line { font-size: 7.5px; margin-bottom: 1px; }
  .cert-item { font-size: 7.5px; margin-bottom: 1px; color: #1E2A3A; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <div class="header">
    <h1>${escapeHtml(header.fullName)}</h1>
    <div class="contact">${buildContactHtml(header)}</div>
  </div>
  ${sections.join("\n")}
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
