const fs = require('fs');
const path = require('path');

// Mock data matching the Resume structure
const editableHeader = {
  fullName: "Shashank Sharan",
  email: "shashank@lumina.ai",
  phone: "+1 (555) 019-2834",
  location: "Stanford, CA",
  linkedin: "linkedin.com/in/shashank",
  github: "github.com/shashank",
  portfolio: "shashank.dev"
};

const editableResume = {
  professional_summary: "Results-driven AI Engineer with 5+ years of experience designing and deploying scalable machine learning pipelines, full-stack web applications, and DevOps workflows. Expert in React, Python, Docker, and Supabase integration.",
  skills_section: [
    "Programming Languages: Python, JavaScript, TypeScript, SQL, Bash",
    "Infrastructure & Cloud: Docker, Kubernetes, AWS, Supabase, CI/CD",
    "AI & ML: PyTorch, TensorFlow, LLMs, LangChain, RAG",
    "Data Science: Pandas, NumPy, Scikit-Learn, Tableau"
  ],
  education: [
    "M.S. in Computer Science @ Stanford University - Stanford, CA | 2023 - 2025 | GPA: 3.9"
  ],
  experience: [
    {
      heading: "Senior AI Engineer @ Lumina AI - San Francisco, CA",
      content: "June 2025 - Present",
      bullets: [
        "Architected an intelligent ATS resume tailoring pipeline using Llama-3 and dynamic keyword vector analysis, reducing rendering latency by 45%.",
        "Engineered robust cloud-first identity profiles stored in public.profiles, establishing resilient browser-fallback caching mechanisms."
      ]
    }
  ],
  products: [
    {
      heading: "Lumina Career Radar — Python, PyTorch, React",
      content: "2026 | https://github.com/shashank/radar | Live: radar.lumina.ai",
      bullets: [
        "Launched a premium glassmorphic job intelligence radar matching candidate vault entities to 500+ classified skills categories."
      ]
    }
  ],
  projects: [
    {
      heading: "ATS Keyword Tailor Engine — TypeScript, Vite",
      content: "2025 | https://github.com/shashank/tailor",
      bullets: [
        "Implemented high-fidelity PDF and Word DOCX template rendering modules enforcing unified typography floor bounds."
      ]
    }
  ],
  leadership: [
    {
      heading: "Tech Lead @ Stanford AI Club",
      content: "2024 - 2025",
      bullets: [
        "Coordinated weekly research seminars covering deep LLM extraction and domain ontology classifications for 200+ members."
      ]
    }
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "Deep Learning Specialization - Coursera"
  ],
  awards: [
    "First Place - Stanford AI Hackathon 2024"
  ]
};

const nameFontSize = 18;
const headlineFontSize = 12;
const subHeadlineFontSize = 11;
const bodyFontSize = 10;
const fontFamily = "Inter";
const marginSize = 0.5;
const lineSpacing = 1.15;
const summaryLines = 3;
const experienceBullets = 3;
const productLines = 3;
const projectLines = 3;

const sectionOrder = ['SUMMARY', 'EDUCATION', 'EXPERIENCE', 'PRODUCTS', 'PROJECTS', 'LEADERSHIP', 'SKILLS', 'AWARDS', 'CERTIFICATIONS'];
const visibleSections = {
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

const getHtmlFont = (font) => {
  switch(font) {
    case "Inter": return "Inter, sans-serif";
    case "Roboto": return "Roboto, sans-serif";
    case "Merriweather": return "Merriweather, serif";
    case "Arial": return "Arial, sans-serif";
    default: return "Inter, sans-serif";
  }
};

const limitSummarySentences = (summaryText, maxSentences) => {
  if (!summaryText) return "";
  const sentences = summaryText.split(/\.\s+/).filter(Boolean);
  return sentences
    .slice(0, maxSentences)
    .map(s => s.trim() + (s.trim().endsWith(".") ? "" : "."))
    .join(" ");
};

const getModeOrLocation = (raw, fallback) => {
  if (!raw) return fallback;
  if (raw.toLowerCase().includes("remote")) return "Remote";
  if (raw.toLowerCase().includes("hybrid")) return "Hybrid";
  return raw || fallback;
};

const parseProductOrProjectContent = (content) => {
  const rawContent = content || "";
  const urlRegex = /(https?:\/\/[^\s|]+|github\.com\/[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const rawUrls = rawContent.match(urlRegex) || [];
  
  const urls = [];
  const seen = new Set();
  rawUrls.forEach(u => {
    const norm = u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").trim();
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      urls.push(u.trim());
    }
  });
  
  let statusOrYear = rawContent;
  urls.forEach(url => {
    statusOrYear = statusOrYear.split(url).join("");
  });
  statusOrYear = statusOrYear.replace(/[|\s-–—]+/g, " ").trim();
  if (statusOrYear.toLowerCase() === "live") statusOrYear = "";
  return { statusOrYear, urls };
};

// ── RENDER ENGINE ──
const headerMeta = [
  editableHeader.location,
  editableHeader.phone,
  editableHeader.email,
  editableHeader.linkedin ? `LinkedIn: ${editableHeader.linkedin.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : '',
  editableHeader.github ? `GitHub: ${editableHeader.github.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : '',
  editableHeader.portfolio ? `Portfolio: ${editableHeader.portfolio.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '')}` : ''
].filter(Boolean).join(" &nbsp;|&nbsp; ");

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
          <td style="text-align: left; font-weight: bold; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${school}</td>
          <td style="text-align: right; font-weight: bold; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-style: italic; font-size: ${bodyFontSize - 1}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${degree} ${metadata ? `| ${metadata}` : ''}</td>
          <td style="text-align: right; font-size: ${bodyFontSize - 1}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${loc}</td>
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
          <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${role}</td>
          <td style="text-align: right; font-weight: bold; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
        </tr>
        <tr>
          <td style="text-align: left; font-style: italic; font-size: ${bodyFontSize - 1}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${org}</td>
          <td style="text-align: right; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${location}</td>
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
          <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">
            ${title?.trim()} <span style="font-weight: normal; opacity: 0.6; font-family: ${getHtmlFont(fontFamily)};">| ${status?.trim()}</span>
          </td>
          <td style="text-align: right; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${productLinkHtml}</td>
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
          <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">
            ${title?.trim()} <span style="font-weight: normal; opacity: 0.6; font-family: ${getHtmlFont(fontFamily)};">| ${stack?.trim()}</span>
          </td>
          <td style="text-align: right; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${projectLinkHtml}</td>
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
          <td style="text-align: left; font-weight: bold; font-size: ${subHeadlineFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${lead.heading || "Role"}</td>
          <td style="text-align: right; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)};">${dateText}</td>
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
    case 'SUMMARY': bodyContentHtml += summaryHtml; break;
    case 'EDUCATION': bodyContentHtml += educationHtml; break;
    case 'EXPERIENCE': bodyContentHtml += experienceHtml; break;
    case 'PRODUCTS': bodyContentHtml += productsHtml; break;
    case 'PROJECTS': bodyContentHtml += projectsHtml; break;
    case 'LEADERSHIP': bodyContentHtml += leadershipHtml; break;
    case 'SKILLS': bodyContentHtml += skillsHtml; break;
    case 'CERTIFICATIONS': bodyContentHtml += certificationsHtml; break;
    case 'AWARDS': bodyContentHtml += awardsHtml; break;
  }
});

const docHtml = `
  <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head>
    <meta charset='utf-8'>
    <title>Resume - ${editableHeader.fullName}</title>
    <style>
      @page WordSection1 {
        size: A4;
        margin: ${marginSize === 0.5 ? "0.5in" : "1.0in"};
        mso-page-margin-top: ${marginSize === 0.5 ? "0.5in" : "1.0in"};
        mso-page-margin-bottom: ${marginSize === 0.5 ? "0.5in" : "1.0in"};
        mso-page-margin-left: ${marginSize === 0.5 ? "0.5in" : "1.0in"};
        mso-page-margin-right: ${marginSize === 0.5 ? "0.5in" : "1.0in"};
        mso-header-margin: 0.5in;
        mso-footer-margin: 0.5in;
      }
      div.WordSection1 {
        page: WordSection1;
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
        font-size: ${headlineFontSize}pt;
        font-weight: bold;
        text-transform: uppercase;
        color: #1E2A3A;
        margin: 0;
        padding: 0;
        letter-spacing: 1px;
      }
      p.summary-text {
        font-size: ${bodyFontSize}pt;
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
        font-size: ${bodyFontSize}pt;
        color: #1E2A3A;
        line-height: 1.25;
        text-align: justify;
        margin-bottom: 2px;
      }
      .skills-category {
        font-size: ${bodyFontSize}pt;
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
    <div class="WordSection1">
      <h1 style="font-size: ${nameFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)}; font-weight: bold; text-align: center; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 0.5px;">
        ${editableHeader.fullName || "Your Name"}
      </h1>
      <div style="text-align: center; font-size: ${bodyFontSize}pt; color: #1E2A3A; font-family: ${getHtmlFont(fontFamily)}; margin-bottom: 20px; line-height: 1.4;">
        ${headerMeta}
      </div>
      
      ${bodyContentHtml}
    </div>
  </body>
  </html>
`;

// Save the mock generated .doc file
const outputFilePath = path.join(__dirname, 'download_resume.doc');
fs.writeFileSync(outputFilePath, docHtml, 'utf8');
console.log(`Successfully generated and saved Word Doc at: ${outputFilePath}`);

// Run validations using whitespace-insensitive RegExp
console.log("\n--- RUNNING TYPOGRAPHY VALIDATIONS ON GENERATED WORD DOCUMENT ---");

const assertions = [
  { name: "Name Font Size Floor = 18pt", check: /font-size:\s*18pt/i.test(docHtml) },
  { name: "Headline Section Titles Floor = 12pt", check: /\.section-title\s*\{[^}]*font-size:\s*12pt/i.test(docHtml) },
  { name: "Role Heading Floor = 11pt", check: /font-size:\s*11pt/i.test(docHtml) },
  { name: "Body Summary Floor = 10pt", check: /p\.summary-text\s*\{[^}]*font-size:\s*10pt/i.test(docHtml) },
  { name: "Bullet Item Floor = 10pt", check: /li\.bullet-item\s*\{[^}]*font-size:\s*10pt/i.test(docHtml) },
  { name: "Skills Category Floor = 10pt", check: /\.skills-category\s*\{[^}]*font-size:\s*10pt/i.test(docHtml) },
  { name: "Education Right-Side Date = 10pt", check: /font-size:\s*10pt;[^>]*color:\s*#1E2A3A;[^>]*>[^<]*dateText/i.test(docHtml) || /font-size:\s*10pt[^>]*>[^<]*2023/i.test(docHtml) },
  { name: "Education Right-Side Location = 9pt", check: /font-size:\s*9pt;[^>]*color:\s*#1E2A3A;[^>]*>[^<]*Stanford/i.test(docHtml) },
  { name: "MSO Page Margins Defined in named Section block", check: /@page\s+WordSection1\s*\{/i.test(docHtml) && /mso-page-margin-top:\s*0\.5in/i.test(docHtml) },
  { name: "Word Page Setup Associated via Section Class Link", check: /div\.WordSection1\s*\{\s*page:\s*WordSection1;?\s*\}/i.test(docHtml) },
  { name: "Word Document wrapped in WordSection1 div", check: /<div\s+class="WordSection1">/i.test(docHtml) }
];

let allPassed = true;
for (const test of assertions) {
  if (test.check) {
    console.log(`\x1b[32m✅ [PASS] ${test.name}\x1b[0m`);
  } else {
    console.error(`\x1b[31m❌ [FAIL] ${test.name}\x1b[0m`);
    allPassed = false;
  }
}

if (allPassed) {
  console.log("\n\x1b[32m🎉 EXCELLENT! ALL WORD DOCUMENT TYPOGRAPHY TESTS SUCCESSFULLY PASSED IN PT UNITS!\x1b[0m\n");
} else {
  console.error("\n\x1b[31m❌ WORD DOCUMENT TYPOGRAPHY VERIFICATION FAILED.\x1b[0m\n");
  process.exit(1);
}
