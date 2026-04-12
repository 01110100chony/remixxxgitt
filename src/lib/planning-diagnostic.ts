/**
 * Auto-diagnostic engine: analyzes program data and generates
 * strengths, weaknesses, and SWOT items.
 */
import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado, isProjectInPeriod } from "@/lib/orientation-utils";

export interface DiagnosticItem {
  category: string;
  label: string;
  value: string | number;
  status: "good" | "warning" | "bad";
  detail?: string;
}

export interface SwotItem {
  id: string;
  text: string;
  auto: boolean; // generated automatically
}

export interface SwotData {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function generateDiagnostic(data: ProgramData, startYear: number, endYear: number): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const { researchers, articles, orientations, projects, metrics, citationEntries, program } = data;

  // --- Production ---
  const periodArticles = articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear);
  const totalArticles = periodArticles.length;
  const perDocente = researchers.length > 0 ? (totalArticles / researchers.length).toFixed(1) : "0";
  const withDoi = periodArticles.filter((a) => a.doi).length;
  const doiPercent = totalArticles > 0 ? Math.round((withDoi / totalArticles) * 100) : 0;

  items.push({
    category: "Produção Científica",
    label: "Artigos no período",
    value: totalArticles,
    status: totalArticles >= researchers.length * 2 ? "good" : totalArticles >= researchers.length ? "warning" : "bad",
  });
  items.push({
    category: "Produção Científica",
    label: "Artigos por docente",
    value: perDocente,
    status: Number(perDocente) >= 2 ? "good" : Number(perDocente) >= 1 ? "warning" : "bad",
  });
  items.push({
    category: "Produção Científica",
    label: "Artigos com DOI",
    value: `${doiPercent}%`,
    status: doiPercent >= 80 ? "good" : doiPercent >= 50 ? "warning" : "bad",
  });

  // Qualis distribution
  const qualisA = periodArticles.filter((a) => a.qualis && (a.qualis.startsWith("A"))).length;
  const qualisPercent = totalArticles > 0 ? Math.round((qualisA / totalArticles) * 100) : 0;
  items.push({
    category: "Produção Científica",
    label: "Artigos Qualis A (A1–A4)",
    value: `${qualisPercent}%`,
    status: qualisPercent >= 40 ? "good" : qualisPercent >= 20 ? "warning" : "bad",
  });

  // --- Orientations ---
  const pgOrientations = orientations.filter((o) => isPGOrientation(o.type) && o.year && o.year >= startYear && o.year <= endYear);
  const concluded = pgOrientations.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA");
  const mestrados = concluded.filter((o) => isMestrado(o.type)).length;
  const doutorados = concluded.filter((o) => isDoutorado(o.type)).length;

  items.push({
    category: "Formação",
    label: "Titulados mestrado",
    value: mestrados,
    status: mestrados >= researchers.length ? "good" : mestrados >= researchers.length / 2 ? "warning" : "bad",
  });
  items.push({
    category: "Formação",
    label: "Titulados doutorado",
    value: doutorados,
    status: doutorados > 0 ? "good" : "warning",
  });

  // --- Impact ---
  const hasMetrics = metrics.some((m) => (m.total_citations ?? 0) > 0 || (m.h_index ?? 0) > 0);
  const avgH = metrics.length > 0
    ? (metrics.reduce((s, m) => s + (m.h_index ?? 0), 0) / metrics.length).toFixed(1)
    : "N/A";
  const totalCitations = metrics.reduce((s, m) => s + (m.total_citations ?? 0), 0);

  items.push({
    category: "Impacto Científico",
    label: "Citações totais",
    value: hasMetrics ? totalCitations : "Sem dados",
    status: hasMetrics ? (totalCitations > researchers.length * 50 ? "good" : "warning") : "bad",
  });
  items.push({
    category: "Impacto Científico",
    label: "h-index médio",
    value: avgH,
    status: avgH !== "N/A" ? (Number(avgH) >= 5 ? "good" : "warning") : "bad",
  });

  // --- Internationalization ---
  const intScore = program.internationalization_score ?? 0;
  const hasEnglish = program.has_english_version ?? false;
  items.push({
    category: "Internacionalização",
    label: "Score internacionalização",
    value: intScore,
    status: intScore >= 3 ? "good" : intScore >= 1 ? "warning" : "bad",
  });
  items.push({
    category: "Internacionalização",
    label: "Site em inglês",
    value: hasEnglish ? "Sim" : "Não",
    status: hasEnglish ? "good" : "warning",
  });

  // --- Digital Presence ---
  const socialFields = [program.social_facebook, program.social_instagram, program.social_twitter, program.social_linkedin, program.social_youtube];
  const socialCount = socialFields.filter(Boolean).length;
  items.push({
    category: "Presença Digital",
    label: "Redes sociais",
    value: `${socialCount}/5`,
    status: socialCount >= 3 ? "good" : socialCount >= 1 ? "warning" : "bad",
  });
  items.push({
    category: "Presença Digital",
    label: "Website",
    value: program.website_url ? "Sim" : "Não",
    status: program.website_url ? "good" : "bad",
  });

  // --- Projects ---
  const periodProjects = projects.filter((p) => isProjectInPeriod(p, startYear, endYear));
  const funded = periodProjects.filter((p) => p.funding && p.funding !== "Não");
  items.push({
    category: "Inserção Social",
    label: "Projetos no período",
    value: periodProjects.length,
    status: periodProjects.length >= researchers.length ? "good" : periodProjects.length > 0 ? "warning" : "bad",
  });
  items.push({
    category: "Inserção Social",
    label: "Projetos financiados",
    value: funded.length,
    status: funded.length > 0 ? "good" : "bad",
  });

  return items;
}

export function generateSwot(diagnosticItems: DiagnosticItem[], data: ProgramData): SwotData {
  const strengths: SwotItem[] = [];
  const weaknesses: SwotItem[] = [];
  const opportunities: SwotItem[] = [];
  const threats: SwotItem[] = [];

  // Internal: strengths & weaknesses from diagnostic
  for (const item of diagnosticItems) {
    if (item.status === "good") {
      strengths.push({ id: uid(), text: `${item.label}: ${item.value}`, auto: true });
    } else if (item.status === "bad") {
      weaknesses.push({ id: uid(), text: `${item.label}: ${item.value}`, auto: true });
    }
  }

  // External: opportunities & threats (heuristic)
  const hasPartnerships = data.projects.some((p) => p.partner_institution);
  if (hasPartnerships) {
    opportunities.push({ id: uid(), text: "Parcerias com instituições externas em projetos", auto: true });
  }
  opportunities.push({ id: uid(), text: "Editais de fomento (CAPES, CNPq, FAPs)", auto: true });
  opportunities.push({ id: uid(), text: "Colaborações internacionais", auto: true });

  if (data.researchers.length < 10) {
    threats.push({ id: uid(), text: "Corpo docente reduzido", auto: true });
  }
  threats.push({ id: uid(), text: "Redução de recursos de fomento", auto: true });
  threats.push({ id: uid(), text: "Concorrência com programas consolidados", auto: true });

  return { strengths, weaknesses, opportunities, threats };
}

export interface StrategicDimension {
  id: string;
  name: string;
  objective: string;
  goals: { id: string; text: string; term: "short" | "medium" | "long" }[];
  actions: { id: string; text: string; term: "short" | "medium" | "long" }[];
  indicators: { id: string; text: string }[];
}

export function generateStrategicPlan(diagnosticItems: DiagnosticItem[], data: ProgramData): StrategicDimension[] {
  const weakCats = new Set(diagnosticItems.filter((i) => i.status === "bad" || i.status === "warning").map((i) => i.category));

  const dimensions: StrategicDimension[] = [
    {
      id: "ensino",
      name: "Ensino",
      objective: "Aprimorar a formação discente com excelência acadêmica",
      goals: [
        { id: uid(), text: "Reduzir tempo médio de titulação", term: "short" },
        { id: uid(), text: "Aumentar taxa de conclusão", term: "medium" },
      ],
      actions: [
        { id: uid(), text: "Implementar acompanhamento semestral dos discentes", term: "short" },
        { id: uid(), text: "Criar disciplinas compartilhadas com outros programas", term: "medium" },
      ],
      indicators: [
        { id: uid(), text: "Tempo médio de titulação (meses)" },
        { id: uid(), text: "Taxa de conclusão (%)" },
      ],
    },
    {
      id: "pesquisa",
      name: "Pesquisa, Inovação e Extensão",
      objective: weakCats.has("Produção Científica")
        ? "Ampliar e qualificar a produção científica do programa"
        : "Manter o nível de excelência da produção científica",
      goals: [
        { id: uid(), text: "Aumentar proporção de artigos Qualis A", term: "short" },
        { id: uid(), text: "Ampliar publicações em periódicos internacionais", term: "medium" },
        { id: uid(), text: "Desenvolver produtos tecnológicos e inovações", term: "long" },
      ],
      actions: [
        { id: uid(), text: "Incentivar submissões em periódicos de alto impacto", term: "short" },
        { id: uid(), text: "Criar programa de mentoria para publicação", term: "short" },
        { id: uid(), text: "Estabelecer parcerias de P&D com empresas", term: "medium" },
      ],
      indicators: [
        { id: uid(), text: "Artigos por docente/ano" },
        { id: uid(), text: "% Qualis A1-A4" },
        { id: uid(), text: "Produções técnicas/patentes" },
      ],
    },
    {
      id: "impacto",
      name: "Impacto e Interação com a Sociedade",
      objective: weakCats.has("Impacto Científico")
        ? "Ampliar o impacto científico e social do programa"
        : "Fortalecer o impacto e a inserção social",
      goals: [
        { id: uid(), text: "Aumentar citações e h-index dos docentes", term: "medium" },
        { id: uid(), text: "Ampliar projetos com impacto social", term: "long" },
      ],
      actions: [
        { id: uid(), text: "Promover divulgação científica nas redes sociais", term: "short" },
        { id: uid(), text: "Desenvolver projetos de extensão comunitária", term: "medium" },
      ],
      indicators: [
        { id: uid(), text: "Citações totais" },
        { id: uid(), text: "h-index médio" },
        { id: uid(), text: "Projetos de inserção social" },
      ],
    },
    {
      id: "internacionalizacao",
      name: "Internacionalização",
      objective: weakCats.has("Internacionalização")
        ? "Estabelecer e ampliar ações de internacionalização"
        : "Consolidar a internacionalização do programa",
      goals: [
        { id: uid(), text: "Criar site em inglês", term: "short" },
        { id: uid(), text: "Estabelecer convênios internacionais", term: "medium" },
        { id: uid(), text: "Receber professores visitantes internacionais", term: "long" },
      ],
      actions: [
        { id: uid(), text: "Traduzir site e materiais para inglês", term: "short" },
        { id: uid(), text: "Participar de redes internacionais de pesquisa", term: "medium" },
        { id: uid(), text: "Implementar programa de doutorado sanduíche", term: "long" },
      ],
      indicators: [
        { id: uid(), text: "Número de convênios internacionais" },
        { id: uid(), text: "Mobilidades internacionais/ano" },
        { id: uid(), text: "Publicações com coautoria internacional" },
      ],
    },
    {
      id: "infraestrutura",
      name: "Infraestrutura",
      objective: "Garantir infraestrutura adequada para ensino e pesquisa",
      goals: [
        { id: uid(), text: "Modernizar laboratórios e equipamentos", term: "medium" },
        { id: uid(), text: "Ampliar acervo bibliográfico digital", term: "short" },
      ],
      actions: [
        { id: uid(), text: "Realizar levantamento de necessidades de infraestrutura", term: "short" },
        { id: uid(), text: "Captar recursos para modernização", term: "medium" },
      ],
      indicators: [
        { id: uid(), text: "Investimento em infraestrutura (R$)" },
        { id: uid(), text: "Satisfação discente com infraestrutura" },
      ],
    },
    {
      id: "autoavaliacao",
      name: "Autoavaliação e Gestão",
      objective: "Implementar cultura de autoavaliação contínua",
      goals: [
        { id: uid(), text: "Criar comissão de autoavaliação", term: "short" },
        { id: uid(), text: "Implementar ciclo anual de avaliação", term: "medium" },
      ],
      actions: [
        { id: uid(), text: "Definir indicadores de acompanhamento", term: "short" },
        { id: uid(), text: "Aplicar pesquisa de satisfação com egressos", term: "medium" },
      ],
      indicators: [
        { id: uid(), text: "Relatórios de autoavaliação produzidos" },
        { id: uid(), text: "Taxa de resposta de egressos" },
      ],
    },
  ];

  return dimensions;
}
