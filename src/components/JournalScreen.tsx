import { useState, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp, wasEdited } from "@/utils/formatTimestamp";
import ReflectionsSection from "./ReflectionsSection";
import UndoToast from "./UndoToast";
import { MoreVertical } from "lucide-react";

interface WisdomEntry {
  id: string;
  question: string;
  response: string;
  scripture_refs: string[];
  created_at: string;
  saved_to_journal: boolean;
}

type JournalTab = "voice" | "reflections";

const JournalScreen = ({ stirPrompt, onStirConsumed }: { stirPrompt?: string | null; onStirConsumed?: () => void }) => {
  const [activeTab, setActiveTab] = useState<JournalTab>(stirPrompt ? "reflections" : "voice");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [unsaveToast, setUnsaveToast] = useState<{ id: string } | null>(null);
  const queryClient = useQueryClient();

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wisdom_sessions")
        .select("*")
        .eq("saved_to_journal", true)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as WisdomEntry[];
    },
  });

  const latestPrompt = entries.length > 0
    ? entries[0].response.split("\n").find((l) => l.trim().endsWith("?"))?.trim()
    : undefined;

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.question.toLowerCase().includes(search.toLowerCase()) ||
          e.response.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  const unsaveEntry = useCallback(async (entryId: string) => {
    setMenuOpenId(null);
    // Optimistic removal
    queryClient.setQueryData(["journal"], (old: WisdomEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    await supabase
      .from("wisdom_sessions")
      .update({ saved_to_journal: false })
      .eq("id", entryId);
    setUnsaveToast({ id: entryId });
  }, [queryClient]);

  const undoUnsave = useCallback(async (entryId: string) => {
    await supabase
      .from("wisdom_sessions")
      .update({ saved_to_journal: true })
      .eq("id", entryId);
    setUnsaveToast(null);
    queryClient.invalidateQueries({ queryKey: ["journal"] });
  }, [queryClient]);

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
      <h2 className="font-serif text-2xl text-foreground tracking-wide mb-6">
        Journal
      </h2>

      {/* Segmented Control */}
      <div className="flex mb-8 border-b border-border">
        <button
          onClick={() => setActiveTab("voice")}
          className={`flex-1 pb-3 text-center font-body text-xs tracking-widest uppercase transition-all ${
            activeTab === "voice"
              ? "text-gold border-b-2 border-gold"
              : "text-muted-foreground"
          }`}
        >
          From The Voice
        </button>
        <button
          onClick={() => setActiveTab("reflections")}
          className={`flex-1 pb-3 text-center font-body text-xs tracking-widest uppercase transition-all ${
            activeTab === "reflections"
              ? "text-gold border-b-2 border-gold"
              : "text-muted-foreground"
          }`}
        >
          My Reflections
        </button>
      </div>

      {activeTab === "reflections" ? (
        <ReflectionsSection latestPrompt={latestPrompt} stirPrompt={stirPrompt} onStirConsumed={onStirConsumed} />
      ) : (
        <>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved wisdom…"
            className="w-full bg-transparent border-b border-border pb-2 mb-8 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold transition-colors"
          />

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-serif text-lg text-muted-foreground">
                {search ? "No entries found." : "No saved wisdom yet."}
              </p>
              <p className="font-body text-sm text-muted-foreground/60 mt-2">
                Seek wisdom and save what speaks to you.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {filtered.map((entry) => (
                <article
                  key={entry.id}
                  className="pb-8 border-b border-border/50 last:border-none relative group"
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <time className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60 uppercase">
                        {formatTimestamp(entry.created_at)}
                      </time>
                      <p className="font-body italic text-foreground/70 mt-3 mb-3 text-sm leading-relaxed">
                        "{entry.question}"
                      </p>
                    </div>
                    {/* Three-dot menu */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === entry.id ? null : entry.id);
                        }}
                        className="p-1 text-muted-foreground/40 hover:text-muted-foreground transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical size={14} />
                      </button>
                      {menuOpenId === entry.id && (
                        <div className="absolute right-0 top-6 bg-card border border-border rounded-sm shadow-lg z-50 py-1 min-w-[180px]">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              unsaveEntry(entry.id);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors font-body"
                          >
                            Remove from journal
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <div
                    className={`font-serif text-base leading-relaxed text-foreground whitespace-pre-line transition-all cursor-pointer ${
                      expandedId === entry.id ? "" : "line-clamp-4"
                    }`}
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    {entry.response}
                  </div>
                  {expandedId !== entry.id && (
                    <p className="text-xs font-body text-gold mt-2">Tap to read full response</p>
                  )}
                  {entry.scripture_refs?.length > 0 && expandedId === entry.id && (
                    <div className="mt-4">
                      {entry.scripture_refs.map((ref, i) => (
                        <p key={i} className="text-gold font-serif text-xs tracking-wide">
                          — {ref}
                        </p>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

          {unsaveToast && (
            <UndoToast
              message="Removed from journal"
              onUndo={() => undoUnsave(unsaveToast.id)}
              onExpire={() => setUnsaveToast(null)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default JournalScreen;
