/**
 * PDF export for the Planning module — CAPES-style report.
 * Uses jspdf + jspdf-autotable.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ProgramData } from "@/hooks/useProgram";
import { generateDiagnostic, generateSwot, generateStrategicPlan } from "@/lib/planning-diagnostic";
import { isPGOrientation, isMestrado, isDoutorado } from "@/lib/orientation-utils";
import { supabase } from "@/integrations/supabase/client";

interface ExportOptions {
  data: ProgramData;
  startYear: number;
  endYear: number;
}

export async function exportPlanningPDF({ data, startYear, endYear }: ExportOptions) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = margin;

  const colors = {
    primary: [0, 51, 102] as [number, number, number],
    accent: [0, 102, 153] as [number, number, number],
    green: [34, 139, 34] as [number, number, number],
    red: [178, 34, 34] as [number, number, number],
    gray: [100, 100, 100] as [number, number, number],
    lightGray: [240, 240, 240] as [number, number, number],
  };

  function checkPage(needed: number) {
    if (y + needed > doc.internal.pageSize.getHeight() - 15) {
      doc.addPage();
      y = margin;
    }
  }

  function sectionTitle(text: string) {
    checkPage(14);
    doc.setFillColor(...colors.primary);
    doc.rect(margin, y, contentW, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(text.toUpperCase(), margin + 3, y + 5.5);
    doc.setTextColor(0, 0, 0);
    y += 12;
  }

  function subTitle(text: string) {
    checkPage(10);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...colors.accent);
    doc.text(text, margin, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  function bodyText(text: string, indent = 0) {
    checkPage(6);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(text, contentW - indent);
    doc.text(lines, margin + indent, y);
    y += lines.length * 4.5;
  }

  // ======== COVER ========
  doc.setFillColor(...colors.primary);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PLANEJAMENTO ESTRATEGICO", pageW / 2, 25, { align: "center" });
  doc.setFontSize(14);
  doc.text("Programa de Pos-Graduacao", pageW / 2, 35, { align: "center" });
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Periodo: ${startYear} - ${endYear}`, pageW / 2, 48, { align: "center" });

  y = 70;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.program.name, pageW / 2, y, { align: "center" });
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(data.program.institution, pageW / 2, y, { align: "center" });
  y += 6;
  if (data.program.area) {
    doc.text(`Area: ${data.program.area}`, pageW / 2, y, { align: "center" });
    y += 6;
  }
  if (data.program.modality) {
    doc.text(`Modalidade: ${data.program.modality}`, pageW / 2, y, { align: "center" });
    y += 6;
  }
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(...colors.gray);
  doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")}`, pageW / 2, y, { align: "center" });

  // ======== 1. DIAGNOSTICO ========
  doc.addPage();
  y = margin;
  sectionTitle("1. Diagnostico do Programa");

  const diagItems = generateDiagnostic(data, startYear, endYear);
  const strengths = diagItems.filter((i) => i.status === "good");
  const weaknesses = diagItems.filter((i) => i.status === "bad");

  subTitle("Pontos Fortes");
  if (strengths.length === 0) {
    bodyText("Nenhum ponto forte identificado automaticamente.");
  } else {
    strengths.forEach((s) => bodyText(`- ${s.label}: ${s.value}`, 2));
  }
  y += 3;

  subTitle("Pontos Fracos");
  if (weaknesses.length === 0) {
    bodyText("Nenhum ponto fraco identificado automaticamente.");
  } else {
    weaknesses.forEach((w) => bodyText(`- ${w.label}: ${w.value}`, 2));
  }
  y += 3;

  subTitle("Indicadores Detalhados");
  const categories = new Map<string, typeof diagItems>();
  diagItems.forEach((item) => {
    const arr = categories.get(item.category) || [];
    arr.push(item);
    categories.set(item.category, arr);
  });

  const diagTableData: string[][] = [];
  categories.forEach((items, cat) => {
    items.forEach((item) => {
      const statusLabel = item.status === "good" ? "Bom" : item.status === "warning" ? "Atencao" : "Critico";
      diagTableData.push([cat, item.label, String(item.value), statusLabel]);
    });
  });

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Categoria", "Indicador", "Valor", "Status"]],
    body: diagTableData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
    columnStyles: {
      3: {
        cellWidth: 22,
        halign: "center",
      },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 3) {
        const val = data.cell.raw as string;
        if (val === "Bom") data.cell.styles.textColor = colors.green;
        else if (val === "Critico") data.cell.styles.textColor = colors.red;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ======== 2. SWOT ========
  checkPage(30);
  sectionTitle("2. Matriz SWOT");
  const swotData = generateSwot(diagItems, data);
  const quadrants: { key: keyof typeof swotData; label: string }[] = [
    { key: "strengths", label: "Forcas (S)" },
    { key: "weaknesses", label: "Fraquezas (W)" },
    { key: "opportunities", label: "Oportunidades (O)" },
    { key: "threats", label: "Ameacas (T)" },
  ];

  quadrants.forEach(({ key, label }) => {
    subTitle(label);
    const items = swotData[key];
    if (items.length === 0) {
      bodyText("Nenhum item identificado.");
    } else {
      items.forEach((item) => bodyText(`- ${item.text}`, 2));
    }
    y += 2;
  });

  // ======== 3. PLANEJAMENTO ESTRATEGICO ========
  checkPage(30);
  sectionTitle("3. Planejamento Estrategico");
  const dimensions = generateStrategicPlan(diagItems, data);

  dimensions.forEach((dim) => {
    checkPage(25);
    subTitle(`${dim.name}`);
    bodyText(`Objetivo: ${dim.objective}`, 2);
    y += 2;

    const termLabel = (t: string) => t === "short" ? "Curto" : t === "medium" ? "Medio" : "Longo";

    if (dim.goals.length > 0) {
      const goalsData = dim.goals.map((g) => [termLabel(g.term), g.text]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin + 4, right: margin },
        head: [["Prazo", "Meta"]],
        body: goalsData,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: colors.accent, textColor: [255, 255, 255] },
        columnStyles: { 0: { cellWidth: 20 } },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    if (dim.actions.length > 0) {
      checkPage(15);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Acoes:", margin + 4, y);
      y += 4;
      dim.actions.forEach((a) => bodyText(`- [${termLabel(a.term)}] ${a.text}`, 6));
      y += 2;
    }

    if (dim.indicators.length > 0) {
      checkPage(10);
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.text("Indicadores:", margin + 4, y);
      y += 4;
      dim.indicators.forEach((ind) => bodyText(`- ${ind.text}`, 6));
      y += 2;
    }
    y += 4;
  });

  // ======== 4. GESTAO ACADEMICA ========
  checkPage(30);
  sectionTitle("4. Gestao Academica");

  const { researchers, articles, orientations, projects } = data;
  const periodArticles = articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear);
  const pgOrientations = orientations.filter(
    (o) => isPGOrientation(o.type) && o.year && o.year >= startYear && o.year <= endYear
  );
  const concluded = pgOrientations.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA");
  const mestrados = concluded.filter((o) => isMestrado(o.type)).length;
  const doutorados = concluded.filter((o) => isDoutorado(o.type)).length;
  const periodProjects = projects.filter(
    (p) => (p.year_start && p.year_start >= startYear && p.year_start <= endYear) ||
           (p.year_end && p.year_end >= startYear && p.year_end <= endYear)
  );

  bodyText(`Docentes: ${researchers.length} | Artigos: ${periodArticles.length} | Titulados (M): ${mestrados} | Titulados (D): ${doutorados} | Projetos: ${periodProjects.length}`);
  y += 3;

  if (researchers.length > 0) {
    subTitle("Desempenho por Docente");
    const perResearcher = researchers.map((r) => {
      const rArt = periodArticles.filter((a) => a.researcher_id === r.id).length;
      const rOrient = pgOrientations.filter((o) => o.researcher_id === r.id);
      const rConcl = rOrient.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA").length;
      const rProj = periodProjects.filter((p) => p.researcher_id === r.id).length;
      return [r.name, r.research_line || "-", String(rArt), String(rConcl), String(rProj)];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Docente", "Linha de Pesquisa", "Artigos", "Orient. Concl.", "Projetos"]],
      body: perResearcher,
      styles: { fontSize: 7.5, cellPadding: 1.5 },
      headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
      columnStyles: {
        0: { cellWidth: 40 },
        2: { halign: "center", cellWidth: 18 },
        3: { halign: "center", cellWidth: 22 },
        4: { halign: "center", cellWidth: 18 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ======== 5. MONITORAMENTO ========
  checkPage(30);
  sectionTitle("5. Monitoramento e Metas");

  const numDocentes = researchers.length || 1;
  const qualisA = periodArticles.filter((a) => a.qualis?.startsWith("A")).length;
  const funded = periodProjects.filter((p) => p.funding && p.funding !== "Nao").length;
  const artPerDoc = +(periodArticles.length / numDocentes).toFixed(1);
  const orientPerDoc = +(concluded.length / numDocentes).toFixed(1);

  const monitoringData = [
    ["Artigos no periodo", String(periodArticles.length), String(numDocentes * 3)],
    ["Artigos Qualis A", String(qualisA), String(Math.max(Math.round(numDocentes * 1.5), 5))],
    ["Artigos por docente", String(artPerDoc), "3"],
    ["Dissertacoes concluidas", String(mestrados), String(Math.max(numDocentes * 2, 8))],
    ["Teses concluidas", String(doutorados), String(Math.max(numDocentes, 4))],
    ["Orientacoes por docente", String(orientPerDoc), "2"],
    ["Projetos financiados", String(funded), String(Math.max(Math.round(numDocentes * 0.8), 3))],
    ["Total de projetos", String(periodProjects.length), String(numDocentes * 2)],
  ];

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Indicador", "Atual", "Meta"]],
    body: monitoringData,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
    columnStyles: {
      1: { halign: "center", cellWidth: 25 },
      2: { halign: "center", cellWidth: 25 },
    },
    didParseCell(data) {
      if (data.section === "body" && data.column.index === 1) {
        const current = parseFloat(data.cell.raw as string);
        const row = data.row.index;
        const goal = parseFloat(monitoringData[row][2]);
        if (current >= goal) data.cell.styles.textColor = colors.green;
        else if (current >= goal * 0.5) data.cell.styles.textColor = [180, 130, 0];
        else data.cell.styles.textColor = colors.red;
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ======== 6. BOLSAS E FINANCIAMENTO ========
  {
    const { data: schRow } = await supabase
      .from("planning_data")
      .select("config")
      .eq("program_id", data.program.id)
      .eq("type", "scholarships")
      .maybeSingle();

    const schData = (schRow?.config && typeof schRow.config === "object" && !Array.isArray(schRow.config))
      ? schRow.config as any
      : { scholarships: [], funding: [], notes: "" };

    const projectFunding = data.projects.filter(
      (p) => p.funding && p.funding !== "Não" &&
        ((p.year_start && p.year_start >= startYear) || (p.year_end && p.year_end >= startYear))
    );

    checkPage(30);
    sectionTitle("6. Bolsas e Financiamento");

    const totalBolsas = (schData.scholarships || []).reduce((s: number, b: any) => s + (b.quantity || 0), 0);
    bodyText(`Total de bolsas registradas: ${totalBolsas} | Projetos financiados: ${projectFunding.length} | Fontes de financiamento: ${(schData.funding || []).length}`);
    y += 3;

    if ((schData.scholarships || []).length > 0) {
      subTitle("Bolsas");
      const bolsasData = schData.scholarships.map((s: any) => [s.source || "-", s.type || "-", s.level || "-", String(s.quantity || 0), s.notes || ""]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Fonte", "Tipo", "Nível", "Qtd", "Observações"]],
        body: bolsasData,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
        columnStyles: { 3: { halign: "center", cellWidth: 15 } },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    const allFunding = [
      ...projectFunding.map((p) => [p.funder || "N/I", p.title, p.funding || "-", `${p.year_start || "?"} – ${p.year_end || "atual"}`]),
      ...(schData.funding || []).map((f: any) => [f.funder || "-", f.project || "-", f.amount || "-", `${f.yearStart || "?"} – ${f.yearEnd || "atual"}`]),
    ];

    if (allFunding.length > 0) {
      subTitle("Financiamentos e Fomento");
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Financiador", "Projeto", "Valor", "Período"]],
        body: allFunding,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (schData.notes) {
      subTitle("Observações");
      bodyText(schData.notes);
      y += 4;
    }
  }

  // ======== 7. MOBILIDADE E INTERNACIONALIZAÇÃO ========
  {
    const { data: mobRow } = await supabase
      .from("planning_data")
      .select("config")
      .eq("program_id", data.program.id)
      .eq("type", "mobility")
      .maybeSingle();

    const mobData = (mobRow?.config && typeof mobRow.config === "object" && !Array.isArray(mobRow.config))
      ? mobRow.config as any
      : { mobility: [], agreements: [], notes: "" };

    const partnerships = [...new Set(data.projects.filter((p) => p.partner_institution).map((p) => p.partner_institution!))];
    const incoming = (mobData.mobility || []).filter((m: any) => m.type === "incoming");
    const outgoing = (mobData.mobility || []).filter((m: any) => m.type === "outgoing");
    const activeAgreements = (mobData.agreements || []).filter((a: any) => a.active);

    checkPage(30);
    sectionTitle("7. Mobilidade e Internacionalizacao");

    const intScore = data.program.internationalization_score ?? 0;
    const hasEnglish = data.program.has_english_version ?? false;
    bodyText(`Score de internacionalização: ${intScore} | Site em inglês: ${hasEnglish ? "Sim" : "Não"} | Parcerias: ${partnerships.length}`);
    bodyText(`Mobilidades: ${outgoing.length} (saída) / ${incoming.length} (entrada) | Convênios ativos: ${activeAgreements.length}`);
    y += 3;

    if ((mobData.mobility || []).length > 0) {
      subTitle("Registros de Mobilidade");
      const roleLabel = (r: string) => r === "student" ? "Discente" : r === "professor" ? "Docente" : "Pesquisador";
      const mobTableData = mobData.mobility.map((m: any) => [
        m.name || "-",
        m.type === "incoming" ? "Entrada" : "Saída",
        roleLabel(m.role),
        m.institution || "-",
        m.country || "-",
        String(m.year || "-"),
      ]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Nome", "Tipo", "Papel", "Instituição", "País", "Ano"]],
        body: mobTableData,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if ((mobData.agreements || []).length > 0) {
      subTitle("Convênios e Acordos");
      const agrData = mobData.agreements.map((a: any) => [
        a.institution || "-", a.country || "-", a.type || "-", String(a.year || "-"), a.active ? "Ativo" : "Inativo",
      ]);
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Instituição", "País", "Tipo", "Ano", "Status"]],
        body: agrData,
        styles: { fontSize: 8, cellPadding: 1.5 },
        headStyles: { fillColor: colors.primary, textColor: [255, 255, 255] },
        didParseCell(data) {
          if (data.section === "body" && data.column.index === 4) {
            const val = data.cell.raw as string;
            if (val === "Ativo") data.cell.styles.textColor = colors.green;
            else data.cell.styles.textColor = colors.red;
          }
        },
      });
      y = (doc as any).lastAutoTable.finalY + 6;
    }

    if (partnerships.length > 0) {
      subTitle("Instituições Parceiras (via Projetos)");
      partnerships.forEach((p) => bodyText(`- ${p}`, 2));
      y += 4;
    }

    if (mobData.notes) {
      subTitle("Observações");
      bodyText(mobData.notes);
      y += 4;
    }
  }

  // ======== FOOTER on all pages ========
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFontSize(7);
    doc.setTextColor(...colors.gray);
    doc.text(
      `${data.program.name} - Planejamento Estrategico ${startYear}-${endYear}`,
      margin,
      pageH - 7
    );
    doc.text(`Pagina ${i}/${totalPages}`, pageW - margin, pageH - 7, { align: "right" });
  }

  // Save
  const filename = `Planejamento_${data.program.name.replace(/\s+/g, "_")}_${startYear}-${endYear}.pdf`;
  doc.save(filename);
}
