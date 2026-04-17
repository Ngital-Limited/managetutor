import { Fragment } from "react";

/**
 * Renders an AI-generated tutor overview that comes back as light markdown:
 *  - **bold** segments
 *  - "• " bullet lines
 *  - blank lines as paragraph breaks
 *
 * Outputs clean paragraphs and bullet lists — no raw asterisks.
 */
function renderInline(text: string, keyPrefix: string) {
  // Strip leading/trailing ** that wraps a whole sentence/paragraph
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={`${keyPrefix}-${i}`} className="font-semibold text-foreground">
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>;
  });
}

export function AiOverview({ text, className = "" }: { text: string; className?: string }) {
  if (!text) return null;

  // Split into blocks by blank lines
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className={`space-y-3 text-sm leading-relaxed text-foreground/90 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
        const isBulletBlock = lines.every((l) => l.startsWith("•") || l.startsWith("-") || l.startsWith("*"));

        if (isBulletBlock && lines.length > 0) {
          return (
            <ul key={bi} className="space-y-1.5 list-none pl-0">
              {lines.map((line, li) => {
                const clean = line.replace(/^[•\-*]\s*/, "");
                return (
                  <li key={li} className="flex gap-2">
                    <span className="text-primary mt-1 flex-shrink-0">•</span>
                    <span className="flex-1">{renderInline(clean, `${bi}-${li}`)}</span>
                  </li>
                );
              })}
            </ul>
          );
        }

        // Paragraph: join lines with spaces
        return (
          <p key={bi} className="leading-relaxed">
            {renderInline(lines.join(" "), `p-${bi}`)}
          </p>
        );
      })}
    </div>
  );
}

/** Plain-text version (no markdown), useful for snippets on cards. */
export function stripAiOverviewMarkdown(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/^\s*[•\-*]\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}
