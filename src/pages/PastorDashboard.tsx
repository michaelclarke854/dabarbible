import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  usePastorDashboard,
  CommunityTheme,
  PastorDraft,
  TimeRange,
} from "@/hooks/usePastorDashboard";
import { trackEvent } from "@/lib/trackEvent";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import jsPDF from "jspdf";

const THEME_LABELS: Record<string, string> = {
  forgiveness: "Forgiveness",
  grief: "Grief & Loss",
  purpose: "Purpose & Calling",
  doubt: "Doubt & Questions",
  prayer: "Prayer",
  relationships: "Relationships",
  fear: "Fear & Anxiety",
  faith: "Faith & Trust",
  identity: "Identity in Christ",
  hope: "Hope",
  scripture_understanding: "Understanding Scripture",
  worship: "Worship",
  family: "Family",
  healing: "Healing",
  anxiety: "Anxiety",
  salvation: "Salvation",
  service: "Service & Calling",
  other: "Other Topics",
};

export default function PastorDashboard() {
  const { user, isPastor, isHydrating } = useAuth();
  const navigate = useNavigate();
  const {
    data,
    drafts,
    loading,
    error,
    generating,
    currentDraft,
    setCurrentDraft,
    genError,
    generateMessage,
    archiveDraft,
    rotateShareToken,
    range,
    setRange,
    refresh,
  } = usePastorDashboard();

  const [selectedTheme, setSelectedTheme] = useState<CommunityTheme | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [fallbackShareUrl, setFallbackShareUrl] = useState<string | null>(null);

  if (isHydrating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    navigate("/");
    return null;
  }

  if (!isPastor) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-xl text-foreground tracking-wide">
          Pastor Dashboard
        </h1>
        <p className="font-body text-sm text-muted-foreground max-w-md">
          Activate the Pastor Dashboard from your Privacy & Data settings to begin.
        </p>
        <Button onClick={() => navigate("/")}>Back to DABAR</Button>
      </div>
    );
  }

  const maxCount = Math.max(
    ...(data?.themes.map((t) => t.question_count) ?? [1]),
    1
  );

  const handleSelectTheme = (theme: CommunityTheme) => {
    setSelectedTheme(theme);
    setCurrentDraft(null);
    trackEvent("pastor_theme_selected", {
      screen: "pastor_dashboard",
      metadata: { theme: theme.theme },
      userId: user.id,
    });
  };

  const handleGenerate = () => {
    if (!selectedTheme) return;
    trackEvent("pastor_message_generate_start", {
      screen: "pastor_dashboard",
      metadata: { theme: selectedTheme.theme },
      userId: user.id,
    });
    generateMessage(selectedTheme.theme, selectedTheme.question_count);
  };

  const handleCopy = async () => {
    if (!currentDraft) return;
    await navigator.clipboard.writeText(currentDraft.outline);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    trackEvent("pastor_message_copied", {
      screen: "pastor_dashboard",
      metadata: { draft_id: currentDraft.id },
      userId: user.id,
    });
    toast.success("Outline copied to clipboard.");
  };

  const handleDownloadPDF = () => {
    if (!currentDraft) return;
    const doc = new jsPDF({ unit: "pt", format: "letter" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 56;
    const maxWidth = pageWidth - margin * 2;
    let y = margin;

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    };

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(20);
    const titleLines = doc.splitTextToSize(currentDraft.title, maxWidth);
    titleLines.forEach((line: string) => {
      ensureSpace(26);
      doc.text(line, margin, y);
      y += 26;
    });
    y += 6;

    // Meta
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(110);
    const meta = `${THEME_LABELS[currentDraft.theme] ?? currentDraft.theme} · ${currentDraft.question_count} question${currentDraft.question_count !== 1 ? "s" : ""} · ${new Date(currentDraft.created_at).toLocaleDateString()}`;
    ensureSpace(16);
    doc.text(meta, margin, y);
    y += 18;

    // Scripture refs
    if (currentDraft.scripture_refs.length > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(160, 120, 50);
      const refs = currentDraft.scripture_refs.join("  ·  ");
      const refLines = doc.splitTextToSize(refs, maxWidth);
      refLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 14;
      });
      y += 8;
    }

    // Divider
    ensureSpace(12);
    doc.setDrawColor(200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 16;

    // Outline body
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(20);
    const bodyLines = doc.splitTextToSize(currentDraft.outline, maxWidth);
    bodyLines.forEach((line: string) => {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 16;
    });

    // Footer on every page
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(
        `DABAR · Pastor outline · Page ${i} of ${pageCount}`,
        pageWidth / 2,
        pageHeight - 24,
        { align: "center" }
      );
    }

    const safeTitle = currentDraft.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "sermon-outline";
    doc.save(`${safeTitle}.pdf`);

    trackEvent("pastor_message_pdf_downloaded", {
      screen: "pastor_dashboard",
      metadata: { draft_id: currentDraft.id },
      userId: user.id,
    });
    toast.success("PDF downloaded.");
  };

  const inviteLink = data?.community
    ? `${window.location.origin}/join/${data.community.invite_code}`
    : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 max-w-5xl mx-auto space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded-sm" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded-sm" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4">
        <p className="font-body text-sm text-destructive">{error}</p>
        <Button onClick={refresh}>Try again</Button>
      </div>
    );
  }

  if (!data?.community) {
    return (
      <div className="min-h-screen bg-background px-6 py-12 flex flex-col items-center justify-center gap-4 text-center max-w-md mx-auto">
        <h1 className="font-serif text-2xl text-foreground tracking-wide">
          Pastor Dashboard
        </h1>
        <p className="font-body text-sm text-muted-foreground">
          Set up your community to start seeing what your congregation is exploring.
        </p>
        <Button onClick={() => navigate("/pastor/setup")}>
          Set up my community →
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="font-serif text-2xl text-foreground tracking-wide">
            {data.community.name}
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            {data.member_count} member{data.member_count !== 1 ? "s" : ""} ·{" "}
            <button
              onClick={async () => {
                if (!inviteLink) return;
                await navigator.clipboard.writeText(inviteLink);
                toast.success("Invite link copied.");
              }}
              className="text-gold hover:underline"
            >
              Copy invite link
            </button>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh}>
          Refresh
        </Button>
      </header>

      {/* Empty state */}
      {data.themes.length === 0 && (
        <div className="border border-border rounded-sm p-8 text-center space-y-3">
          <h2 className="font-serif text-lg text-foreground tracking-wide">
            Your dashboard will fill as your community explores scripture
          </h2>
          <p className="font-body text-sm text-muted-foreground max-w-md mx-auto">
            When members use DABAR, you'll see the themes they're exploring here —
            without seeing individual questions.
          </p>
          {inviteLink && (
            <Button
              variant="outline"
              onClick={() =>
                navigator.clipboard
                  .writeText(inviteLink)
                  .then(() => toast.success("Invite link copied."))
              }
            >
              Copy invite link
            </Button>
          )}
        </div>
      )}

      {data.themes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left: Theme cards */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
                Top themes
              </h2>
              <div className="inline-flex rounded-sm border border-border overflow-hidden">
                {(["week", "month", "year"] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={`px-3 py-1 text-xs font-body capitalize transition-colors ${
                      range === r
                        ? "bg-gold/10 text-gold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r === "week" ? "This week" : r === "month" ? "This month" : "This year"}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              {data.themes.map((theme) => {
                const isSelected = selectedTheme?.theme === theme.theme;
                const barWidth = Math.round(
                  (theme.question_count / maxCount) * 100
                );
                return (
                  <button
                    key={theme.theme}
                    onClick={() => handleSelectTheme(theme)}
                    className={`w-full text-left p-3 rounded-sm border transition-all ${
                      isSelected
                        ? "border-gold bg-gold/5"
                        : "border-border bg-card hover:border-foreground/20"
                    }`}
                  >
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="font-body text-sm text-foreground">
                        {THEME_LABELS[theme.theme] ?? theme.theme}
                      </span>
                      <span className="font-body text-xs text-muted-foreground">
                        {theme.question_count} question
                        {theme.question_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gold transition-all"
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Message creator */}
          <div className="space-y-4">
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
              Message creator
            </h2>

            {!selectedTheme && !currentDraft && (
              <div className="border border-dashed border-border rounded-sm p-8 text-center">
                <p className="font-body text-sm text-muted-foreground">
                  Select a theme to generate a message outline
                </p>
              </div>
            )}

            {selectedTheme && !generating && !currentDraft && (
              <div className="border border-border rounded-sm p-6 space-y-4">
                <div className="space-y-1">
                  <p className="font-serif text-lg text-foreground tracking-wide">
                    {THEME_LABELS[selectedTheme.theme] ?? selectedTheme.theme}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {selectedTheme.question_count} questions exploring this theme
                  </p>
                </div>
                <Button onClick={handleGenerate} className="w-full">
                  Generate message outline
                </Button>
              </div>
            )}

            {generating && (
              <div className="border border-border rounded-sm p-6 space-y-3">
                <div className="h-4 bg-muted animate-pulse rounded-sm" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-5/6" />
                <div className="h-4 bg-muted animate-pulse rounded-sm w-4/6" />
                <p className="font-body text-xs text-muted-foreground italic pt-2">
                  Preparing your message outline...
                </p>
              </div>
            )}

            {genError && (
              <div className="border border-destructive/30 rounded-sm p-4 space-y-2">
                <p className="font-body text-sm text-destructive">{genError}</p>
                <Button variant="outline" size="sm" onClick={handleGenerate}>
                  Try again
                </Button>
              </div>
            )}

            {currentDraft && !generating && (
              <div className="border border-border rounded-sm p-6 space-y-4">
                <h3 className="font-serif text-lg text-foreground tracking-wide">
                  {currentDraft.title}
                </h3>
                {currentDraft.scripture_refs.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentDraft.scripture_refs.map((ref) => (
                      <span
                        key={ref}
                        className="text-xs font-body px-2 py-1 bg-gold/10 text-gold rounded-sm"
                      >
                        {ref}
                      </span>
                    ))}
                  </div>
                )}
                <pre className="font-body text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {currentDraft.outline}
                </pre>
                <div className="flex gap-2">
                  <Button onClick={handleCopy} variant="outline" className="flex-1">
                    {copied ? "Copied!" : "Copy outline"}
                  </Button>
                  <Button onClick={handleDownloadPDF} variant="outline" className="flex-1">
                    Download PDF
                  </Button>
                  {selectedTheme && (
                    <Button
                      onClick={handleGenerate}
                      variant="outline"
                      className="flex-1"
                    >
                      Regenerate
                    </Button>
                  )}
                </div>
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="font-serif text-xs text-gold uppercase tracking-widest">
                    Private share link
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    View-only link for your team. Anyone with the link can view; rotate to invalidate.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={async () => {
                        let token = currentDraft.share_token;
                        if (!token) {
                          token = await rotateShareToken(currentDraft.id);
                          if (!token) {
                            toast.error("Could not create share link.");
                            return;
                          }
                        }
                        const url = `${window.location.origin}/share/draft/${token}`;
                        try {
                          if (!navigator.clipboard?.writeText) {
                            throw new Error("Clipboard API unavailable");
                          }
                          await navigator.clipboard.writeText(url);
                          setShareCopied(true);
                          setFallbackShareUrl(null);
                          setTimeout(() => setShareCopied(false), 2000);
                          toast.success("Share link copied.");
                          trackEvent("pastor_share_link_copied", {
                            screen: "pastor_dashboard",
                            metadata: { draft_id: currentDraft.id },
                            userId: user.id,
                          });
                        } catch (err) {
                          setFallbackShareUrl(url);
                          toast.error(
                            "Couldn't copy automatically. Select the link below to copy it manually."
                          );
                          trackEvent("pastor_share_link_copy_failed", {
                            screen: "pastor_dashboard",
                            metadata: {
                              draft_id: currentDraft.id,
                              reason:
                                err instanceof Error ? err.message : "unknown",
                            },
                            userId: user.id,
                          });
                        }
                      }}
                    >
                      {shareCopied ? "Copied!" : "Copy share link"}
                    </Button>
                    <Button
                      variant="ghost"
                      className="flex-1"
                      disabled={rotating}
                      onClick={async () => {
                        setRotating(true);
                        const token = await rotateShareToken(currentDraft.id);
                        setRotating(false);
                        setFallbackShareUrl(null);
                        if (token) {
                          toast.success("Share link rotated. Old link no longer works.");
                          trackEvent("pastor_share_link_rotated", {
                            screen: "pastor_dashboard",
                            metadata: { draft_id: currentDraft.id },
                            userId: user.id,
                          });
                        } else {
                          toast.error("Could not rotate share link.");
                        }
                      }}
                    >
                      {rotating ? "Rotating..." : "Rotate link"}
                    </Button>
                  </div>
                  {fallbackShareUrl && (
                    <div className="space-y-1 pt-2">
                      <p className="font-body text-xs text-muted-foreground">
                        Tap and hold (or triple-click) to select, then copy:
                      </p>
                      <input
                        readOnly
                        value={fallbackShareUrl}
                        onFocus={(e) => e.currentTarget.select()}
                        onClick={(e) => e.currentTarget.select()}
                        className="w-full font-body text-xs bg-muted text-foreground px-2 py-2 rounded-sm border border-border select-all"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Saved drafts */}
      {drafts.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-sm text-gold uppercase tracking-widest">
              Saved outlines
            </h2>
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="text-xs font-body text-muted-foreground hover:text-foreground"
            >
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          </div>
          <div className="space-y-2">
            {drafts
              .filter((d) => (showArchived ? true : d.status !== "archived"))
              .map((draft: PastorDraft) => (
                <div
                  key={draft.id}
                  className="flex items-start justify-between gap-4 p-3 border border-border rounded-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-body text-sm text-foreground truncate">
                      {draft.title}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {THEME_LABELS[draft.theme] ?? draft.theme} ·{" "}
                      {new Date(draft.created_at).toLocaleDateString()}
                      {draft.status === "archived" && " · archived"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCurrentDraft(draft);
                        setSelectedTheme(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Open
                    </Button>
                    {draft.status !== "archived" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveDraft(draft.id)}
                      >
                        Archive
                      </Button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}