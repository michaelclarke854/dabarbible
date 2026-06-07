import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import ReactMarkdown from "react-markdown";
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
      // Strip any markdown emphasis markers so the surfaced question is clean
      return blocks[i].content.trim().replace(/^\*+|\*+$/g, "").trim();
    }
  }
  return null;
}

const SECTION_LABEL_RE = /^\*\*\s*([A-Z][A-Z0-9\s'’&-]+?)\s*:?\s*\*\*\s*:?\s*([\s\S]*)$/;

const MARKDOWN_COMPONENTS = {
  p: ({ node, ...props }: any) => (
    <p
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 17,
        lineHeight: 1.65,
        color: "#f7f2e8",
        fontWeight: 400,
        margin: 0,
      }}
      {...props}
    />
  ),
  strong: ({ node, ...props }: any) => (
    <strong style={{ fontWeight: 500, color: "#f7f2e8" }} {...props} />
  ),
  em: ({ node, ...props }: any) => (
    <em style={{ fontStyle: "italic" }} {...props} />
  ),
  a: ({ node, ...props }: any) => (
    <a style={{ color: "#b8913a", textDecoration: "underline" }} {...props} />
  ),
};

export const TextBlock = ({ content }: { content: string }) => {
  const trimmed = content.trim();
  const match = trimmed.match(SECTION_LABEL_RE);

  if (match) {
    const label = match[1].trim();
    const rest = match[2].trim();
    return (
      <div>
        <p
          className="font-serif text-gold uppercase mb-2"
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            letterSpacing: "0.22em",
            fontWeight: 500,
            color: "#b8913a",
          }}
        >
          {label}
        </p>
        {rest && (
          <ReactMarkdown components={MARKDOWN_COMPONENTS}>{rest}</ReactMarkdown>
        )}
      </div>
    );
  }

  return <ReactMarkdown components={MARKDOWN_COMPONENTS}>{trimmed}</ReactMarkdown>;
};

export const ScriptureCard = ({
  block,
  onScriptureRef,
  userId,
  profileDefault,
  onDefaultChanged,
}: {
  block: ContentBlock;
  onScriptureRef?: (ref: string, version?: string) => void;
  userId?: string;
  profileDefault?: string;
  onDefaultChanged?: (version: string) => void;
}) => {
  const [displayText, setDisplayText] = useState(block.verseText || "");
  const [activeVersion, setActiveVersion] = useState(profileDefault || "KJV");
  const shouldReduceMotion = useReducedMotion();
  const motionProps = shouldReduceMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 12, boxShadow: "0 0 0 0 rgba(196,151,58,0)" },
        animate: {
          opacity: 1,
          y: 0,
          boxShadow: [
            "0 0 0 0 rgba(196,151,58,0)",
            "0 0 28px 2px rgba(196,151,58,0.22)",
            "0 0 0 0 rgba(196,151,58,0)",
          ],
        },
        transition: {
          duration: 0.6,
          ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
          boxShadow: { duration: 1.8, times: [0, 0.45, 1], ease: "easeOut" as const },
        },
      };

  return (
    <motion.div
      {...motionProps}
      className="dabar-glass my-6 pl-4 border-l-4 border-gold bg-scripture-card rounded-sm p-4"
    >
      <p className="font-serif text-base md:text-lg leading-relaxed text-foreground/90 italic">
        "{displayText}"
      </p>
      <button
        onClick={() => block.reference && onScriptureRef?.(block.reference, activeVersion)}
        className="text-gold scripture-italic text-sm tracking-wide mt-2 hover:text-gold-light transition-colors cursor-pointer inline-flex items-center gap-1"
      >
        — {block.reference} ↗
      </button>
      <ScriptureVersionPills
        profileDefault={(profileDefault || "KJV") as any}
        reference={block.reference || ""}
        initialText={block.verseText || ""}
        userId={userId}
        onVersionChange={(version, text) => {
          setDisplayText(text);
          setActiveVersion(version);
        }}
        onDefaultChanged={onDefaultChanged as any}
      />
    </motion.div>
  );
};
