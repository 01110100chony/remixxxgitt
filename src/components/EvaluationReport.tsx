import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import type { ProgramData } from "@/hooks/useProgram";
import type { EvaluationResult } from "@/lib/ppg-indicators";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface Props {
  data: ProgramData;
  result: EvaluationResult;
  byYear: { year: string; count: number }[];
  byResearcher: { name: string; artigos: number; orientacoes: number }[];
  byQualis: { name: string; value: number }[];
  byGender: { name: string; value: number }[];
}

const COLORS_HEX = ["#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#06b6d4"];

function drawBarChart(doc: jsPDF, data: { label: string; value: number }[], x: number, y: number, w: number, h: number, title: string) {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(title, x, y - 3);
  if (data.length === 0) return y + h;

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barW = Math.min(20, (w - 10) / data.length - 2);
  const chartH = h - 20;

  // Axes
  doc.setDrawColor(180); doc.setLineWidth(0.3);
  doc.line(x, y + chartH, x + w, y + chartH);
  doc.line(x, y, x, y + chartH);

  data.forEach((d, i) => {
    const bx = x + 15 + i * (barW + 4);
    const bh = (d.value / maxVal) * (chartH - 5);
    const by = y + chartH - bh;
    const ci = i % COLORS_HEX.length;
    const hex = COLORS_HEX[ci];
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    doc.setFillColor(r, g, b);
    doc.rect(bx, by, barW, bh, "F");
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
    doc.text(String(d.value), bx + barW / 2, by - 2, { align: "center" });
    doc.setFontSize(5);
    const label = d.label.length > 8 ? d.label.slice(0, 8) + ".." : d.label;
    doc.text(label, bx + barW / 2, y + chartH + 5, { align: "center" });
  });
  doc.setTextColor(0);
  return y + h + 5;
}

function drawRadarChart(doc: jsPDF, dimensions: { name: string; score: number }[], cx: number, cy: number, radius: number) {
  const n = dimensions.length;
  if (n < 3) return;
  const angleStep = (2 * Math.PI) / n;

  // Grid
  for (let level = 2; level <= 10; level += 2) {
    const r = (level / 10) * radius;
    doc.setDrawColor(220); doc.setLineWidth(0.2);
    for (let i = 0; i < n; i++) {
      const a1 = -Math.PI / 2 + i * angleStep;
      const a2 = -Math.PI / 2 + ((i + 1) % n) * angleStep;
      doc.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
    }
  }

  // Axes + labels
  for (let i = 0; i < n; i++) {
    const angle = -Math.PI / 2 + i * angleStep;
    doc.setDrawColor(200); doc.line(cx, cy, cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
    doc.setFontSize(7); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
    const lx = cx + (radius + 10) * Math.cos(angle);
    const ly = cy + (radius + 10) * Math.sin(angle);
    doc.text(dimensions[i].name, lx, ly, { align: "center" });
  }

  // Data polygon
  const points: [number, number][] = dimensions.map((d, i) => {
    const angle = -Math.PI / 2 + i * angleStep;
    const r = (d.score / 10) * radius;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  });
  doc.setDrawColor(59, 130, 246); doc.setLineWidth(1);
  doc.setFillColor(59, 130, 246);
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    doc.line(points[i][0], points[i][1], points[next][0], points[next][1]);
  }
  // Score values
  doc.setFontSize(7); doc.setFont("helvetica", "bold"); doc.setTextColor(59, 130, 246);
  points.forEach((p, i) => {
    doc.text(dimensions[i].score.toFixed(1), p[0], p[1] - 3, { align: "center" });
  });
  doc.setTextColor(0);
}

function drawPieChart(doc: jsPDF, data: { name: string; value: number }[], cx: number, cy: number, radius: number, title: string) {
  doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.setTextColor(0);
  doc.text(title, cx, cy - radius - 8, { align: "center" });
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) return;
  let startAngle = -Math.PI / 2;
  data.forEach((d, i) => {
    const sliceAngle = (d.value / total) * 2 * Math.PI;
    const hex = COLORS_HEX[i % COLORS_HEX.length];
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    // Draw as filled triangle segments
    doc.setFillColor(r, g, b);
    const steps = Math.max(8, Math.floor(sliceAngle * 20));
    for (let s = 0; s < steps; s++) {
      const a1 = startAngle + (s / steps) * sliceAngle;
      const a2 = startAngle + ((s + 1) / steps) * sliceAngle;
      doc.triangle(
        cx, cy,
        cx + radius * Math.cos(a1), cy + radius * Math.sin(a1),
        cx + radius * Math.cos(a2), cy + radius * Math.sin(a2), "F"
      );
    }
    // Label
    const midAngle = startAngle + sliceAngle / 2;
    const lx = cx + (radius + 12) * Math.cos(midAngle);
    const ly = cy + (radius + 12) * Math.sin(midAngle);
    doc.setFontSize(6); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
    doc.text(`${d.name} (${((d.value / total) * 100).toFixed(0)}%)`, lx, ly, { align: "center" });
    startAngle += sliceAngle;
  });
  doc.setTextColor(0);
}

const EvaluationReport = ({ data, result, byYear, byResearcher, byQualis, byGender }: Props) => {
  const generate = () => {
    const doc = new jsPDF("p", "mm", "a4");
    const pw = doc.internal.pageSize.getWidth();
    const margin = 15;
    let y = 20;

    const addHeader = (text: string) => {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.setTextColor(59, 130, 246);
      doc.text(text, margin, y); y += 8;
      doc.setTextColor(0);
    };

    const addText = (text: string) => {
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(60);
      const lines = doc.splitTextToSize(text, pw - 2 * margin);
      if (y + lines.length * 4 > 280) { doc.addPage(); y = 20; }
      doc.text(lines, margin, y); y += lines.length * 4 + 3;
      doc.setTextColor(0);
    };

    // Title page
    doc.setFontSize(22); doc.setFont("helvetica", "bold"); doc.setTextColor(59, 130, 246);
    doc.text("Relatório de Avaliação PPG", pw / 2, 50, { align: "center" });
    doc.setFontSize(14); doc.setTextColor(0);
    doc.text(data.program.name, pw / 2, 65, { align: "center" });
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(data.program.institution, pw / 2, 73, { align: "center" });
    if (data.program.area) doc.text(`Área: ${data.program.area}`, pw / 2, 80, { align: "center" });

    // Score
    doc.setFontSize(36); doc.setFont("helvetica", "bold");
    const sc = result.overallScore;
    if (sc >= 7) doc.setTextColor(16, 185, 129);
    else if (sc >= 4) doc.setTextColor(245, 158, 11);
    else doc.setTextColor(239, 68, 68);
    doc.text(sc.toFixed(1), pw / 2, 105, { align: "center" });
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text("Score Geral (0–10)", pw / 2, 112, { align: "center" });

    // Radar chart on title page
    drawRadarChart(doc, result.dimensions.map((d) => ({ name: d.name, score: d.score })), pw / 2, 160, 35);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, pw / 2, 285, { align: "center" });

    // Dimension pages
    doc.addPage(); y = 20;
    addHeader("1. Resumo das Dimensões");
    autoTable(doc, {
      startY: y,
      head: [["Dimensão", "Score", "Peso"]],
      body: result.dimensions.map((d) => [d.name, d.score.toFixed(1), `${result.weights[d.key]}%`]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Section: Produção Científica
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("2. Produção Científica");
    const prodDim = result.dimensions.find((d) => d.key === "producao")!;
    addText(prodDim.autoText);

    // Chart: by year
    if (y > 200) { doc.addPage(); y = 20; }
    y = drawBarChart(doc, byYear.slice(-10).map((d) => ({ label: d.year, value: d.count })), margin, y, pw - 2 * margin, 50, "Artigos por Ano");

    // Chart: by Qualis
    if (y > 180) { doc.addPage(); y = 20; }
    drawPieChart(doc, byQualis.slice(0, 8), pw / 2, y + 45, 30, "Distribuição por Qualis");
    y += 100;

    // Section: Formação
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("3. Formação");
    const formDim = result.dimensions.find((d) => d.key === "formacao")!;
    addText(formDim.autoText);
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: formDim.indicators.map((ind) => [ind.label, String(ind.value)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Section: Impacto
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("4. Impacto Científico");
    const impDim = result.dimensions.find((d) => d.key === "impacto")!;
    addText(impDim.autoText);
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: impDim.indicators.map((ind) => [ind.label, String(ind.value)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // By researcher chart
    if (y > 200) { doc.addPage(); y = 20; }
    y = drawBarChart(doc, byResearcher.slice(0, 10).map((d) => ({ label: d.name, value: d.artigos })), margin, y, pw - 2 * margin, 55, "Artigos por Pesquisador");

    // Section: Internacionalização
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("5. Internacionalização");
    const intDim = result.dimensions.find((d) => d.key === "internacionalizacao")!;
    addText(intDim.autoText);
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: intDim.indicators.map((ind) => [ind.label, String(ind.value)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Section: Inserção Social
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("6. Inserção Social");
    const socDim = result.dimensions.find((d) => d.key === "insercaoSocial")!;
    addText(socDim.autoText);

    // Section: Presença Digital
    if (y > 230) { doc.addPage(); y = 20; }
    addHeader("7. Presença Digital");
    const digDim = result.dimensions.find((d) => d.key === "presencaDigital")!;
    addText(digDim.autoText);
    autoTable(doc, {
      startY: y,
      head: [["Indicador", "Valor"]],
      body: digDim.indicators.map((ind) => [ind.label, String(ind.value)]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 10;

    // Gender chart
    if (y > 180) { doc.addPage(); y = 20; }
    drawPieChart(doc, byGender, pw / 2, y + 45, 30, "Distribuição por Gênero");

    doc.save(`relatorio_avaliacao_${data.program.name.replace(/\s+/g, "_")}.pdf`);
  };

  return (
    <Button variant="outline" size="sm" onClick={generate}>
      <FileText className="h-4 w-4 mr-1" /> Gerar relatório com gráficos
    </Button>
  );
};

export default EvaluationReport;
