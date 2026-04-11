import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp, wasEdited } from "@/utils/formatTimestamp";
import UndoToast from "./UndoToast";
import { MoreVertical } from "lucide-react";

interface ReflectionEntry {
  id: string;
  title: string | null;
  body: string;
  writing_prompt: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

const FALLBACK_PROMPTS = [
  "What are you grateful for that you haven't said aloud?",
  "What is the thing you keep avoiding?",
  "Where did you see grace today?",
  "What would you tell yourself one year from now?",
  "What scripture has stayed with you this week and why?",
];

const ReflectionsSection = ({ latestPrompt, stirPrompt, onStirConsumed }: { latestPrompt?: string; stirPrompt?: string | null; onStirConsumed?: () => void }) => {
  const [isWriting, setIsWriting] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<ReflectionEntry | null>(null);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ id: string; index: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOpenedStir = useRef(false);
  const queryClient = useQueryClient();

  const prompt = stirPrompt || latestPrompt || FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];

  // Auto-open writing mode when stirPrompt is provided
  useEffect(() => {
    if (stirPrompt && !hasOpenedStir.current && !isWriting) {
      hasOpenedStir.current = true;
      (async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data, error } = await supabase
          .from("reflection_entries")
          .insert({ user_id: user.id, body: "", writing_prompt: stirPrompt })
          .select()
          .single();
        if (error || !data) return;
        setCurrentEntry(data as unknown as ReflectionEntry);
        setBody("");
        setTitle("");
        setIsWriting(true);
        onStirConsumed?.();
      })();
    }
  }, [stirPrompt, isWriting, onStirConsumed]);

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["reflections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reflection_entries")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ReflectionEntry[];
    },
  });

  const autoSave = useCallback(async () => {
    if (!currentEntry?.id || !body.trim()) return;
    await supabase
      .from("reflection_entries")
      .update({ body, title: title || null })
      .eq("id", currentEntry.id);
  }, [currentEntry, body, title]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!isWriting || !currentEntry) return;
    saveTimerRef.current = setInterval(autoSave, 30000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [isWriting, currentEntry, autoSave]);

  const startNewEntry = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("reflection_entries")
      .insert({ user_id: user.id, body: "", writing_prompt: prompt })
      .select()
      .single();
    if (error) return;
    const entry = data as unknown as ReflectionEntry;
    setCurrentEntry(entry);
    setBody("");
    setTitle("");
    setIsWriting(true);
  };

  const openEntry = (entry: ReflectionEntry) => {
    setCurrentEntry(entry);
    setBody(entry.body);
    setTitle(entry.title || "");
    setIsWriting(true);
  };

  const closeWriting = async () => {
    await autoSave();
    setIsWriting(false);
    setCurrentEntry(null);
    queryClient.invalidateQueries({ queryKey: ["reflections"] });
  };

  const softDeleteEntry = async (entryId: string) => {
    setMenuOpenId(null);
    const idx = entries.findIndex((e) => e.id === entryId);
    // Optimistic removal
    queryClient.setQueryData(["reflections"], (old: ReflectionEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    // Set deleted_at
    await supabase
      .from("reflection_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId);
    setDeleteToast({ id: entryId, index: idx });
  };

  const undoDelete = async (entryId: string) => {
    await supabase
      .from("reflection_entries")
      .update({ deleted_at: null } as any)
      .eq("id", entryId);
    setDeleteToast(null);
    queryClient.invalidateQueries({ queryKey: ["reflections"] });
  };

  const deleteFromEditor = async () => {
    if (!currentEntry) return;
    const entryId = currentEntry.id;
    setIsWriting(false);
    setCurrentEntry(null);
    // Optimistic
    queryClient.setQueryData(["reflections"], (old: ReflectionEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    await supabase
      .from("reflection_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId);
    setDeleteToast({ id: entryId, index: 0 });
  };

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
          e.body.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  // Full-screen writing experience
  if (isWriting) {
    const edited = currentEntry ? wasEdited(currentEntry.created_at, currentEntry.updated_at) : false;
    return (
      <div className="fixed inset-0 z-40 bg-background flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={closeWriting}
            className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <div className="flex items-center gap-4">
            <button
              onClick={autoSave}
              className="text-sm font-body text-gold hover:text-gold-dark transition-colors"
            >
              Save
            </button>
            <div className="relative">
              <button
                onClick={() => setMenuOpenId(menuOpenId === "editor" ? null : "editor")}
                className="text-muted-foreground hover:text-foreground transition-colors p-1"
              >
                <MoreVertical size={16} />
              </button>
              {menuOpenId === "editor" && (
                <div className="absolute right-0 top-8 bg-card border border-border rounded-sm shadow-lg z-50 py-1 min-w-[160px]">
                  <button
                    onClick={deleteFromEditor}
                    className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors font-body"
                  >
                    Delete entry
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {currentEntry?.writing_prompt && (
            <p className="font-serif italic text-gold text-sm mb-4 leading-relaxed">
              "{currentEntry.writing_prompt}"
            </p>
          )}

          {currentEntry && (
            <div className="mb-4 space-y-0.5">
              <p className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60">
                Created {formatTimestamp(currentEntry.created_at)}
              </p>
              {edited && (
                <p className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60">
                  Last edited {formatTimestamp(currentEntry.updated_at)}
                </p>
              )}
            </div>
          )}

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (optional)"
            className="w-full bg-transparent text-lg font-serif text-foreground placeholder:text-muted-foreground/40 outline-none mb-4"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your reflection…"
            className="w-full flex-1 min-h-[60vh] bg-transparent text-base font-body text-foreground placeholder:text-muted-foreground/40 outline-none resize-none leading-relaxed"
            autoFocus
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={startNewEntry}
        className="w-full mb-6 py-4 border border-dashed border-gold/40 rounded-sm font-body text-sm text-gold hover:border-gold hover:bg-gold/5 transition-all"
      >
        Write today's reflection
      </button>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search reflections…"
        className="w-full bg-transparent border-b border-border pb-2 mb-8 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold transition-colors"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-muted-foreground">
            {search ? "No reflections found." : "No reflections yet."}
          </p>
          <p className="font-body text-sm text-muted-foreground/60 mt-2">
            Begin writing to capture what stirs within.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {filtered.map((entry) => {
            const edited = wasEdited(entry.created_at, entry.updated_at);
            return (
              <div key={entry.id} className="relative group">
                <button
                  onClick={() => openEntry(entry)}
                  className="w-full text-left pb-6 border-b border-border/50 last:border-none"
                >
                  {entry.title && (
                    <p className="font-serif text-base text-foreground">
                      {entry.title}
                    </p>
                  )}
                  <div className="mt-1 space-y-0.5">
                    <time className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60 uppercase block">
                      {formatTimestamp(entry.created_at)}
                    </time>
                    {edited && (
                      <p className="font-['EB_Garamond'] italic text-[9px] text-muted-foreground/50">
                        Edited {formatTimestamp(entry.updated_at)}
                      </p>
                    )}
                  </div>
                  <p className="font-body text-sm text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                    {entry.body}
                  </p>
                </button>
                {/* Three-dot menu */}
                <div className="absolute top-0 right-0">
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
                    <div className="absolute right-0 top-6 bg-card border border-border rounded-sm shadow-lg z-50 py-1 min-w-[140px]">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          softDeleteEntry(entry.id);
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-secondary/50 transition-colors font-body"
                      >
                        Delete entry
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteToast && (
        <UndoToast
          message="Entry deleted"
          onUndo={() => undoDelete(deleteToast.id)}
          onExpire={() => setDeleteToast(null)}
        />
      )}
    </div>
  );
};

export default ReflectionsSection;
