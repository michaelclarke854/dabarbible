import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp, wasEdited } from "@/utils/formatTimestamp";
import { toast } from "sonner";
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

type SaveStatus = "idle" | "saving" | "saved" | "error";

const ReflectionsSection = ({ latestPrompt, stirPrompt, onStirConsumed }: { latestPrompt?: string; stirPrompt?: string | null; onStirConsumed?: () => void }) => {
  const [isWriting, setIsWriting] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<ReflectionEntry | null>(null);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [deleteToast, setDeleteToast] = useState<{ id: string; index: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasOpenedStir = useRef(false);
  const isClosingRef = useRef(false);
  const bodyRef = useRef(body);
  const titleRef = useRef(title);
  const queryClient = useQueryClient();

  useEffect(() => { bodyRef.current = body; }, [body]);
  useEffect(() => { titleRef.current = title; }, [title]);

  const prompt = stirPrompt || latestPrompt || FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];

  // Auto-open writing mode when stirPrompt is provided — defer DB row until first keystroke
  useEffect(() => {
    if (stirPrompt && !hasOpenedStir.current && !isWriting) {
      hasOpenedStir.current = true;
      setCurrentEntry(null);
      setActivePrompt(stirPrompt);
      setBody("");
      setTitle("");
      setIsWriting(true);
      onStirConsumed?.();
    }
  }, [stirPrompt, isWriting, onStirConsumed]);

  const { data: entries = [], isLoading, error } = useQuery({
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

  // Save: creates row on first keystroke, updates thereafter. Returns the entry.
  const persist = useCallback(async (): Promise<ReflectionEntry | null> => {
    const currentBody = bodyRef.current;
    const currentTitle = titleRef.current;
    if (!currentBody.trim() && !currentTitle.trim()) return currentEntry;

    setSaveStatus("saving");
    try {
      if (!currentEntry) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not signed in");
        const { data, error } = await supabase
          .from("reflection_entries")
          .insert({
            user_id: user.id,
            body: currentBody,
            title: currentTitle || null,
            writing_prompt: activePrompt,
          })
          .select()
          .single();
        if (error || !data) throw error;
        const entry = data as unknown as ReflectionEntry;
        setCurrentEntry(entry);
        setSaveStatus("saved");
        return entry;
      } else {
        const { error } = await supabase
          .from("reflection_entries")
          .update({ body: currentBody, title: currentTitle || null })
          .eq("id", currentEntry.id);
        if (error) throw error;
        setSaveStatus("saved");
        return currentEntry;
      }
    } catch (e) {
      console.error("Reflection save failed:", e);
      setSaveStatus("error");
      toast.error("Couldn't save. We'll keep trying.");
      return null;
    }
  }, [currentEntry, activePrompt]);

  // Debounced save on change
  useEffect(() => {
    if (!isWriting) return;
    if (!body && !title) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { persist(); }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [body, title, isWriting, persist]);

  // 10s autosave fallback
  useEffect(() => {
    if (!isWriting) return;
    saveTimerRef.current = setInterval(() => { persist(); }, 10000);
    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current);
    };
  }, [isWriting, persist]);

  // Save on tab hide / page unload
  useEffect(() => {
    if (!isWriting) return;
    const handler = () => { persist(); };
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("beforeunload", handler);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("beforeunload", handler);
    };
  }, [isWriting, persist]);

  const startNewEntry = () => {
    setCurrentEntry(null);
    setActivePrompt(prompt);
    setBody("");
    setTitle("");
    setSaveStatus("idle");
    setIsWriting(true);
  };

  const openEntry = (entry: ReflectionEntry) => {
    setCurrentEntry(entry);
    setActivePrompt(entry.writing_prompt);
    setBody(entry.body);
    setTitle(entry.title || "");
    setSaveStatus("idle");
    setIsWriting(true);
  };

  const closeWriting = async () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;
    try {
      await persist();
    } finally {
      setIsWriting(false);
      setCurrentEntry(null);
      setActivePrompt(null);
      setSaveStatus("idle");
      isClosingRef.current = false;
      queryClient.invalidateQueries({ queryKey: ["reflections"] });
    }
  };

  const softDeleteEntry = async (entryId: string) => {
    setMenuOpenId(null);
    const idx = entries.findIndex((e) => e.id === entryId);
    const previous = queryClient.getQueryData<ReflectionEntry[]>(["reflections"]);
    queryClient.setQueryData(["reflections"], (old: ReflectionEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    const { error } = await supabase
      .from("reflection_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) {
      if (previous) queryClient.setQueryData(["reflections"], previous);
      toast.error("Couldn't delete. Try again.");
      return;
    }
    setDeleteToast({ id: entryId, index: idx });
  };

  const undoDelete = async (entryId: string) => {
    const { error } = await supabase
      .from("reflection_entries")
      .update({ deleted_at: null } as any)
      .eq("id", entryId);
    if (error) {
      toast.error("Couldn't restore entry. Try again.");
      return;
    }
    setDeleteToast(null);
    queryClient.invalidateQueries({ queryKey: ["reflections"] });
  };

  const deleteFromEditor = async () => {
    if (!currentEntry) {
      // No row exists yet — just close
      setIsWriting(false);
      setCurrentEntry(null);
      setActivePrompt(null);
      return;
    }
    const entryId = currentEntry.id;
    setIsWriting(false);
    setCurrentEntry(null);
    setActivePrompt(null);
    const previous = queryClient.getQueryData<ReflectionEntry[]>(["reflections"]);
    queryClient.setQueryData(["reflections"], (old: ReflectionEntry[] | undefined) =>
      (old || []).filter((e) => e.id !== entryId)
    );
    const { error } = await supabase
      .from("reflection_entries")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", entryId);
    if (error) {
      if (previous) queryClient.setQueryData(["reflections"], previous);
      toast.error("Couldn't delete. Try again.");
      return;
    }
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
    const statusLabel =
      saveStatus === "saving" ? "Saving…" :
      saveStatus === "saved" ? "Saved" :
      saveStatus === "error" ? "Retrying…" :
      "";

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
            {statusLabel && (
              <span className={`text-[11px] font-body tracking-wide ${
                saveStatus === "error" ? "text-destructive" : "text-muted-foreground"
              }`}>
                {statusLabel}
              </span>
            )}
            <button
              onClick={() => persist()}
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

        <div
          className="flex-1 px-6 pb-6 overflow-y-auto"
          onBlur={() => persist()}
        >
          {activePrompt && (
            <p className="font-serif italic text-gold text-sm mb-4 leading-relaxed">
              "{activePrompt}"
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
      ) : error ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-muted-foreground">Couldn't load reflections.</p>
          <p className="font-body text-sm text-muted-foreground/60 mt-2">
            Check your connection and try again.
          </p>
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
