// ============================================================
// Lattes XML Parser – Comprehensive extraction for CAPES panel
// ============================================================

// ---------- Shared types ----------

export interface Production {
  type: ProductionType;
  category: ProductionCategory;
  title: string;
  year: string;
  authors: string;
  researcher: string;
  extra: Record<string, string>;
}

export type ProductionCategory =
  | "bibliographic"
  | "technical"
  | "socialInsertion";

export type ProductionType =
  | "article"
  | "book"
  | "bookChapter"
  | "eventWork"
  | "consultancy"
  | "product"
  | "software"
  | "technicalReport"
  | "interview"
  | "mediaParticipation"
  | "eventOrganization";

export interface Orientation {
  type: "concluded" | "inProgress";
  kind: string;
  title: string;
  year: string;
  student: string;
  researcher: string;
}

export interface Project {
  type: "research" | "extension" | "other";
  title: string;
  yearStart: string;
  yearEnd: string;
  institution: string;
  funding: string;
  funder: string;
  researcher: string;
}

export interface ReviewerActivityParsed {
  journalEvent: string;
  type: string;
  year: string;
}

export interface ResearcherInfo {
  name: string;
  gender: string;
  researchLines: string[];
  productions: Production[];
  orientations: Orientation[];
  projects: Project[];
  reviewerActivities: ReviewerActivityParsed[];
}

export interface ParsedData {
  researchers: ResearcherInfo[];
  allProductions: Production[];
  allOrientations: Orientation[];
  allProjects: Project[];
  institutions: string[];
  funders: string[];
}

// ---------- Label maps ----------

export const PRODUCTION_TYPE_LABELS: Record<ProductionType, string> = {
  article: "Artigos",
  book: "Livros",
  bookChapter: "Capítulos de livros",
  eventWork: "Trabalhos em eventos",
  consultancy: "Consultorias",
  product: "Produtos / Processos",
  software: "Softwares",
  technicalReport: "Relatórios técnicos",
  interview: "Entrevistas",
  mediaParticipation: "Participação em mídia",
  eventOrganization: "Organização de eventos",
};

export const PRODUCTION_CATEGORY_LABELS: Record<ProductionCategory, string> = {
  bibliographic: "Produção bibliográfica",
  technical: "Produção técnica",
  socialInsertion: "Inserção social",
};

// ---------- Helpers ----------

function getAttr(el: Element | null, ...attrs: string[]): string {
  if (!el) return "";
  for (const a of attrs) {
    const v = el.getAttribute(a);
    if (v) return v;
  }
  return "";
}

function getAuthors(parent: Element): string {
  const els = parent.querySelectorAll("AUTORES");
  const names: string[] = [];
  els.forEach((el) => {
    const n = getAttr(el, "NOME-COMPLETO-DO-AUTOR", "NOME-PARA-CITACAO");
    if (n) names.push(n);
  });
  return names.join("; ") || "—";
}

// ---------- Main parser ----------

export function parseLattesXML(xmlString: string): ResearcherInfo {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const dadosGerais = doc.querySelector("DADOS-GERAIS");
  const name = getAttr(dadosGerais, "NOME-COMPLETO") || "Pesquisador desconhecido";
  const sexoRaw = getAttr(dadosGerais, "SEXO");
  const gender =
    sexoRaw === "MASCULINO" ? "Masculino" :
    sexoRaw === "FEMININO" ? "Feminino" : "Não informado";

  // Research lines
  const researchLines: string[] = [];
  doc.querySelectorAll("LINHA-DE-PESQUISA").forEach((el) => {
    const t = getAttr(el, "TITULO-DA-LINHA-DE-PESQUISA");
    if (t && !researchLines.includes(t)) researchLines.push(t);
  });

  const productions: Production[] = [];
  const orientations: Orientation[] = [];
  const projects: Project[] = [];
  const reviewerActivities: ReviewerActivityParsed[] = [];

  // ---- Bibliographic production ----

  // Articles
  doc.querySelectorAll("ARTIGO-PUBLICADO").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-ARTIGO");
    const det = el.querySelector("DETALHAMENTO-DO-ARTIGO");
    productions.push({
      type: "article",
      category: "bibliographic",
      title: getAttr(db, "TITULO-DO-ARTIGO", "TITULO-DO-ARTIGO-INGLES") || "Sem título",
      year: getAttr(db, "ANO-DO-ARTIGO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {
        journal: getAttr(det, "TITULO-DO-PERIODICO-OU-REVISTA"),
        doi: getAttr(db, "DOI"),
        issn: getAttr(det, "ISSN"),
      },
    });
  });

  // Books
  doc.querySelectorAll("LIVRO-PUBLICADO-OU-ORGANIZADO").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-LIVRO");
    productions.push({
      type: "book",
      category: "bibliographic",
      title: getAttr(db, "TITULO-DO-LIVRO", "TITULO-DO-LIVRO-INGLES") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // Book chapters
  doc.querySelectorAll("CAPITULO-DE-LIVRO-PUBLICADO").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-CAPITULO");
    productions.push({
      type: "bookChapter",
      category: "bibliographic",
      title: getAttr(db, "TITULO-DO-CAPITULO-DO-LIVRO", "TITULO-DO-CAPITULO-DO-LIVRO-INGLES") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // Event works
  doc.querySelectorAll("TRABALHO-EM-EVENTOS").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-TRABALHO");
    const det = el.querySelector("DETALHAMENTO-DO-TRABALHO");
    productions.push({
      type: "eventWork",
      category: "bibliographic",
      title: getAttr(db, "TITULO-DO-TRABALHO", "TITULO-DO-TRABALHO-INGLES") || "Sem título",
      year: getAttr(db, "ANO-DO-TRABALHO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {
        event: getAttr(det, "NOME-DO-EVENTO"),
      },
    });
  });

  // ---- Technical production ----

  // Software
  doc.querySelectorAll("SOFTWARE").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-SOFTWARE");
    productions.push({
      type: "software",
      category: "technical",
      title: getAttr(db, "TITULO-DO-SOFTWARE", "TITULO-DO-SOFTWARE-INGLES") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // Products / processes
  doc.querySelectorAll("PRODUTO-TECNOLOGICO, PROCESSOS-OU-TECNICAS").forEach((el) => {
    const db = el.querySelector("[TITULO-DO-PRODUTO]") || el.querySelector("DADOS-BASICOS-DO-PRODUTO-TECNOLOGICO") || el.querySelector("DADOS-BASICOS-DE-PROCESSOS-OU-TECNICAS");
    productions.push({
      type: "product",
      category: "technical",
      title: getAttr(db, "TITULO-DO-PRODUTO", "TITULO-DO-PRODUTO-TECNOLOGICO", "TITULO") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // Technical reports
  doc.querySelectorAll("DEMAIS-TIPOS-DE-PRODUCAO-TECNICA").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DE-DEMAIS-TIPOS-DE-PRODUCAO-TECNICA");
    if (!db) return;
    const natureza = getAttr(db, "NATUREZA");
    if (natureza && natureza.toUpperCase().includes("RELATORIO")) {
      productions.push({
        type: "technicalReport",
        category: "technical",
        title: getAttr(db, "TITULO") || "Sem título",
        year: getAttr(db, "ANO") || "—",
        authors: getAuthors(el),
        researcher: name,
        extra: {},
      });
    } else if (natureza && (natureza.toUpperCase().includes("CONSULTORIA") || natureza.toUpperCase().includes("ASSESSORIA"))) {
      productions.push({
        type: "consultancy",
        category: "technical",
        title: getAttr(db, "TITULO") || "Sem título",
        year: getAttr(db, "ANO") || "—",
        authors: getAuthors(el),
        researcher: name,
        extra: {},
      });
    }
  });

  // ---- Social insertion ----

  // Interviews / media
  doc.querySelectorAll("ENTREVISTAS-MESAS-REDONDAS-PROGRAMAS-E-COMENTARIOS-NA-MIDIA").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DA-ENTREVISTA");
    productions.push({
      type: "interview",
      category: "socialInsertion",
      title: getAttr(db, "TITULO", "TITULO-INGLES") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // Event organization
  doc.querySelectorAll("ORGANIZACAO-DE-EVENTO").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DA-ORGANIZACAO-DE-EVENTO");
    productions.push({
      type: "eventOrganization",
      category: "socialInsertion",
      title: getAttr(db, "TITULO", "TITULO-INGLES") || "Sem título",
      year: getAttr(db, "ANO") || "—",
      authors: getAuthors(el),
      researcher: name,
      extra: {},
    });
  });

  // ---- Orientations ----

  const orientationSelectors: { selector: string; kind: string; status: "concluded" | "inProgress" }[] = [
    { selector: "ORIENTACOES-CONCLUIDAS-PARA-MESTRADO", kind: "Mestrado", status: "concluded" },
    { selector: "ORIENTACOES-CONCLUIDAS-PARA-DOUTORADO", kind: "Doutorado", status: "concluded" },
    { selector: "ORIENTACOES-CONCLUIDAS-PARA-POS-DOUTORADO", kind: "Pós-Doutorado", status: "concluded" },
    { selector: "OUTRAS-ORIENTACOES-CONCLUIDAS", kind: "Outra", status: "concluded" },
    { selector: "ORIENTACAO-EM-ANDAMENTO-DE-MESTRADO", kind: "Mestrado", status: "inProgress" },
    { selector: "ORIENTACAO-EM-ANDAMENTO-DE-DOUTORADO", kind: "Doutorado", status: "inProgress" },
    { selector: "ORIENTACAO-EM-ANDAMENTO-DE-POS-DOUTORADO", kind: "Pós-Doutorado", status: "inProgress" },
    { selector: "ORIENTACAO-EM-ANDAMENTO-DE-INICIACAO-CIENTIFICA", kind: "Iniciação Científica", status: "inProgress" },
    { selector: "OUTRAS-ORIENTACOES-EM-ANDAMENTO", kind: "Outra", status: "inProgress" },
  ];

  // Also try generic wrappers
  const concludedWrapper = doc.querySelector("ORIENTACOES-CONCLUIDAS");
  const inProgressWrapper = doc.querySelector("OUTRAS-ORIENTACOES");

  for (const { selector, kind, status } of orientationSelectors) {
    const scope = status === "concluded" ? concludedWrapper || doc : inProgressWrapper || doc;
    scope.querySelectorAll(selector).forEach((el) => {
      const db = el.querySelector("[TITULO]") || el.querySelector("[TITULO-DO-TRABALHO]");
      orientations.push({
        type: status,
        kind,
        title: getAttr(db || el, "TITULO", "TITULO-DO-TRABALHO") || "Sem título",
        year: getAttr(db || el, "ANO") || "—",
        student: getAttr(db || el, "NOME-DO-ORIENTADO", "NOME-DO-ORIENTANDO") ||
                 getAttr(el, "NOME-DO-ORIENTADO", "NOME-DO-ORIENTANDO") || "—",
        researcher: name,
      });
    });
  }

  // ---- Projects ----

  doc.querySelectorAll("PROJETO-DE-PESQUISA, PROJETO-DE-EXTENSAO").forEach((el) => {
    const tagName = el.tagName;
    const tipo: Project["type"] = tagName.includes("EXTENSAO") ? "extension" : "research";

    const title = getAttr(el, "NOME-DO-PROJETO") || "Sem título";
    const yearStart = getAttr(el, "ANO-INICIO") || "—";
    const yearEnd = getAttr(el, "ANO-FIM") || "em andamento";

    // Funding / institutions
    const financiamentos = el.querySelectorAll("FINANCIADOR-DO-PROJETO");
    const funders: string[] = [];
    const institutions: string[] = [];
    financiamentos.forEach((f) => {
      const nome = getAttr(f, "NOME-INSTITUICAO");
      const natureza = getAttr(f, "NATUREZA");
      if (nome) {
        funders.push(nome);
        if (!institutions.includes(nome)) institutions.push(nome);
      }
    });

    // Also check EQUIPE-DO-PROJETO for institutions
    el.querySelectorAll("INTEGRANTES-DO-PROJETO").forEach((integ) => {
      const inst = getAttr(integ, "NOME-INSTITUICAO");
      if (inst && !institutions.includes(inst)) institutions.push(inst);
    });

    projects.push({
      type: tipo,
      title,
      yearStart,
      yearEnd,
      institution: institutions.join("; ") || "—",
      funding: funders.length > 0 ? "Sim" : "Não",
      funder: funders.join("; ") || "—",
      researcher: name,
    });
  });

  // ---- Reviewer activities (parecerista) ----
  doc.querySelectorAll("PARECER").forEach((el) => {
    const db = el.querySelector("DADOS-BASICOS-DO-PARECER") || el;
    reviewerActivities.push({
      journalEvent: getAttr(db, "TITULO", "NOME-DO-PERIODICO", "NOME-DO-EVENTO") || getAttr(el, "TITULO") || "Sem título",
      type: getAttr(db, "NATUREZA") || "Parecer",
      year: getAttr(db, "ANO") || "—",
    });
  });

  // Also try ATUACAO-PROFISSIONAL for reviewer/editorial board
  doc.querySelectorAll("CORPO-EDITORIAL-REVISTA-CIENTIFICA, REVISOR-DE-PERIODICO").forEach((el) => {
    reviewerActivities.push({
      journalEvent: getAttr(el, "TITULO-DO-PERIODICO", "TITULO") || "Sem título",
      type: el.tagName.includes("CORPO") ? "Corpo editorial" : "Revisor",
      year: getAttr(el, "ANO") || "—",
    });
  });

  return { name, gender, researchLines, productions, orientations, projects, reviewerActivities };
}

// ---------- Aggregation helpers ----------

export function aggregateData(researchers: ResearcherInfo[]): ParsedData {
  const allProductions = researchers.flatMap((r) => r.productions);
  const allOrientations = researchers.flatMap((r) => r.orientations);
  const allProjects = researchers.flatMap((r) => r.projects);

  const institutionSet = new Set<string>();
  const funderSet = new Set<string>();

  allProjects.forEach((p) => {
    p.institution.split("; ").forEach((i) => { if (i && i !== "—") institutionSet.add(i); });
    p.funder.split("; ").forEach((f) => { if (f && f !== "—") funderSet.add(f); });
  });

  return {
    researchers,
    allProductions,
    allOrientations,
    allProjects,
    institutions: Array.from(institutionSet).sort(),
    funders: Array.from(funderSet).sort(),
  };
}

// Quadriênio helper
export function getQuadrienioRange(): [number, number] {
  const y = new Date().getFullYear();
  return [y - 3, y];
}

export function isInQuadrienio(year: string): boolean {
  const [start, end] = getQuadrienioRange();
  const y = parseInt(year);
  return !isNaN(y) && y >= start && y <= end;
}
