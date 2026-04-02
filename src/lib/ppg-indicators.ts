import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado, getQuadrienio as getQ } from "@/lib/orientation-utils";

export interface DimensionScore {
  name: string;
  key: string;
  score: number; // 0–10
  indicators: { label: string; value: string | number; detail?: string }[];
  autoText: string;
}

export interface EvaluationResult {
  dimensions: DimensionScore[];
  overallScore: number;
  weights: Record<string, number>;
}

export const DEFAULT_WEIGHTS: Record<string, number> = {
  producao: 30,
  formacao: 20,
  impacto: 20,
  internacionalizacao: 10,
  insercaoSocial: 10,
  presencaDigital: 10,
};

function clamp(v: number, min = 0, max = 10): number {
  return Math.max(min, Math.min(max, v));
}

function calcProducao(data: ProgramData, period: [number, number]): DimensionScore {
  const [qS, qE] = period;
  const { articles, researchers } = data;
  const qArticles = articles.filter((a) => a.year && a.year >= qS && a.year <= qE);
  const nDocentes = researchers.length || 1;
  const mediaDocente = qArticles.length / nDocentes;

  const qualisCounts: Record<string, number> = {};
  qArticles.forEach((a) => { if (a.qualis) qualisCounts[a.qualis] = (qualisCounts[a.qualis] || 0) + 1; });
  const qualificados = (qualisCounts["A1"] || 0) + (qualisCounts["A2"] || 0) + (qualisCounts["A3"] || 0) + (qualisCounts["A4"] || 0);
  const pctQualificado = qArticles.length > 0 ? (qualificados / qArticles.length) * 100 : 0;

  let score = clamp(mediaDocente * 2.5);
  if (pctQualificado >= 60) score = clamp(score + 1);
  if (pctQualificado >= 80) score = clamp(score + 1);

  const autoText = `No período ${qS}–${qE}, o programa produziu ${qArticles.length} artigos (média de ${mediaDocente.toFixed(1)} por docente). ` +
    `${qualificados} artigos (${pctQualificado.toFixed(0)}%) possuem classificação Qualis A1–A4. ` +
    (mediaDocente >= 3 ? "A produtividade do corpo docente é considerada elevada." : mediaDocente >= 1.5 ? "A produtividade está em nível intermediário." : "A produtividade necessita de atenção.");

  return {
    name: "Produção Científica", key: "producao", score,
    indicators: [
      { label: "Artigos no período", value: qArticles.length },
      { label: "Média por docente", value: mediaDocente.toFixed(1) },
      { label: "Artigos qualificados (A1–A4)", value: `${qualificados} (${pctQualificado.toFixed(0)}%)` },
      { label: "Total geral de artigos", value: articles.length },
    ],
    autoText,
  };
}

function calcFormacao(data: ProgramData, period: [number, number]): DimensionScore {
  const [qS, qE] = period;
  const { orientations, researchers } = data;
  const nDocentes = researchers.length || 1;

  const pgOrientations = orientations.filter((o) => isPGOrientation(o.type));
  const qOrient = pgOrientations.filter((o) => o.year && o.year >= qS && o.year <= qE);
  const concluded = qOrient.filter((o) => o.status === "concluded");
  const mestrado = concluded.filter((o) => isMestrado(o.type));
  const doutorado = concluded.filter((o) => isDoutorado(o.type));
  const inProgress = qOrient.filter((o) => o.status !== "concluded");
  const mediaOrient = concluded.length / nDocentes;

  let score = clamp(mediaOrient * 2);
  if (doutorado.length >= nDocentes) score = clamp(score + 1);

  const excluded = orientations.length - pgOrientations.length;
  const autoText = `No período ${qS}–${qE}, foram concluídas ${concluded.length} orientações de pós-graduação (${mestrado.length} mestrados, ${doutorado.length} doutorados), ` +
    `com ${inProgress.length} em andamento. Média de ${mediaOrient.toFixed(1)} por docente. ` +
    (excluded > 0 ? `(${excluded} orientações de graduação/IC/TCC/especialização excluídas do cálculo) ` : "") +
    (mediaOrient >= 3 ? "A formação discente é robusta." : "Há espaço para ampliação da formação.");

  return {
    name: "Formação", key: "formacao", score,
    indicators: [
      { label: "Orientações PG concluídas", value: concluded.length },
      { label: "Mestrados", value: mestrado.length },
      { label: "Doutorados", value: doutorado.length },
      { label: "Em andamento (PG)", value: inProgress.length },
      { label: "Média por docente", value: mediaOrient.toFixed(1) },
    ],
    autoText,
  };
}

function calcImpacto(data: ProgramData): DimensionScore {
  const { metrics, researchers, articles } = data;
  const nDocentes = researchers.length || 1;
  const hasData = metrics.length > 0 && metrics.some((m) => (m.total_citations || 0) > 0 || (m.h_index || 0) > 0);
  const totalCit = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);
  const avgH = metrics.length > 0 ? metrics.reduce((s, m) => s + (m.h_index || 0), 0) / nDocentes : 0;
  const artWithDoi = articles.filter((a) => a.doi).length;
  const pctDoi = articles.length > 0 ? (artWithDoi / articles.length) * 100 : 0;

  let score = -1; // -1 means no data
  if (hasData) {
    score = clamp(avgH * 0.8);
    if (pctDoi >= 70) score = clamp(score + 1);
  }

  const autoText = !hasData
    ? `Sem dados de citações disponíveis. Insira manualmente ou busque via DOI na aba de Impacto para calcular este indicador.`
    : `O programa acumula ${totalCit} citações, com h-index médio de ${avgH.toFixed(1)} por docente. ` +
      `${pctDoi.toFixed(0)}% dos artigos possuem DOI registrado. ` +
      (avgH >= 10 ? "O impacto científico é expressivo." : avgH >= 5 ? "O impacto é moderado." : "O impacto pode ser fortalecido.");

  return {
    name: "Impacto Científico", key: "impacto", score: hasData ? score : -1,
    indicators: [
      { label: "Total de citações", value: hasData ? totalCit : "Sem dados" },
      { label: "h-index médio", value: hasData ? avgH.toFixed(1) : "Sem dados" },
      { label: "Artigos com DOI", value: `${artWithDoi} (${pctDoi.toFixed(0)}%)` },
    ],
    autoText,
  };
}

function calcInternacionalizacao(data: ProgramData): DimensionScore {
  const { program, projects } = data;
  const hasEnglish = program.has_english_version || false;
  const intScore = program.internationalization_score || 0;
  const intProjects = projects.filter((p) => {
    const inst = p.partner_institution || "";
    return inst.toLowerCase().includes("university") || inst.toLowerCase().includes("univ") || inst.toLowerCase().includes("international");
  });
  const langs = program.website_languages ? program.website_languages.split(",").map((l) => l.trim()).filter(Boolean) : [];

  let score = intScore / 10;
  if (hasEnglish) score = clamp(score + 2);
  if (intProjects.length >= 3) score = clamp(score + 1);
  score = clamp(score);

  const autoText = `O programa ${hasEnglish ? "possui" : "não possui"} versão em inglês do site. ` +
    `${intProjects.length} projetos envolvem instituições internacionais. ` +
    `Idiomas do site: ${langs.length > 0 ? langs.join(", ") : "não informado"}. ` +
    (score >= 7 ? "A internacionalização é forte." : score >= 4 ? "A internacionalização está em desenvolvimento." : "A internacionalização necessita de atenção.");

  return {
    name: "Internacionalização", key: "internacionalizacao", score,
    indicators: [
      { label: "Versão em inglês", value: hasEnglish ? "Sim" : "Não" },
      { label: "Projetos internacionais", value: intProjects.length },
      { label: "Idiomas do site", value: langs.length > 0 ? langs.join(", ") : "—" },
      { label: "Score internacionalização", value: intScore },
    ],
    autoText,
  };
}

function calcInsercaoSocial(data: ProgramData): DimensionScore {
  const { technicalProductions, projects, reviewerActivities } = data;
  const socialTypes = ["interview", "mediaParticipation", "eventOrganization"];
  const socialProds = technicalProductions.filter((p) => socialTypes.includes(p.type));
  const extensionProjects = projects.filter((p) => p.type === "extension");
  const pareceres = reviewerActivities.length;

  let score = clamp((socialProds.length + extensionProjects.length) * 0.5 + pareceres * 0.1);

  const autoText = `O programa possui ${socialProds.length} produções de inserção social (entrevistas, participações em mídia, organização de eventos), ` +
    `${extensionProjects.length} projetos de extensão e ${pareceres} atividades de parecerista. ` +
    (score >= 7 ? "A inserção social é significativa." : "A inserção social pode ser ampliada.");

  return {
    name: "Inserção Social", key: "insercaoSocial", score,
    indicators: [
      { label: "Produções sociais", value: socialProds.length },
      { label: "Projetos de extensão", value: extensionProjects.length },
      { label: "Pareceres", value: pareceres },
    ],
    autoText,
  };
}

function calcPresencaDigital(data: ProgramData): DimensionScore {
  const { program } = data;
  const socials = [program.social_instagram, program.social_linkedin, program.social_youtube, program.social_twitter, program.social_facebook];
  const active = socials.filter(Boolean).length;
  const hasWebsite = !!program.website_url;
  const pct = ((active + (hasWebsite ? 1 : 0)) / 6) * 100;

  let score = clamp(pct / 10);

  const autoText = `O programa possui ${active} rede(s) social(is) ativa(s) e ${hasWebsite ? "tem" : "não tem"} site cadastrado. ` +
    `Presença digital: ${pct.toFixed(0)}%. ` +
    (score >= 7 ? "A visibilidade digital é boa." : "Recomenda-se ampliar a presença digital.");

  return {
    name: "Presença Digital", key: "presencaDigital", score,
    indicators: [
      { label: "Redes sociais ativas", value: `${active}/5` },
      { label: "Site cadastrado", value: hasWebsite ? "Sim" : "Não" },
      { label: "Presença digital", value: `${pct.toFixed(0)}%` },
    ],
    autoText,
  };
}

export function evaluateProgram(data: ProgramData, weights = DEFAULT_WEIGHTS, period?: [number, number]): EvaluationResult {
  const effectivePeriod = period || getQ();
  const dimensions = [
    calcProducao(data, effectivePeriod),
    calcFormacao(data, effectivePeriod),
    calcImpacto(data),
    calcInternacionalizacao(data),
    calcInsercaoSocial(data),
    calcPresencaDigital(data),
  ];

  const totalWeight = Object.values(weights).reduce((s, w) => s + w, 0) || 1;
  const overallScore = dimensions.reduce((s, d) => {
    const w = weights[d.key] || 0;
    return s + (d.score * w) / totalWeight;
  }, 0);

  return { dimensions, overallScore: Math.round(overallScore * 10) / 10, weights };
}
