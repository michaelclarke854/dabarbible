import { useState } from "react";
import ScriptureVersionPills from "./ScriptureVersionPills";

export interface ContentBlock {
  type: "text" | "scripture";
  content: string;
  reference?: string;
  verseText?: string;
}

export function parseResponse(response: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  const regex = /\[SCRIPTURE\]\s*\nreference:\s*(.+)\ntext:\s*(.+)\n\[\/SCRIPTURE\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(response)) !== null) {
    const before = response.slice(lastIndex, match.index).trim();
    if (before) {
      before.split("\n").filter((l) => l.trim()).forEach((line) => {
        blocks.push({ type: "text", content: line.trim() });
      });
    }
    blocks.push({
      type: "scripture",
      content: match[0],
      reference: match[1].trim(),
      verseText: match[2].trim(),
    });
    lastIndex = match.index + match[0].length;
  }

  const remaining = response.slice(lastIndex).trim();
  if (remaining) {
    remaining.split("\n").filter((l) => l.trim()).forEach((line) => {
      blocks.push({ type: "text", content: line.trim() });
    });
  }

  return blocks;
}

export function extractThresholdQuestion(blocks: ContentBlock[]): string | null {
  for (let i = blocks.length - 1; i >= 0; i--) {
    if (blocks[i].type === "text" && blocks[i].content.trim().endsWith("?")) {
      return blocks[i].content.trim();
    }
  }
  return null;
}

export const ScriptureCard = ({
  block,
  onScriptureRef,
}: {
  block: ContentBlock;
  onScriptureRef?: (ref: string) => void;
}) => {
  const [displayText, setDisplayText] = useState(block.verseText || "");

  return (
    <div className="my-6 pl-4 border-l-4 border-gold bg-scripture-card rounded-sm p-4">
      <p className="font-serif text-base md:text-lg leading-relaxed text-foreground/90 italic">
        "{displayText}"
      </p>
      <button
        onClick={() => block.reference && onScriptureRef?.(block.reference)}
        className="text-gold font-serif text-sm tracking-wide mt-2 hover:text-gold-light transition-colors cursor-pointer inline-flex items-center gap-1"
      >
        — {block.reference} ↗
      </button>
      <ScriptureVersionPills
        reference={block.reference || ""}
        initialText={block.verseText || ""}
        onVersionChange={(_version, text) => setDisplayText(text)}
      />
    </div>
  );
};
