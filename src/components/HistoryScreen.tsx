import { useState, useMemo, useCallback } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatTimestamp } from "@/utils/formatTimestamp";
import { parseResponse, ScriptureCard } from "./WisdomResponseBlocks";

interface HistoryEntryData {
  id: string;
  question: string;
  response: string;
  scripture_refs: string[];
  created_at: string;
  saved_to_journal: boolean;
}

const HISTORY_PAGE_SIZE = 20;

const HistoryScreen = () => {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["history"],
    queryFn: async ({ pageParam }: { pageParam: string | undefined }) => {
      let query = supabase
        .from("wisdom_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(HISTORY_PAGE_SIZE + 1);

      if (pageParam) {
        query = query.lt("created_at", pageParam);
      }

      const { data, error } = await query;
      if (error) throw error;

      const items = data as HistoryEntryData[];
      const hasMore = items.length === HISTORY_PAGE_SIZE + 1;
      const pageItems = hasMore ? items.slice(0, -1) : items;

      return {
        items: pageItems,
        nextCursor: hasMore ? pageItems[pageItems.length - 1].created_at : undefined,
      };
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const entries = data?.pages.flatMap((p) => p.items) ?? [];

  const filtered = search.trim()
    ? entries.filter(
        (e) =>
          e.question.toLowerCase().includes(search.toLowerCase()) ||
          e.response.toLowerCase().includes(search.toLowerCase())
      )
    : entries;

  return (
    <div className="min-h-[calc(100vh-80px)] px-6 py-8 max-w-2xl mx-auto">
      <h2 className="font-serif text-2xl text-foreground tracking-wide mb-6">
        History
      </h2>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search past questions…"
        className="w-full bg-transparent border-b border-border pb-2 mb-8 text-sm font-body text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-gold transition-colors"
      />

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="w-3 h-3 rounded-full bg-gold animate-candle-glow" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-serif text-lg text-muted-foreground">
            {search ? "No entries found." : "No history yet."}
          </p>
          <p className="font-body text-sm text-muted-foreground/60 mt-2">
            Your past questions will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {filtered.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <HistoryEntry
                key={entry.id}
                entry={entry}
                isExpanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : entry.id)}
              />
            );
          })}
          {hasNextPage && !search.trim() && (
            <div className="text-center py-4">
              <button
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
                className="font-body text-sm text-gold hover:text-gold-dark transition-colors disabled:opacity-50"
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const HistoryEntry = ({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: HistoryEntryData;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  const blocks = useMemo(() => parseResponse(entry.response), [entry.response]);

  return (
    <article className="pb-8 border-b border-border/50 last:border-none">
      <div className="cursor-pointer" onClick={onToggle}>
        <time className="font-serif-display text-[10px] tracking-[0.08em] text-gold/60 uppercase">
          {formatTimestamp(entry.created_at)}
        </time>
        {entry.saved_to_journal && (
          <span className="ml-2 text-[9px] font-body text-gold/40 uppercase tracking-wider">
            Saved
          </span>
        )}
        <p className="font-body italic text-foreground/70 mt-3 mb-3 text-sm leading-relaxed">
          "{entry.question}"
        </p>
      </div>

      {isExpanded ? (
        <div className="space-y-4">
          {blocks.map((block, i) =>
            block.type === "scripture" ? (
              <ScriptureCard key={i} block={block} />
            ) : (
              <p key={i} className="font-serif text-base leading-relaxed text-foreground">
                {block.content}
              </p>
            )
          )}
        </div>
      ) : (
        <>
          <div className="font-serif text-base leading-relaxed text-foreground line-clamp-4">
            {blocks
              .filter((b) => b.type === "text")
              .slice(0, 2)
              .map((b) => b.content)
              .join(" ")}
          </div>
          <p className="text-xs font-body text-gold mt-2 cursor-pointer" onClick={onToggle}>
            Tap to read full response
          </p>
        </>
      )}
    </article>
  );
};

export default HistoryScreen;
