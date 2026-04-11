import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ReflectionEntry {
  id: string;
  title: string | null;
  body: string;
  writing_prompt: string | null;
  created_at: string;
  updated_at: string;
}

const FALLBACK_PROMPTS = [
  "What are you grateful for that you haven't said aloud?",
  "What is the thing you keep avoiding?",
  "Where did you see grace today?",
  "What would you tell yourself one year from now?",
  "What scripture has stayed with you this week and why?",
];

const ReflectionsSection = ({ latestPrompt }: { latestPrompt?: string }) => {
  const [isWriting, setIsWriting] = useState(false);
  const [currentEntry, setCurrentEntry] = useState<ReflectionEntry | null>(null);
  const [body, setBody] = useState("");
  const [title, setTitle] = useState("");
  const [search, setSearch] = useState("");
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const queryClient = useQueryClient();

  const prompt = latestPrompt || FALLBACK_PROMPTS[Math.floor(Math.random() * FALLBACK_PROMPTS.length)];

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["reflections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reflection_entries" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as ReflectionEntry[];
    },
  });

  const autoSave = useCallback(async () => {
    if (!currentEntry?.id || !body.trim()) return;
    await supabase
      .from("reflection_entries" as any)
      .update({ body, title: title || null } as any)
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
    const { data, error } = await supabase
      .from("reflection_entries" as any)
      .insert({ body: "", writing_prompt: prompt } as any)
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

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          (e.title || "").toLowerCase().includes(search.toLowerCase()) ||
          e.body.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  // Full-screen writing experience
  if (isWriting) {
    return (
      <div className="fixed inset-0 z-40 bg-parchment flex flex-col">
        <div className="flex items-center justify-between px-6 py-4">
          <button
            onClick={closeWriting}
            className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </button>
          <button
            onClick={autoSave}
            className="text-sm font-body text-gold hover:text-gold-dark transition-colors"
          >
            Save
          </button>
        </div>

        <div className="flex-1 px-6 pb-6 overflow-y-auto">
          {currentEntry?.writing_prompt && (
            <p className="font-serif italic text-gold text-sm mb-6 leading-relaxed">
              "{currentEntry.writing_prompt}"
            </p>
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
          {filtered.map((entry) => (
            <button
              key={entry.id}
              onClick={() => openEntry(entry)}
              className="w-full text-left pb-6 border-b border-border/50 last:border-none"
            >
              <time className="text-xs font-body text-muted-foreground tracking-wide uppercase">
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              {entry.title && (
                <p className="font-serif text-base text-foreground mt-1">
                  {entry.title}
                </p>
              )}
              <p className="font-body text-sm text-muted-foreground/70 mt-1 line-clamp-2 leading-relaxed">
                {entry.body}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReflectionsSection;
