/**
 * Impact-based scientific scoring model.
 * Reduces dependency on Qualis by using real-world metrics:
 *   - Indexation (DOI, ISSN, OpenAlex presence)
 *   - Citations
 *   - International coauthorship
 *   - Qualis (optional, kept as a bonus signal)
 */

import type { Article, Researcher, ResearcherMetric, CitationEntry } from "@/hooks/useProgram";

// ── Per-article impact score ──────────────────────────────────

export interface ArticleImpactScore {
  articleId: string;
  title: string;
  researcherId: string;
  indexation: number;       // 0–30  (DOI, ISSN, indexed source)
  citations: number;        // 0–35
  internationalCoauth: number; // 0–20
  qualisBonus: number;      // 0–15  (optional)
  total: number;            // 0–100
  tier: "A" | "B" | "C" | "D" | "E";
  signals: string[];        // human-readable signals found
}

export interface ResearcherImpactScore {
  researcherId: string;
  name: string;
  articleCount: number;
  avgScore: number;
  totalCitations: number;
  hIndex: number;
  tierDistribution: Record<string, number>;
  score: number; // 0–100 aggregated
}

export interface ProgramImpactScore {
  researcherScores: ResearcherImpactScore[];
  avgScore: number;
  totalArticles: number;
  totalCitations: number;
  avgHIndex: number;
  tierDistribution: Record<string, number>;
  qualifiedPct: number; // % of articles tier A or B
}

// ── Helpers ───────────────────────────────────────────────────

const QUALIS_POINTS: Record<string, number> = {
  A1: 15, A2: 13, A3: 11, A4: 9,
  B1: 7, B2: 5, B3: 3, B4: 1,
};

function hasInternationalCoauthorship(authors: string | null): boolean {
  if (!authors) return false;
  const lower = authors.toLowerCase();
  // Heuristic: look for common international patterns
  const intlPatterns = [
    "university", "univ.", "institut", "college", "école",
    "politecnico", "technische", "rijks", "eth ", "mit ",
    "cambridge", "oxford", "harvard", "stanford", "tokyo",
    "beijing", "berlin", "paris", "london", "nasa", "cern",
  ];
  // Check for country indicators or non-Portuguese names with affiliations
  return intlPatterns.some((p) => lower.includes(p));
}

function citationScore(citations: number): number {
  // Logarithmic scale: 0 cit = 0, 1–5 = 10, 6–20 = 18, 21–50 = 25, 50+ = 30, 100+ = 35
  if (citations <= 0) return 0;
  if (citations <= 2) return 8;
  if (citations <= 5) return 14;
  if (citations <= 10) return 18;
  if (citations <= 20) return 22;
  if (citations <= 50) return 28;
  if (citations <= 100) return 32;
  return 35;
}

function getTier(score: number): "A" | "B" | "C" | "D" | "E" {
  if (score >= 75) return "A";
  if (score >= 55) return "B";
  if (score >= 35) return "C";
  if (score >= 15) return "D";
  return "E";
}

// ── Score calculation ─────────────────────────────────────────

export function scoreArticle(article: Article): ArticleImpactScore {
  const signals: string[] = [];
  
  // Indexation (0–30)
  let indexation = 0;
  if (article.doi) { indexation += 15; signals.push("DOI"); }
  if (article.issn) { indexation += 10; signals.push("ISSN"); }
  if (article.doi) { indexation += 5; signals.push("Indexado (OpenAlex)"); } // DOI = findable in OpenAlex
  indexation = Math.min(indexation, 30);

  // Citations (0–35)
  const cit = article.citations || 0;
  const citPts = citationScore(cit);
  if (cit > 0) signals.push(`${cit} citações`);

  // International coauthorship (0–20)
  const intl = hasInternationalCoauthorship(article.authors);
  const intlPts = intl ? 20 : 0;
  if (intl) signals.push("Coautoria internacional");

  // Qualis bonus (0–15)
  const qPts = QUALIS_POINTS[article.qualis || ""] || 0;
  if (qPts > 0) signals.push(`Qualis ${article.qualis}`);

  const total = Math.min(indexation + citPts + intlPts + qPts, 100);

  return {
    articleId: article.id,
    title: article.title,
    researcherId: article.researcher_id,
    indexation,
    citations: citPts,
    internationalCoauth: intlPts,
    qualisBonus: qPts,
    total,
    tier: getTier(total),
    signals,
  };
}

export function scoreResearcher(
  researcher: Researcher,
  articles: Article[],
  metrics: ResearcherMetric | undefined,
): ResearcherImpactScore {
  const rArticles = articles.filter((a) => a.researcher_id === researcher.id);
  const scored = rArticles.map(scoreArticle);
  const avgScore = scored.length > 0
    ? scored.reduce((s, a) => s + a.total, 0) / scored.length
    : 0;

  const tierDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  scored.forEach((s) => { tierDist[s.tier]++; });

  const totalCitations = metrics?.total_citations || 0;
  const hIndex = metrics?.h_index || 0;

  // Researcher score: weighted average of article scores + bonus for h-index
  const hBonus = Math.min(hIndex * 2, 20); // up to 20 bonus points
  const score = Math.min(avgScore + hBonus, 100);

  return {
    researcherId: researcher.id,
    name: researcher.name,
    articleCount: rArticles.length,
    avgScore: Math.round(avgScore * 10) / 10,
    totalCitations,
    hIndex,
    tierDistribution: tierDist,
    score: Math.round(score * 10) / 10,
  };
}

export function scoreProgram(
  researchers: Researcher[],
  articles: Article[],
  metrics: ResearcherMetric[],
): ProgramImpactScore {
  const researcherScores = researchers.map((r) => {
    const m = metrics.find((m) => m.researcher_id === r.id);
    return scoreResearcher(r, articles, m);
  });

  const totalArticles = articles.length;
  const allScored = articles.map(scoreArticle);
  const tierDist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  allScored.forEach((s) => { tierDist[s.tier]++; });

  const qualifiedCount = tierDist.A + tierDist.B;
  const qualifiedPct = totalArticles > 0 ? (qualifiedCount / totalArticles) * 100 : 0;

  const avgScore = researcherScores.length > 0
    ? researcherScores.reduce((s, r) => s + r.score, 0) / researcherScores.length
    : 0;

  const totalCitations = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);
  const avgHIndex = researchers.length > 0
    ? metrics.reduce((s, m) => s + (m.h_index || 0), 0) / researchers.length
    : 0;

  return {
    researcherScores,
    avgScore: Math.round(avgScore * 10) / 10,
    totalArticles,
    totalCitations,
    avgHIndex: Math.round(avgHIndex * 10) / 10,
    tierDistribution: tierDist,
    qualifiedPct: Math.round(qualifiedPct * 10) / 10,
  };
}

export const TIER_COLORS: Record<string, string> = {
  A: "hsl(var(--primary))",
  B: "hsl(142, 71%, 45%)",
  C: "hsl(48, 96%, 53%)",
  D: "hsl(25, 95%, 53%)",
  E: "hsl(0, 84%, 60%)",
};

export const TIER_LABELS: Record<string, string> = {
  A: "Alto impacto",
  B: "Bom impacto",
  C: "Impacto moderado",
  D: "Impacto baixo",
  E: "Sem evidência de impacto",
};
