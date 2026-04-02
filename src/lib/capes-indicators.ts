import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado, getQuadrienio as getQ } from "@/lib/orientation-utils";

export interface CAPESSubItem {
  label: string;
  key: string;
  score: number; // 0–5
  description: string;
}

export interface CAPESQuesito {
  name: string;
  key: string;
  weight: number; // percentage
  subItems: CAPESSubItem[];
  score: number; // weighted average of sub-items (0–5)
  autoText: string;
}

export interface CAPESResult {
  quesitos: CAPESQuesito[];
  finalScore: number; // 1–7
  finalConcept: string;
  weights: CAPESWeights;
}

export interface CAPESWeights {
  programa: { weight: number; subWeights: Record<string, number> };
  formacao: { weight: number; subWeights: Record<string, number> };
  impacto: { weight: number; subWeights: Record<string, number> };
}

export const DEFAULT_CAPES_WEIGHTS: CAPESWeights = {
  programa: {
    weight: 30,
    subWeights: {
      proposta: 30,
      corpo_docente: 25,
      infraestrutura: 15,
      planejamento: 15,
      internacionalizacao: 15,
    },
  },
  formacao: {
    weight: 35,
    subWeights: {
      orientacoes: 30,
      qualidade_teses: 25,
      tempo_formacao: 20,
      destino_egressos: 15,
      producao_discente: 10,
    },
  },
  impacto: {
    weight: 35,
    subWeights: {
      producao_intelectual: 35,
      producao_tecnica: 20,
      insercao_social: 20,
      internacionalizacao_impacto: 15,
      presenca_digital: 10,
    },
  },
};

function clamp(v: number, min = 0, max = 5): number {
  return Math.max(min, Math.min(max, v));
}

function getQuadrienio(): [number, number] {
  return getQ();
}

function calcPrograma(data: ProgramData, subWeights: Record<string, number>): CAPESQuesito {
  const [qS, qE] = getQuadrienio();
  const { program, researchers, projects } = data;
  const nDocentes = researchers.length || 1;

  // Proposta do programa
  const hasArea = !!program.area;
  const hasModality = !!program.modality;
  const hasCode = !!program.program_code;
  const hasResearchLines = !!program.website_research_lines;
  const propostaScore = clamp(
    (hasArea ? 1 : 0) + (hasModality ? 1 : 0) + (hasCode ? 1 : 0) + (hasResearchLines ? 2 : 0)
  );

  // Corpo docente
  const docenteScore = clamp(
    nDocentes >= 15 ? 5 : nDocentes >= 10 ? 4 : nDocentes >= 5 ? 3 : nDocentes >= 3 ? 2 : 1
  );

  // Infraestrutura (based on website and digital presence)
  const hasWebsite = !!program.website_url;
  const infraScore = clamp(hasWebsite ? 3 : 1);

  // Planejamento (projects as proxy)
  const qProjects = projects.filter((p) => p.year_start && p.year_start >= qS);
  const planScore = clamp(qProjects.length >= 10 ? 5 : qProjects.length >= 5 ? 4 : qProjects.length >= 2 ? 3 : qProjects.length >= 1 ? 2 : 1);

  // Internacionalização do programa
  const hasEnglish = program.has_english_version || false;
  const intProjects = projects.filter((p) => {
    const inst = (p.partner_institution || "").toLowerCase();
    return inst.includes("university") || inst.includes("univ") || inst.includes("international");
  });
  const intScore = clamp((hasEnglish ? 2 : 0) + Math.min(3, intProjects.length));

  const subItems: CAPESSubItem[] = [
    { label: "Proposta do Programa", key: "proposta", score: propostaScore, description: `Área: ${hasArea ? "Sim" : "Não"}, Modalidade: ${hasModality ? "Sim" : "Não"}, Linhas: ${hasResearchLines ? "Sim" : "Não"}` },
    { label: "Corpo Docente", key: "corpo_docente", score: docenteScore, description: `${nDocentes} docentes permanentes` },
    { label: "Infraestrutura", key: "infraestrutura", score: infraScore, description: `Site: ${hasWebsite ? "Sim" : "Não"}` },
    { label: "Planejamento", key: "planejamento", score: planScore, description: `${qProjects.length} projetos no quadriênio` },
    { label: "Internacionalização", key: "internacionalizacao", score: intScore, description: `Inglês: ${hasEnglish ? "Sim" : "Não"}, ${intProjects.length} projetos internacionais` },
  ];

  const totalSubWeight = Object.values(subWeights).reduce((s, w) => s + w, 0) || 1;
  const score = subItems.reduce((s, item) => s + item.score * (subWeights[item.key] || 0), 0) / totalSubWeight;

  return {
    name: "1. Programa", key: "programa", weight: 0, score: Math.round(score * 10) / 10,
    subItems,
    autoText: `O programa possui ${nDocentes} docentes, ${hasArea ? "área definida" : "área não definida"} e ${hasResearchLines ? "linhas de pesquisa cadastradas" : "sem linhas de pesquisa"}. ${hasEnglish ? "Possui" : "Não possui"} versão em inglês do site.`,
  };
}

function calcFormacaoCAPES(data: ProgramData, subWeights: Record<string, number>): CAPESQuesito {
  const [qS, qE] = getQuadrienio();
  const { orientations, researchers, articles } = data;
  const nDocentes = researchers.length || 1;

  // Filter PG-only orientations
  const pgOrientations = orientations.filter((o) => isPGOrientation(o.type));
  const qOrient = pgOrientations.filter((o) => o.year && o.year >= qS && o.year <= qE);
  const concluded = qOrient.filter((o) => o.status === "concluded");
  const mestrado = concluded.filter((o) => isMestrado(o.type));
  const doutorado = concluded.filter((o) => isDoutorado(o.type));
  const inProgress = qOrient.filter((o) => o.status !== "concluded");

  // Orientações concluídas
  const mediaOrient = concluded.length / nDocentes;
  const orientScore = clamp(mediaOrient >= 4 ? 5 : mediaOrient >= 3 ? 4 : mediaOrient >= 2 ? 3 : mediaOrient >= 1 ? 2 : 1);

  // Qualidade das teses (proxy: Qualis dos artigos dos orientandos)
  const qArticles = articles.filter((a) => a.year && a.year >= qS && a.year <= qE);
  const qualificados = qArticles.filter((a) => ["A1", "A2", "A3", "A4"].includes(a.qualis || "")).length;
  const pctQual = qArticles.length > 0 ? qualificados / qArticles.length : 0;
  const teseScore = clamp(pctQual >= 0.6 ? 5 : pctQual >= 0.4 ? 4 : pctQual >= 0.2 ? 3 : pctQual >= 0.1 ? 2 : 1);

  // Tempo de formação (proxy: volume)
  const tempoScore = clamp(concluded.length >= 20 ? 5 : concluded.length >= 10 ? 4 : concluded.length >= 5 ? 3 : concluded.length >= 2 ? 2 : 1);

  // Destino egressos (not available, default moderate)
  const egressosScore = 3;

  // Produção discente
  const discenteScore = clamp(doutorado.length >= 5 ? 5 : doutorado.length >= 3 ? 4 : doutorado.length >= 1 ? 3 : mestrado.length >= 5 ? 2 : 1);

  const excluded = orientations.length - pgOrientations.length;
  const subItems: CAPESSubItem[] = [
    { label: "Orientações PG Concluídas", key: "orientacoes", score: orientScore, description: `${concluded.length} concluídas (${mediaOrient.toFixed(1)}/docente), ${inProgress.length} em andamento` },
    { label: "Qualidade das Teses/Dissertações", key: "qualidade_teses", score: teseScore, description: `${(pctQual * 100).toFixed(0)}% artigos qualificados (A1-A4)` },
    { label: "Tempo de Formação", key: "tempo_formacao", score: tempoScore, description: `${concluded.length} formações no período` },
    { label: "Destino dos Egressos", key: "destino_egressos", score: egressosScore, description: "Dados de egressos não disponíveis" },
    { label: "Produção Discente", key: "producao_discente", score: discenteScore, description: `${doutorado.length} doutorados, ${mestrado.length} mestrados` },
  ];

  const totalSubWeight = Object.values(subWeights).reduce((s, w) => s + w, 0) || 1;
  const score = subItems.reduce((s, item) => s + item.score * (subWeights[item.key] || 0), 0) / totalSubWeight;

  return {
    name: "2. Formação", key: "formacao", weight: 0, score: Math.round(score * 10) / 10,
    subItems,
    autoText: `No quadriênio ${qS}–${qE}, foram concluídas ${concluded.length} orientações de pós-graduação (${mestrado.length} mestrados, ${doutorado.length} doutorados), média de ${mediaOrient.toFixed(1)} por docente.` +
      (excluded > 0 ? ` (${excluded} orientações de graduação/IC/TCC excluídas)` : ""),
  };
}

function calcImpactoCAPES(data: ProgramData, subWeights: Record<string, number>): CAPESQuesito {
  const [qS, qE] = getQuadrienio();
  const { articles, technicalProductions, reviewerActivities, program, researchers, metrics, citationEntries } = data;
  const nDocentes = researchers.length || 1;
  const qArticles = articles.filter((a) => a.year && a.year >= qS && a.year <= qE);

  // Produção intelectual
  const mediaDoc = qArticles.length / nDocentes;
  const qualificados = qArticles.filter((a) => ["A1", "A2"].includes(a.qualis || "")).length;
  const prodScore = clamp(mediaDoc >= 3 ? 5 : mediaDoc >= 2 ? 4 : mediaDoc >= 1 ? 3 : mediaDoc >= 0.5 ? 2 : 1);

  // Produção técnica
  const qTech = technicalProductions.filter((t) => t.year && t.year >= qS && t.year <= qE);
  const techScore = clamp(qTech.length >= 10 ? 5 : qTech.length >= 5 ? 4 : qTech.length >= 2 ? 3 : qTech.length >= 1 ? 2 : 1);

  // Inserção social
  const socialTypes = ["interview", "mediaParticipation", "eventOrganization"];
  const socialProds = technicalProductions.filter((p) => socialTypes.includes(p.type));
  const pareceres = reviewerActivities.length;
  const socialScore = clamp((socialProds.length + pareceres) >= 15 ? 5 : (socialProds.length + pareceres) >= 8 ? 4 : (socialProds.length + pareceres) >= 3 ? 3 : 2);

  // Internacionalização - impacto
  const totalCit = citationEntries.reduce((s, c) => s + (c.total_citations || 0), 0) ||
    metrics.reduce((s, m) => s + (m.total_citations || 0), 0);
  const avgH = citationEntries.length > 0
    ? citationEntries.filter((c) => c.h_index).reduce((s, c) => s + (c.h_index || 0), 0) / nDocentes
    : metrics.length > 0 ? metrics.reduce((s, m) => s + (m.h_index || 0), 0) / nDocentes : 0;
  const intImpScore = clamp(avgH >= 15 ? 5 : avgH >= 10 ? 4 : avgH >= 5 ? 3 : avgH >= 2 ? 2 : 1);

  // Presença digital
  const socials = [program.social_instagram, program.social_linkedin, program.social_youtube, program.social_twitter, program.social_facebook];
  const activeSocials = socials.filter(Boolean).length;
  const digScore = clamp(activeSocials >= 4 ? 5 : activeSocials >= 3 ? 4 : activeSocials >= 2 ? 3 : activeSocials >= 1 ? 2 : 1);

  const subItems: CAPESSubItem[] = [
    { label: "Produção Intelectual", key: "producao_intelectual", score: prodScore, description: `${qArticles.length} artigos (${mediaDoc.toFixed(1)}/docente), ${qualificados} A1-A2` },
    { label: "Produção Técnica/Tecnológica", key: "producao_tecnica", score: techScore, description: `${qTech.length} produções técnicas no quadriênio` },
    { label: "Inserção Social", key: "insercao_social", score: socialScore, description: `${socialProds.length} produções sociais, ${pareceres} pareceres` },
    { label: "Internacionalização e Impacto", key: "internacionalizacao_impacto", score: intImpScore, description: `${totalCit} citações, h-index médio ${avgH.toFixed(1)}` },
    { label: "Presença Digital", key: "presenca_digital", score: digScore, description: `${activeSocials}/5 redes sociais ativas` },
  ];

  const totalSubWeight = Object.values(subWeights).reduce((s, w) => s + w, 0) || 1;
  const score = subItems.reduce((s, item) => s + item.score * (subWeights[item.key] || 0), 0) / totalSubWeight;

  return {
    name: "3. Impacto na Sociedade", key: "impacto", weight: 0, score: Math.round(score * 10) / 10,
    subItems,
    autoText: `O programa produziu ${qArticles.length} artigos no quadriênio com ${qualificados} em A1-A2. Acumula ${totalCit} citações com h-index médio de ${avgH.toFixed(1)}.`,
  };
}

function scoreToConceito(score: number): string {
  if (score >= 4.5) return "7 (Excelência)";
  if (score >= 4.0) return "6 (Muito Bom)";
  if (score >= 3.5) return "5 (Bom)";
  if (score >= 3.0) return "4 (Regular)";
  if (score >= 2.5) return "3 (Suficiente)";
  return "2 ou inferior";
}

function scoreTo7(score: number): number {
  // Convert 0-5 scale to 1-7 CAPES scale
  return Math.round(Math.min(7, Math.max(1, 1 + (score / 5) * 6)) * 10) / 10;
}

export function evaluateCAPES(data: ProgramData, weights: CAPESWeights = DEFAULT_CAPES_WEIGHTS): CAPESResult {
  const programa = calcPrograma(data, weights.programa.subWeights);
  programa.weight = weights.programa.weight;

  const formacao = calcFormacaoCAPES(data, weights.formacao.subWeights);
  formacao.weight = weights.formacao.weight;

  const impacto = calcImpactoCAPES(data, weights.impacto.subWeights);
  impacto.weight = weights.impacto.weight;

  const quesitos = [programa, formacao, impacto];
  const totalWeight = quesitos.reduce((s, q) => s + q.weight, 0) || 1;
  const weightedScore = quesitos.reduce((s, q) => s + (q.score * q.weight) / totalWeight, 0);
  const finalScore = scoreTo7(weightedScore);

  return {
    quesitos,
    finalScore,
    finalConcept: scoreToConceito(weightedScore),
    weights,
  };
}
