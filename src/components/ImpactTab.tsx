import { useMemo, useState } from "react";
import type { Article, Researcher, ResearcherMetric } from "@/hooks/useProgram";
import { getQuadrienio } from "@/lib/orientation-utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Zap, TrendingUp, Award, RefreshCw, CalendarDays } from "lucide-react";

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

  const articlesByDoi = filteredArticles.filter((a) => a.doi).length;
  const articlesByIssn = filteredArticles.filter((a) => a.issn).length;
  const hasMetrics = metrics.length > 0 && metrics.some((m) => (m.total_citations || 0) > 0 || (m.h_index || 0) > 0);
  const totalCitations = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);
  const avgHIndex = researchers.length > 0 ? (metrics.reduce((s, m) => s + (m.h_index || 0), 0) / researchers.length).toFixed(1) : "—";

  // Qualis distribution
  const qualisDist = useMemo(() => {
    const map: Record<string, number> = {};
    filteredArticles.forEach((a) => {
      const q = a.qualis || "Sem Qualis";
      map[q] = (map[q] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, count }));
  }, [filteredArticles]);

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

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: "Total artigos", value: filteredArticles.length, icon: TrendingUp },
          { label: "Com DOI", value: articlesByDoi, icon: Zap },
          { label: "Com ISSN", value: articlesByIssn, icon: Zap },
          { label: "Citações totais", value: hasMetrics ? totalCitations : "—", icon: Award },
          { label: "h-index médio", value: hasMetrics ? avgHIndex : "—", icon: Award },
          { label: "Qualificados", value: filteredArticles.filter((a) => a.qualis && a.qualis !== "Sem Qualis").length, icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* No data warning */}
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
            {fetchingAll ? fetchProgress : `Buscar todas as citações (${articles.filter((a) => a.doi).length} DOIs)`}
          </Button>
          {!hasMetrics && (
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Sem dados de citações — busque via DOI ou insira manualmente.
            </span>
          )}
        </div>
      )}

      {/* Qualis distribution */}
      {qualisDist.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Award className="h-4 w-4 text-accent" /> Distribuição Qualis
          </h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualisDist} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Artigos" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per researcher metrics */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-foreground">Métricas por pesquisador</h3>
        <div className="space-y-3">
          {researchers.map((r) => {
            const m = getMetric(r.id);
            const rArticles = filteredArticles.filter((a) => a.researcher_id === r.id);
            const withDoi = rArticles.filter((a) => a.doi).length;
            const isEditing = editingId === r.id;

            return (
              <div key={r.id} className="rounded-md border p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-foreground">{r.name}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" disabled={fetchingId === r.id || withDoi === 0}
                      onClick={() => handleFetch(r.id)}>
                      <RefreshCw className={`h-3.5 w-3.5 mr-1 ${fetchingId === r.id ? "animate-spin" : ""}`} />
                      {withDoi > 0 ? `Buscar (${withDoi} DOIs)` : "Sem DOI"}
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => {
                      setEditingId(r.id);
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
                <div className="grid grid-cols-4 gap-3 text-center text-sm">
                  <div><div className="font-bold text-foreground">{rArticles.length}</div><div className="text-xs text-muted-foreground">Artigos</div></div>
                  <div><div className="font-bold text-foreground">{m?.total_citations || 0}</div><div className="text-xs text-muted-foreground">Citações</div></div>
                  <div><div className="font-bold text-foreground">{m?.h_index || 0}</div><div className="text-xs text-muted-foreground">h-index</div></div>
                  <div><div className="font-bold text-foreground">{m?.i10_index || 0}</div><div className="text-xs text-muted-foreground">i10-index</div></div>
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
                    <Button size="sm" onClick={() => handleSaveManual(r.id)}>Salvar</Button>
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
