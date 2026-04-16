import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface CAPESReportProps {
  data: ProgramData;
  startYear?: number;
  endYear?: number;
}

const QUALIS_ORDER = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C", "NP"];

export default function CAPESReport({ data, startYear, endYear }: CAPESReportProps) {
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();
  const currentYear = new Date().getFullYear();
  const quadStart = startYear ?? (currentYear - 3);
  const quadEnd = endYear ?? currentYear;

  const generate = async () => {
    setGenerating(true);
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const margin = 15;
      const contentW = W - margin * 2;
      let y = margin;

      const addPage = () => { doc.addPage(); y = margin; };
      const checkPage = (need: number) => { if (y + need > 280) addPage(); };

      // ── Helpers ──
      const title = (text: string, size = 14) => {
        checkPage(14);
        doc.setFontSize(size);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(0, 51, 102);
        doc.text(text, margin, y);
        y += 2;
        doc.setDrawColor(0, 51, 102);
        doc.setLineWidth(0.5);
        doc.line(margin, y, W - margin, y);
        y += 7;
      };

      const subtitle = (text: string) => {
        checkPage(10);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(text, margin, y);
        y += 6;
      };

      const body = (text: string) => {
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
        const lines = doc.splitTextToSize(text, contentW);
        checkPage(lines.length * 5);
        doc.text(lines, margin, y);
        y += lines.length * 5 + 3;
      };

      const kv = (label: string, value: string) => {
        checkPage(7);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(`${label}: `, margin, y);
        const labelW = doc.getTextWidth(`${label}: `);
        doc.setFont("helvetica", "normal");
        doc.text(value || "Não informado", margin + labelW, y);
        y += 6;
      };

      // ── Data ──
      const { program, researchers, articles, orientations, projects, technicalProductions, metrics, citationEntries } = data;

      const quadArticles = articles.filter((a) => a.year && a.year >= quadStart && a.year <= quadEnd);
      const filteredArticles = quadArticles; // use period-filtered articles throughout
      const qualisDist: Record<string, number> = {};
      filteredArticles.forEach((a) => { if (a.qualis) qualisDist[a.qualis] = (qualisDist[a.qualis] || 0) + 1; });

      const qualifiedCount = filteredArticles.filter((a) => a.qualis && ["A1", "A2", "A3", "A4", "B1"].includes(a.qualis)).length;
      const qualifiedPct = filteredArticles.length > 0 ? ((qualifiedCount / filteredArticles.length) * 100).toFixed(1) : "0";

      const filteredOrientations = orientations.filter((o) => o.year && o.year >= quadStart && o.year <= quadEnd);
      const conclusionOrientations = filteredOrientations.filter((o) => o.status === "concluded");
      const inProgressOrientations = filteredOrientations.filter((o) => o.status !== "concluded");
      const filteredProjects = projects.filter((p) => {
        const ys = p.year_start;
        if (ys == null) return false;
        if (ys > quadEnd) return false;
        const ye = p.year_end;
        if (ye == null) return true;
        return ye >= quadStart;
      });
      const fundedProjects = filteredProjects.filter((p) => p.funding && p.funding !== "Não");
      const filteredTechProds = technicalProductions.filter((t) => t.year && t.year >= quadStart && t.year <= quadEnd);

      const totalCitations = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);
      const avgHIndex = metrics.length > 0
        ? (metrics.reduce((s, m) => s + (m.h_index || 0), 0) / metrics.length).toFixed(1)
        : "0";

      const researchLines = [...new Set(researchers.map((r) => r.research_line).filter(Boolean))];
      const genderDist: Record<string, number> = {};
      researchers.forEach((r) => { const g = r.gender || "Não informado"; genderDist[g] = (genderDist[g] || 0) + 1; });

      // ── Cover ──
      y = 60;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      doc.text("RELATÓRIO DE AVALIAÇÃO", W / 2, y, { align: "center" });
      y += 8;
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 51, 102);
      const progNameLines = doc.splitTextToSize(program.name.toUpperCase(), contentW - 20);
      doc.text(progNameLines, W / 2, y, { align: "center" });
      y += progNameLines.length * 9 + 6;
      doc.setFontSize(13);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text(program.institution, W / 2, y, { align: "center" });
      y += 12;
      doc.setFontSize(10);
      doc.text(`Gerado em ${new Date().toLocaleDateString("pt-BR")}`, W / 2, y, { align: "center" });
      y += 6;
      doc.text(`Quadriênio ${quadStart}–${quadEnd}`, W / 2, y, { align: "center" });

      // Horizontal line
      y += 15;
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(1);
      doc.line(margin + 30, y, W - margin - 30, y);

      // ── 1. PROGRAMA ──
      addPage();
      title("1. PROGRAMA");
      kv("Nome", program.name);
      kv("Instituição", program.institution);
      kv("Área de avaliação", (program as any).area || "");
      kv("Modalidade", (program as any).modality || "");
      kv("Código do programa", (program as any).program_code || "");
      kv("Nº de docentes", String(researchers.length));
      kv("Distribuição por gênero", Object.entries(genderDist).map(([g, c]) => `${g}: ${c}`).join(", "));

      if (researchLines.length > 0) {
        subtitle("Linhas de pesquisa");
        researchLines.forEach((l) => body(`• ${l}`));
      }

      subtitle("Corpo docente");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Nome", "Gênero", "Linha de pesquisa", "ORCID"]],
        body: researchers.map((r) => [
          r.name, r.gender || "—", r.research_line || "—", r.orcid || "—"
        ]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 250] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // ── 2. FORMAÇÃO ──
      checkPage(20);
      title("2. FORMAÇÃO DE RECURSOS HUMANOS");

      body(
        `No período ${quadStart}–${quadEnd}, o programa formou ${conclusionOrientations.length} orientandos. ` +
        `${inProgressOrientations.length} orientações estão em andamento no período.`
      );

      // Orientations by type
      const orientByType: Record<string, number> = {};
      filteredOrientations.forEach((o) => { orientByType[o.type] = (orientByType[o.type] || 0) + 1; });
      if (Object.keys(orientByType).length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Tipo de orientação", "Concluídas", "Em andamento"]],
          body: Object.keys(orientByType).map((type) => [
            type,
            String(filteredOrientations.filter((o) => o.type === type && o.status === "concluded").length),
            String(filteredOrientations.filter((o) => o.type === type && o.status !== "concluded").length),
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── 3. PRODUÇÃO INTELECTUAL ──
      checkPage(20);
      title("3. PRODUÇÃO INTELECTUAL");

      // Auto-generated text
      const yearCounts: Record<number, number> = {};
      filteredArticles.forEach((a) => { if (a.year) yearCounts[a.year] = (yearCounts[a.year] || 0) + 1; });
      const years = Object.keys(yearCounts).map(Number).sort();
      let trendText = "";
      if (years.length >= 2) {
        const lastTwo = years.slice(-2);
        const diff = yearCounts[lastTwo[1]] - yearCounts[lastTwo[0]];
        trendText = diff > 0
          ? `O programa apresentou crescimento na produção científica, passando de ${yearCounts[lastTwo[0]]} para ${yearCounts[lastTwo[1]]} publicações entre ${lastTwo[0]} e ${lastTwo[1]}.`
          : diff < 0
          ? `A produção científica apresentou redução de ${yearCounts[lastTwo[0]]} para ${yearCounts[lastTwo[1]]} publicações entre ${lastTwo[0]} e ${lastTwo[1]}.`
          : `A produção científica manteve-se estável com ${yearCounts[lastTwo[1]]} publicações em ${lastTwo[1]}.`;
      }

      body(
        `No período ${quadStart}–${quadEnd}, o programa conta com ${filteredArticles.length} produções bibliográficas. ` +
        `A produção qualificada (A1–B1) representa ${qualifiedPct}% do total. ` +
        (trendText || "")
      );

      subtitle("Distribuição por Qualis");
      if (Object.keys(qualisDist).length > 0) {
        const sortedQualis = QUALIS_ORDER.filter((q) => qualisDist[q]);
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Estrato Qualis", "Quantidade", "Percentual"]],
          body: sortedQualis.map((q) => [
            q,
            String(qualisDist[q]),
            `${((qualisDist[q] / articles.length) * 100).toFixed(1)}%`,
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Production by year
      checkPage(20);
      subtitle("Produção por ano");
      if (years.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Ano", "Publicações"]],
          body: years.map((yr) => [String(yr), String(yearCounts[yr])]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      }

      // Production per researcher
      checkPage(20);
      subtitle("Produção por pesquisador");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Pesquisador", "Artigos", "Qualificados (A1–B1)", "Orientações", "Projetos"]],
        body: researchers.map((r) => {
          const rArticles = articles.filter((a) => a.researcher_id === r.id);
          const rQualified = rArticles.filter((a) => a.qualis && ["A1", "A2", "A3", "A4", "B1"].includes(a.qualis));
          const rOrient = orientations.filter((o) => o.researcher_id === r.id).length;
          const rProj = projects.filter((p) => p.researcher_id === r.id).length;
          return [r.name, String(rArticles.length), String(rQualified.length), String(rOrient), String(rProj)];
        }),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 250] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;

      // Technical productions
      if (technicalProductions.length > 0) {
        checkPage(20);
        subtitle("Produção técnica");
        const techByType: Record<string, number> = {};
        technicalProductions.forEach((t) => { techByType[t.type] = (techByType[t.type] || 0) + 1; });
        body(
          `O programa registrou ${technicalProductions.length} produções técnicas, distribuídas em: ` +
          Object.entries(techByType).map(([t, c]) => `${t} (${c})`).join(", ") + "."
        );
      }

      // ── 4. PROJETOS ──
      checkPage(20);
      title("4. PROJETOS DE PESQUISA E EXTENSÃO");
      body(
        `O programa possui ${projects.length} projetos registrados, sendo ${fundedProjects.length} com financiamento. ` +
        (fundedProjects.length > 0
          ? `Os financiadores incluem: ${[...new Set(fundedProjects.map((p) => p.funder).filter(Boolean))].join(", ") || "não especificados"}.`
          : "")
      );

      if (projects.length > 0) {
        const projByType: Record<string, number> = {};
        projects.forEach((p) => { projByType[p.type || "outro"] = (projByType[p.type || "outro"] || 0) + 1; });
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Tipo", "Quantidade", "Com financiamento"]],
          body: Object.entries(projByType).map(([t, c]) => [
            t,
            String(c),
            String(projects.filter((p) => (p.type || "outro") === t && p.funding && p.funding !== "Não").length),
          ]),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // ── 5. IMPACTO ──
      checkPage(20);
      title("5. IMPACTO NA SOCIEDADE");

      // Citation entries aggregation
      const citTotalCitations = citationEntries.reduce((s, c) => s + (c.total_citations || 0), 0);
      const citTotalWorks = citationEntries.reduce((s, c) => s + (c.total_works || 0), 0);
      const citHIndices = citationEntries.filter((c) => c.h_index && c.h_index > 0).map((c) => c.h_index!);
      const citAvgH = citHIndices.length > 0 ? (citHIndices.reduce((s, h) => s + h, 0) / citHIndices.length).toFixed(1) : "0";

      const impactCitations = citationEntries.length > 0 ? citTotalCitations : totalCitations;
      const impactHIndex = citationEntries.length > 0 ? citAvgH : avgHIndex;

      body(
        `O programa acumula ${impactCitations} citações, com h-index médio de ${impactHIndex}. ` +
        (citationEntries.length > 0
          ? `Os dados de citações incluem ${citationEntries.length} registros em bases como Web of Science, Scopus e Google Scholar.`
          : `As métricas são baseadas em dados do OpenAlex e fontes complementares.`)
      );

      if (metrics.length > 0) {
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Pesquisador", "Citações", "H-Index", "i10-Index", "Fonte"]],
          body: metrics.map((m) => {
            const r = researchers.find((r) => r.id === m.researcher_id);
            return [r?.name || "—", String(m.total_citations || 0), String(m.h_index || 0), String(m.i10_index || 0), m.source || "—"];
          }),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Citation entries by source
      if (citationEntries.length > 0) {
        checkPage(20);
        subtitle("Citações por base bibliográfica");

        const sourceLabels: Record<string, string> = { wos: "Web of Science", scopus: "Scopus", scholar: "Google Scholar", other: "Outras Bases" };
        const bySource: Record<string, typeof citationEntries> = {};
        citationEntries.forEach((c) => { (bySource[c.source] ??= []).push(c); });

        for (const [source, entries] of Object.entries(bySource)) {
          const srcCitations = entries.reduce((s, e) => s + (e.total_citations || 0), 0);
          const srcWorks = entries.reduce((s, e) => s + (e.total_works || 0), 0);
          const srcHIndices = entries.filter((e) => e.h_index && e.h_index > 0).map((e) => e.h_index!);
          const srcAvgH = srcHIndices.length > 0 ? (srcHIndices.reduce((s, h) => s + h, 0) / srcHIndices.length).toFixed(1) : "—";

          checkPage(20);
          autoTable(doc, {
            startY: y,
            margin: { left: margin, right: margin },
            head: [[sourceLabels[source] || source, "Citações", "Trabalhos", "h-index médio", "Pesquisadores"]],
            body: [[
              `${entries.length} registro(s)`,
              String(srcCitations),
              String(srcWorks),
              srcAvgH,
              String(new Set(entries.map((e) => e.researcher_id)).size),
            ]],
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
            alternateRowStyles: { fillColor: [240, 245, 250] },
          });
          y = (doc as any).lastAutoTable.finalY + 5;
        }

        // Detailed table per researcher
        checkPage(20);
        subtitle("Detalhamento por pesquisador");
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Pesquisador", "Base", "Citações", "Trabalhos", "h-index", "ResearcherID"]],
          body: citationEntries.map((c) => {
            const r = researchers.find((r) => r.id === c.researcher_id);
            return [
              r?.name || "—",
              sourceLabels[c.source] || c.source_name || c.source,
              String(c.total_citations || 0),
              String(c.total_works || 0),
              String(c.h_index || "—"),
              c.researcher_id_wos || "—",
            ];
          }),
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: [240, 245, 250] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
      }

      // Social insertion
      const socialProds = technicalProductions.filter((t) =>
        ["interview", "mediaParticipation", "eventOrganization"].includes(t.type)
      );
      if (socialProds.length > 0) {
        checkPage(10);
        subtitle("Inserção social");
        body(
          `O programa registrou ${socialProds.length} atividades de inserção social, incluindo entrevistas, participações em mídia e organização de eventos.`
        );
      }

      // ── 6. INTERNACIONALIZAÇÃO ──
      const websiteUrl = (program as any).website_url;
      const websiteDesc = (program as any).website_description;
      const websiteLanguages = (program as any).website_languages;
      const websiteResearchLines = (program as any).website_research_lines;
      const hasEnglishVersion = (program as any).has_english_version;
      const intScore = (program as any).internationalization_score || 0;

      checkPage(20);
      title("6. INTERNACIONALIZAÇÃO E VISIBILIDADE");

      if (websiteUrl) {
        kv("Site do programa", websiteUrl);
      }
      if (websiteDesc) {
        body(websiteDesc);
      }

      const intLabel = intScore >= 70 ? "alto" : intScore >= 40 ? "médio" : "baixo";
      body(
        `O programa possui nível de internacionalização ${intLabel} (score: ${intScore}/100). ` +
        (hasEnglishVersion
          ? "O site do programa possui versão em inglês, favorecendo a visibilidade internacional."
          : "O site do programa não possui versão em inglês, o que pode limitar a visibilidade internacional.")
      );

      if (websiteLanguages) {
        kv("Idiomas disponíveis no site", websiteLanguages);
      }

      if (websiteResearchLines) {
        subtitle("Linhas de pesquisa (extraídas do site)");
        websiteResearchLines.split(";").forEach((line: string) => {
          if (line.trim()) body(`• ${line.trim()}`);
        });
      }

      // Internationalization indicators table
      checkPage(20);
      subtitle("Indicadores de internacionalização");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Indicador", "Status"]],
        body: [
          ["Site com versão em inglês", hasEnglishVersion ? "✓ Sim" : "✗ Não"],
          ["Idiomas do site", websiteLanguages || "Apenas português"],
          ["Score de internacionalização", `${intScore}/100 (${intLabel})`],
          ["URL do site", websiteUrl || "Não informado"],
        ],
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [0, 51, 102], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [240, 245, 250] },
      });
      y = (doc as any).lastAutoTable.finalY + 10;
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(`Lattes Reader — Relatório CAPES — ${program.name}`, margin, 290);
        doc.text(`Página ${i} de ${pageCount}`, W - margin, 290, { align: "right" });
      }

      doc.save(`Relatorio_CAPES_${program.name.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast({ title: "Relatório gerado!", description: "O PDF foi baixado com sucesso." });
    } catch (err: any) {
      toast({ title: "Erro ao gerar relatório", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button onClick={generate} disabled={generating} variant="outline" size="sm">
      {generating ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <FileText className="h-4 w-4 mr-1" />}
      {generating ? "Gerando..." : "Gerar relatório CAPES"}
    </Button>
  );
}
