import { FileDown } from 'lucide-react';
import { Section } from '@/lib/hooks/useChat';
import { SourceBlock } from '@/lib/types';
import jsPDF from 'jspdf';

const ExportPdf = ({
  section,
  parsedMessage,
}: {
  section: Section;
  parsedMessage: string;
}) => {
  const handleExport = () => {
    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 14;
    let y = 16;

    // Header
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 30, 30);
    const queryLines = doc.splitTextToSize(section.message.query, pageWidth - margin * 2);
    for (const line of queryLines) {
      if (y > pageHeight - 20) { doc.addPage(); y = 16; }
      doc.text(line, margin, y);
      y += 6;
    }
    y += 4;
    doc.setDrawColor(220);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Body
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    const bodyLines = doc.splitTextToSize(parsedMessage, pageWidth - margin * 2);
    for (const line of bodyLines) {
      if (y > pageHeight - 16) { doc.addPage(); y = 16; }
      doc.text(line, margin, y);
      y += 5.5;
    }

    // Sources
    const sourceBlock = section.message.responseBlocks.find(
      (b) => b.type === 'source',
    ) as SourceBlock | undefined;

    if (sourceBlock && sourceBlock.data && sourceBlock.data.length > 0) {
      y += 6;
      if (y > pageHeight - 20) { doc.addPage(); y = 16; }
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(80, 80, 80);
      doc.text('Sources:', margin, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      sourceBlock.data.forEach((src: any, i: number) => {
        const url = src.metadata?.url?.startsWith('file_id://')
          ? src.metadata?.fileName || 'Uploaded File'
          : src.metadata?.url || '';
        const srcLine = `[${i + 1}] ${url}`;
        const urlLines = doc.splitTextToSize(srcLine, pageWidth - margin * 2 - 4);
        for (const l of urlLines) {
          if (y > pageHeight - 12) { doc.addPage(); y = 16; }
          doc.text(l, margin + 2, y);
          y += 4.5;
        }
      });
    }

    // Footer
    const date = new Date().toLocaleDateString();
    doc.setFontSize(8);
    doc.setTextColor(160);
    doc.text(`Exported from Perplexica · ${date}`, margin, pageHeight - 8);

    const slug = section.message.query.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`${slug}.pdf`);
  };

  return (
    <button
      onClick={handleExport}
      aria-label="Export as PDF"
      className="p-2 text-black/70 dark:text-white/70 rounded-full hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors duration-200 hover:text-black dark:hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-dark-primary"
    >
      <FileDown size={16} aria-hidden="true" />
    </button>
  );
};

export default ExportPdf;
