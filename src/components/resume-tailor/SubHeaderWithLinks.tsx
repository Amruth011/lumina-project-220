import React from "react";

interface Props {
  heading: string;
  content: string;
  fontSizes: { subHeader: string; body: string };
}

export function SubHeaderWithLinks({ heading, content, fontSizes }: Props) {
  const headingParts = (heading || "").split(/\s+[-–—]\s+/);
  const title = headingParts[0] || "Title";
  const techStack = headingParts.slice(1).join(" • ");

  const rawContent = content || "";
  const urlRegex = /(https?:\/\/[^\s|]+|github\.com\/[^\s|]+|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\/[^\s|]*|[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
  const rawUrls = rawContent.match(urlRegex) || [];
  const urls: string[] = [];
  const seen = new Set<string>();
  rawUrls.forEach(u => {
    const norm = u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "").trim();
    if (norm && !seen.has(norm)) { seen.add(norm); urls.push(u.trim()); }
  });

  let statusOrYear = rawContent;
  urls.forEach(url => { statusOrYear = statusOrYear.split(url).join(""); });
  statusOrYear = statusOrYear.replace(/[|\s-–—]+/g, " ").trim();
  if (statusOrYear.toLowerCase() === "live" || statusOrYear.toLowerCase() === "live |" || statusOrYear.toLowerCase() === "| live") statusOrYear = "";
  if (statusOrYear === "|" || statusOrYear === "-" || statusOrYear === "–" || statusOrYear === "—") statusOrYear = "";

  return (
    <div className="flex justify-between items-start font-bold !font-inherit" style={{ fontSize: fontSizes.subHeader, fontFamily: 'inherit', width: '100%' }}>
      <span className="flex-1 min-w-0 !font-inherit" style={{ fontFamily: 'inherit' }}>
        {title?.trim()}
        {techStack && (
          <span className="font-normal opacity-60 !font-inherit" style={{ fontFamily: 'inherit' }}>
            {" "}• {techStack.replace(/^\s*•\s*/, "").trim()}
          </span>
        )}
      </span>
      <span className="flex-shrink-0 text-right ml-4 font-normal !font-inherit flex items-center gap-1.5" style={{ fontSize: fontSizes.body, fontFamily: 'inherit' }}>
        {statusOrYear && (
          <span className="opacity-70 font-semibold mr-1">{statusOrYear}</span>
        )}
        {urls.map((url, idx) => {
          const href = url.startsWith("http") ? url : `https://${url}`;
          const isGithub = url.toLowerCase().includes("github.com");
          const label = isGithub ? "GitHub" : "Live Link";
          return (
            <React.Fragment key={idx}>
              {(statusOrYear || idx > 0) && <span className="opacity-40 select-none mx-1">•</span>}
              <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#1E2A3A] font-bold hover:underline hover:text-lumina-teal transition-all" style={{ fontFamily: 'inherit' }}>
                {label}
              </a>
            </React.Fragment>
          );
        })}
      </span>
    </div>
  );
}
