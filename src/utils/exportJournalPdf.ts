import jsPDF from "jspdf";

export interface JournalPdfEntry {
  question: string;
  response: string;
  scripture_refs?: string[] | null;
  created_at: string;
}

interface ExportOptions {
  entries: JournalPdfEntry[];
  searchTerm?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Render the user's saved Journal entries to a multi-page PDF and trigger
 * a download. Designed for offline reading: serif body, generous spacing,
 * scripture refs in the gold accent color.
 */
export function exportJournalToPdf({ entries, searchTerm }: ExportOptions): void {
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

  // ── Title page header ──
  doc.setFont("times", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15);
  doc.text("DABAR Journal", margin, y);
  y += 26;

  doc.setFont("helvetica", "italic");
  doc.setFontSize(10);
  doc.setTextColor(110);
  const subtitleParts = [
    `${entries.length} entr${entries.length === 1 ? "y" : "ies"}`,
    `Exported ${new Date().toLocaleDateString()}`,
  ];
  if (searchTerm) subtitleParts.push(`Filter: "${searchTerm}"`);
  doc.text(subtitleParts.join("  ·  "), margin, y);
  y += 14;

  // Divider
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  if (entries.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(11);
    doc.setTextColor(120);
    doc.text("No saved wisdom to export.", margin, y);
  }

  // ── Each entry ──
  entries.forEach((entry, idx) => {
    // Date
    ensureSpace(14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(160, 120, 50); // gold accent
    doc.text(formatDate(entry.created_at).toUpperCase(), margin, y);
    y += 14;

    // Question (italic serif)
    doc.setFont("times", "italic");
    doc.setFontSize(12);
    doc.setTextColor(70);
    const questionLines = doc.splitTextToSize(`"${entry.question ?? ""}"`, maxWidth);
    questionLines.forEach((line: string) => {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 16;
    });
    y += 6;

    // Response body
    doc.setFont("times", "normal");
    doc.setFontSize(12);
    doc.setTextColor(20);
    const bodyLines = doc.splitTextToSize(entry.response ?? "", maxWidth);
    bodyLines.forEach((line: string) => {
      ensureSpace(16);
      doc.text(line, margin, y);
      y += 16;
    });

    // Scripture refs
    if (entry.scripture_refs && entry.scripture_refs.length > 0) {
      y += 6;
      doc.setFont("times", "italic");
      doc.setFontSize(10);
      doc.setTextColor(160, 120, 50);
      const refsLine = `— ${entry.scripture_refs.join("  ·  ")}`;
      const refLines = doc.splitTextToSize(refsLine, maxWidth);
      refLines.forEach((line: string) => {
        ensureSpace(14);
        doc.text(line, margin, y);
        y += 14;
      });
    }

    // Separator between entries (not after last)
    if (idx < entries.length - 1) {
      y += 14;
      ensureSpace(20);
      doc.setDrawColor(220);
      doc.line(margin + 80, y, pageWidth - margin - 80, y);
      y += 20;
    }
  });

  // ── Footer on every page ──
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `DABAR Journal · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      pageHeight - 24,
      { align: "center" }
    );
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const suffix = searchTerm
    ? `-${searchTerm.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 30)}`
    : "";
  doc.save(`dabar-journal-${stamp}${suffix}.pdf`);
}