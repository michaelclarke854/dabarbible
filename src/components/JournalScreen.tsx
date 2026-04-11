import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface JournalEntry {
  id: string;
  question: string;
  response: string;
  scripture_refs: string[];
  created_at: string;
}

const JournalScreen = () => {
  const [search, setSearch] = useState("");

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ["journal"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wisdom_sessions")
        .select("*")
        .eq("saved_to_journal", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as JournalEntry[];
    },
  });

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.question.toLowerCase().includes(search.toLowerCase()) ||
          e.response.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-10 max-w-2xl mx-auto">
      <h2 className="font-serif text-2xl text-foreground tracking-wide mb-6">
        Journal
      </h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search your reflections…"
        className="w-full bg-transparent border-b border-border pb-2 mb-8 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold transition-colors"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="font-serif text-lg text-muted-foreground">
            {search ? "No reflections found." : "Your journal is empty."}
          </p>
          <p className="font-body text-sm text-muted-foreground/60 mt-2">
            Seek wisdom and save your reflections here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {filtered.map((entry) => (
            <article key={entry.id} className="pb-10 border-b border-border/50 last:border-none">
              <time className="text-xs font-body text-muted-foreground tracking-wide uppercase">
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </time>
              <p className="font-body italic text-foreground/70 mt-3 mb-4 text-sm leading-relaxed">
                "{entry.question}"
              </p>
              <div className="font-serif text-base leading-relaxed text-foreground whitespace-pre-line">
                {entry.response}
              </div>
              {entry.scripture_refs?.length > 0 && (
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
    </div>
  );
};

export default JournalScreen;
