import { useMemo, useState } from "react";
import type { Article, Researcher, ResearcherMetric } from "@/hooks/useProgram";
import { getQuadrienio } from "@/lib/orientation-utils";
import {
  scoreArticle, scoreProgram,
  TIER_COLORS, TIER_LABELS,
  type ArticleImpactScore,
} from "@/lib/impact-scoring";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Zap, TrendingUp, Award, RefreshCw, CalendarDays, BarChart3, Target } from "lucide-react";

type PeriodMode = "quadrienio" | "custom" | "all";

interface Props {
  articles: Article[];
  researchers: Researcher[];
  metrics: ResearcherMetric[];
  onFetchCitations: (researcherId: string) => Promise<void>;
  onFetchAllCitations: (onProgress?: (current: number, total: number, name: string) => void) => Promise<void>;
  onUpdateMetrics: (researcherId: string, m: { total_citations: number; h_index: number; i10_index: number; source: string }) => Promise<void>;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

const ImpactTab = ({ articles, researchers, metrics, onFetchCitations, onFetchAllCitations, onUpdateMetrics }: Props) => {
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [fetchingAll, setFetchingAll] = useState(false);
  const [fetchProgress, setFetchProgress] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState({ total_citations: 0, h_index: 0, i10_index: 0 });
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");

  const [qStart, qEnd] = getQuadrienio();
  const years = useMemo(() => {
    const set = new Set<number>();
    articles.forEach((a) => { if (a.year) set.add(a.year); });
    return Array.from(set).sort((a, b) => a - b);
  }, [articles]);

  const [customStart, setCustomStart] = useState<number>(years[0] || qStart);
  const [customEnd, setCustomEnd] = useState<number>(years[years.length - 1] || qEnd);

  const effectiveStart = periodMode === "quadrienio" ? qStart : periodMode === "custom" ? customStart : 0;
  const effectiveEnd = periodMode === "quadrienio" ? qEnd : periodMode === "custom" ? customEnd : 9999;

  const filteredArticles = useMemo(() =>
    periodMode === "all"
      ? articles
      : articles.filter((a) => a.year && a.year >= effectiveStart && a.year <= effectiveEnd),
    [articles, effectiveStart, effectiveEnd, periodMode]
  );

  // Impact scores
  const scoredArticles = useMemo(() => filteredArticles.map(scoreArticle), [filteredArticles]);
  const programScore = useMemo(() => scoreProgram(researchers, filteredArticles, metrics), [researchers, filteredArticles, metrics]);

  const hasMetrics = metrics.length > 0 && metrics.some((m) => (m.total_citations || 0) > 0 || (m.h_index || 0) > 0);

  // Tier distribution chart data
  const tierData = useMemo(() => {
    const tiers = ["A", "B", "C", "D", "E"];
    return tiers.map((t) => ({
      name: t,
      count: programScore.tierDistribution[t] || 0,
      label: TIER_LABELS[t],
    }));
  }, [programScore]);

  // Radar data per dimension (avg across articles)
  const radarData = useMemo(() => {
    if (scoredArticles.length === 0) return [];
    const avg = (key: keyof ArticleImpactScore) =>
      scoredArticles.reduce((s, a) => s + (a[key] as number), 0) / scoredArticles.length;
    return [
      { dim: "Indexação", value: Math.round(avg("indexation") / 30 * 100), fullMark: 100 },
      { dim: "Citações", value: Math.round(avg("citations") / 35 * 100), fullMark: 100 },
      { dim: "Coautoria Intl.", value: Math.round(avg("internationalCoauth") / 20 * 100), fullMark: 100 },
      { dim: "Qualis", value: Math.round(avg("qualisBonus") / 15 * 100), fullMark: 100 },
    ];
  }, [scoredArticles]);

  const handleFetch = async (researcherId: string) => {
    setFetchingId(researcherId);
    await onFetchCitations(researcherId);
    setFetchingId(null);
  };

  const handleSaveManual = async (researcherId: string) => {
    await onUpdateMetrics(researcherId, { ...editValues, source: "manual" });
    setEditingId(null);
  };

  const getMetric = (researcherId: string) => metrics.find((m) => m.researcher_id === researcherId);

  return (
    <div className="space-y-6">
      {/* Period filter */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-4">
        <CalendarDays className="h-4 w-4 text-accent" />
        <div className="space-y-1">
          <Label className="text-xs">Período</Label>
          <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
            <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quadrienio">Quadriênio ({qStart}–{qEnd})</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodMode === "custom" && (
          <>
            <div className="space-y-1">
              <Label className="text-xs">Início</Label>
              <Input type="number" className="w-24 h-8" value={customStart} onChange={(e) => setCustomStart(+e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fim</Label>
              <Input type="number" className="w-24 h-8" value={customEnd} onChange={(e) => setCustomEnd(+e.target.value)} />
            </div>
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">
          {filteredArticles.length} artigos no período
        </span>
      </div>

      {/* Program-level KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Score PPG", value: programScore.avgScore.toFixed(0), icon: Target, highlight: true },
          { label: "Artigos", value: filteredArticles.length, icon: TrendingUp },
          { label: "Qualificados (A+B)", value: `${programScore.qualifiedPct}%`, icon: Award },
          { label: "Citações totais", value: programScore.totalCitations, icon: Zap },
          { label: "h-index médio", value: programScore.avgHIndex, icon: BarChart3 },
          { label: "Docentes", value: researchers.length, icon: TrendingUp },
        ].map(({ label, value, icon: Icon, highlight }) => (
          <div key={label} className={`rounded-lg border p-4 text-center ${highlight ? "bg-primary/10 border-primary/30" : "bg-card"}`}>
            <Icon className={`h-4 w-4 mx-auto mb-1 ${highlight ? "text-primary" : "text-accent"}`} />
            <div className={`text-2xl font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Tier distribution */}
        {tierData.some((t) => t.count > 0) && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Award className="h-4 w-4 text-accent" /> Distribuição por Impacto
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tierData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number, _: string, p: any) => [v, p.payload.label]} />
                  <Bar dataKey="count" name="Artigos" radius={[3, 3, 0, 0]}>
                    {tierData.map((entry) => (
                      <Cell key={entry.name} fill={TIER_COLORS[entry.name]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {Object.entries(TIER_LABELS).map(([t, label]) => (
                <span key={t} className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: TIER_COLORS[t] }} />
                  {t}: {label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Radar chart */}
        {radarData.length > 0 && (
          <div className="rounded-lg border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-accent" /> Perfil de Impacto (média)
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="dim" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} />
                  <Radar name="Score" dataKey="value" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Fetch citations */}
      {researchers.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="default"
            size="sm"
            disabled={fetchingAll || articles.filter((a) => a.doi).length === 0}
            onClick={async () => {
              setFetchingAll(true);
              setFetchProgress("Iniciando...");
              await onFetchAllCitations((current, total, name) => {
                setFetchProgress(`${current}/${total} — ${name}`);
              });
              setFetchingAll(false);
              setFetchProgress("");
            }}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${fetchingAll ? "animate-spin" : ""}`} />
            {fetchingAll ? fetchProgress : `Buscar citações (${articles.filter((a) => a.doi).length} DOIs)`}
          </Button>
          {!hasMetrics && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Sem dados de citações — busque via DOI ou insira manualmente.
            </span>
          )}
        </div>
      )}

      {/* Per researcher scores */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Score por Docente</h3>
        <div className="space-y-3">
          {programScore.researcherScores.map((rs) => {
            const m = getMetric(rs.researcherId);
            const rArticles = filteredArticles.filter((a) => a.researcher_id === rs.researcherId);
            const withDoi = rArticles.filter((a) => a.doi).length;
            const isEditing = editingId === rs.researcherId;

            return (
              <div key={rs.researcherId} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{rs.name}</span>
                    <Badge variant={rs.score >= 55 ? "default" : rs.score >= 35 ? "secondary" : "outline"} className="text-xs">
                      Score: {rs.score}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={fetchingId === rs.researcherId || withDoi === 0}
                      onClick={() => handleFetch(rs.researcherId)}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingId === rs.researcherId ? "animate-spin" : ""}`} />
                      {withDoi > 0 ? `Buscar (${withDoi} DOIs)` : "Sem DOI"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingId(rs.researcherId);
                      setEditValues({
                        total_citations: m?.total_citations || 0,
                        h_index: m?.h_index || 0,
                        i10_index: m?.i10_index || 0,
                      });
                    }}>
                      Editar manual
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-3 text-center text-sm">
                  <div><div className="font-bold text-foreground">{rs.articleCount}</div><div className="text-xs text-muted-foreground">Artigos</div></div>
                  <div><div className="font-bold text-foreground">{rs.totalCitations}</div><div className="text-xs text-muted-foreground">Citações</div></div>
                  <div><div className="font-bold text-foreground">{rs.hIndex}</div><div className="text-xs text-muted-foreground">h-index</div></div>
                  <div><div className="font-bold text-foreground">{rs.avgScore.toFixed(0)}</div><div className="text-xs text-muted-foreground">Score médio</div></div>
                  <div className="flex justify-center gap-1">
                    {["A", "B", "C", "D", "E"].map((t) => (
                      rs.tierDistribution[t] > 0 && (
                        <span key={t} className="text-xs font-mono px-1.5 py-0.5 rounded" style={{ backgroundColor: TIER_COLORS[t] + "22", color: TIER_COLORS[t] }}>
                          {t}:{rs.tierDistribution[t]}
                        </span>
                      )
                    ))}
                  </div>
                </div>
                {isEditing && (
                  <div className="flex items-end gap-3 pt-2 border-t">
                    <div className="space-y-1">
                      <Label className="text-xs">Citações</Label>
                      <Input type="number" className="w-24 h-8" value={editValues.total_citations} onChange={(e) => setEditValues((v) => ({ ...v, total_citations: +e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">h-index</Label>
                      <Input type="number" className="w-24 h-8" value={editValues.h_index} onChange={(e) => setEditValues((v) => ({ ...v, h_index: +e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">i10-index</Label>
                      <Input type="number" className="w-24 h-8" value={editValues.i10_index} onChange={(e) => setEditValues((v) => ({ ...v, i10_index: +e.target.value }))} />
                    </div>
                    <Button size="sm" onClick={() => handleSaveManual(rs.researcherId)}>Salvar</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancelar</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ImpactTab;
