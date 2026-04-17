import { useState, useMemo, useEffect } from "react";
import type { ProgramData } from "@/hooks/useProgram";
import { getQuadrienio, isProjectInPeriod, isPGOrientation } from "@/lib/orientation-utils";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  Users, BookOpen, Wrench, Palette, Layers, GraduationCap, ClipboardCheck,
  Award, Network, TrendingUp, AlertTriangle, Info,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  data: ProgramData;
}

type PeriodMode = "quadrienio" | "custom" | "all";
type ProdType = "all" | "biblio" | "technical" | "artistic" | "other";

interface JournalMetric {
  issn: string;
  snip: number | null;
  sjr: number | null;
  citescore: number | null;
}

interface OtherProdRow {
  id: string;
  researcher_id: string;
  category: string;
  type: string | null;
  title: string | null;
  year: number | null;
}

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

const TYPE_COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "#f59e0b", "#8b5cf6", "#10b981"];

const SNIP_BUCKETS = [
  { key: "<0.5", min: -Infinity, max: 0.5, color: "#ef4444" },
  { key: "0.5–1", min: 0.5, max: 1, color: "#f59e0b" },
  { key: "1–2", min: 1, max: 2, color: "#10b981" },
  { key: ">2", min: 2, max: Infinity, color: "hsl(var(--accent))" },
];

function normalizeIssn(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/[^0-9X]/gi, "").toUpperCase();
}

const InstitutionalDashboard = ({ data }: Props) => {
  const [qStart, qEnd] = getQuadrienio();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");
  const [customStart, setCustomStart] = useState(qStart);
  const [customEnd, setCustomEnd] = useState(qEnd);
  const [researcherFilter, setResearcherFilter] = useState<string>("all");
  const [prodTypeFilter, setProdTypeFilter] = useState<ProdType>("all");

  const [journalMetrics, setJournalMetrics] = useState<JournalMetric[]>([]);
  const [otherProds, setOtherProds] = useState<OtherProdRow[]>([]);
  const [loadingExtras, setLoadingExtras] = useState(true);

  const startYear = periodMode === "quadrienio" ? qStart : periodMode === "custom" ? customStart : 1900;
  const endYear = periodMode === "quadrienio" ? qEnd : periodMode === "custom" ? customEnd : 9999;
  const periodLabel = periodMode === "quadrienio"
    ? `Quadriênio ${qStart}–${qEnd}`
    : periodMode === "custom" ? `${customStart}–${customEnd}` : "Todos os anos";

  // Load journal_metrics + other_productions for the program's researchers
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingExtras(true);
      const researcherIds = data.researchers.map((r) => r.id);
      const [jm, op] = await Promise.all([
        supabase.from("journal_metrics").select("issn, snip, sjr, citescore"),
        researcherIds.length
          ? supabase.from("other_productions").select("id, researcher_id, category, type, title, year")
              .in("researcher_id", researcherIds)
          : Promise.resolve({ data: [], error: null } as any),
      ]);
      if (cancelled) return;
      setJournalMetrics((jm.data as JournalMetric[]) || []);
      setOtherProds((op.data as OtherProdRow[]) || []);
      setLoadingExtras(false);
    })();
    return () => { cancelled = true; };
  }, [data.researchers]);

  const { researchers, articles, orientations, technicalProductions, reviewerActivities, projects } = data;

  // Filter helpers
  const matchResearcher = (rId: string) => researcherFilter === "all" || rId === researcherFilter;

  const fArticles = useMemo(
    () => articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear && matchResearcher(a.researcher_id)),
    [articles, startYear, endYear, researcherFilter]
  );
  const fTech = useMemo(
    () => technicalProductions.filter((t) => t.year && t.year >= startYear && t.year <= endYear && matchResearcher(t.researcher_id)),
    [technicalProductions, startYear, endYear, researcherFilter]
  );
  const fOther = useMemo(
    () => otherProds.filter((o) => o.year && o.year >= startYear && o.year <= endYear && matchResearcher(o.researcher_id)),
    [otherProds, startYear, endYear, researcherFilter]
  );
  const fOrientations = useMemo(
    () => orientations.filter((o) => o.year && o.year >= startYear && o.year <= endYear && matchResearcher(o.researcher_id)),
    [orientations, startYear, endYear, researcherFilter]
  );
  const fReviewer = useMemo(
    () => reviewerActivities.filter((r) => r.year && r.year >= startYear && r.year <= endYear && matchResearcher(r.researcher_id)),
    [reviewerActivities, startYear, endYear, researcherFilter]
  );
  const fProjects = useMemo(
    () => projects.filter((p) => isProjectInPeriod(p, startYear, endYear) && matchResearcher(p.researcher_id)),
    [projects, startYear, endYear, researcherFilter]
  );

  const artistic = fOther.filter((o) => o.category === "artistic");
  const otherOnly = fOther.filter((o) => o.category !== "artistic");

  // Filtered researchers count (if specific researcher, count = 1)
  const docentsCount = researcherFilter === "all" ? researchers.length : 1;

  // Apply production type filter to "main" totals
  const showBiblio = prodTypeFilter === "all" || prodTypeFilter === "biblio";
  const showTech = prodTypeFilter === "all" || prodTypeFilter === "technical";
  const showArt = prodTypeFilter === "all" || prodTypeFilter === "artistic";
  const showOther = prodTypeFilter === "all" || prodTypeFilter === "other";

  // Unique coauthors (across filtered articles), excluding own researchers
  const uniqueCoauthors = useMemo(() => {
    const own = new Set(researchers.map((r) => r.name.trim().toLowerCase()));
    const set = new Set<string>();
    fArticles.forEach((a) => {
      if (!a.authors) return;
      a.authors.split(/[;]/).forEach((raw) => {
        const name = raw.trim();
        if (!name) return;
        const key = name.toLowerCase();
        if (!own.has(key)) set.add(key);
      });
    });
    return set.size;
  }, [fArticles, researchers]);

  // Productions by year (combined biblio + tech + artistic + other)
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    const add = (y: number | null) => { if (y) map[y] = (map[y] || 0) + 1; };
    if (showBiblio) fArticles.forEach((a) => add(a.year));
    if (showTech) fTech.forEach((t) => add(t.year));
    if (showArt) artistic.forEach((o) => add(o.year));
    if (showOther) otherOnly.forEach((o) => add(o.year));
    return Object.entries(map)
      .map(([y, c]) => ({ year: Number(y), count: c }))
      .sort((a, b) => a.year - b.year);
  }, [fArticles, fTech, artistic, otherOnly, showBiblio, showTech, showArt, showOther]);

  // Distribution by type (pie)
  const byType = useMemo(() => {
    const items = [
      { name: "Bibliográficas", value: showBiblio ? fArticles.length : 0 },
      { name: "Técnicas", value: showTech ? fTech.length : 0 },
      { name: "Artísticas", value: showArt ? artistic.length : 0 },
      { name: "Outras", value: showOther ? otherOnly.length : 0 },
    ].filter((i) => i.value > 0);
    return items;
  }, [fArticles, fTech, artistic, otherOnly, showBiblio, showTech, showArt, showOther]);

  // SNIP analytics — match articles to journal_metrics by ISSN
  const snipMap = useMemo(() => {
    const m = new Map<string, number>();
    journalMetrics.forEach((jm) => {
      if (jm.snip != null) {
        const key = normalizeIssn(jm.issn);
        if (key && !m.has(key)) m.set(key, Number(jm.snip));
      }
    });
    return m;
  }, [journalMetrics]);

  const articlesWithSnip = useMemo(() => {
    return fArticles.map((a) => ({
      article: a,
      snip: snipMap.get(normalizeIssn(a.issn)) ?? null,
    }));
  }, [fArticles, snipMap]);

  const snipValues = articlesWithSnip.map((a) => a.snip).filter((v): v is number => v != null);
  const snipUnavailable = articlesWithSnip.length - snipValues.length;
  const avgSnipProgram = snipValues.length > 0
    ? snipValues.reduce((s, v) => s + v, 0) / snipValues.length
    : null;

  const avgSnipPerResearcher = useMemo(() => {
    const map: Record<string, number[]> = {};
    articlesWithSnip.forEach(({ article, snip }) => {
      if (snip == null) return;
      (map[article.researcher_id] ||= []).push(snip);
    });
    return researchers
      .filter((r) => map[r.id]?.length)
      .map((r) => ({
        name: r.name.length > 28 ? r.name.slice(0, 26) + "…" : r.name,
        avg: map[r.id].reduce((s, v) => s + v, 0) / map[r.id].length,
      }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 12);
  }, [articlesWithSnip, researchers]);

  const snipDistribution = useMemo(() => {
    return SNIP_BUCKETS.map((b) => ({
      bucket: b.key,
      count: snipValues.filter((v) => v >= b.min && v < b.max).length,
      color: b.color,
    }));
  }, [snipValues]);

  // KPIs
  const kpis = [
    { label: "Docentes", value: docentsCount, icon: Users, show: true },
    { label: "Prod. bibliográficas", value: fArticles.length, icon: BookOpen, show: showBiblio },
    { label: "Prod. técnicas", value: fTech.length, icon: Wrench, show: showTech },
    { label: "Prod. artísticas", value: artistic.length, icon: Palette, show: showArt },
    { label: "Outras produções", value: otherOnly.length, icon: Layers, show: showOther },
    { label: "Orientações", value: fOrientations.length, icon: GraduationCap, show: true },
    { label: "Atividades (parecer)", value: fReviewer.length, icon: ClipboardCheck, show: true },
    { label: "Pós-graduação (PG)", value: fOrientations.filter((o) => isPGOrientation(o.type)).length, icon: Award, show: true },
    { label: "Coautores únicos", value: uniqueCoauthors, icon: Network, show: showBiblio },
  ].filter((k) => k.show);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="h-4 w-4 text-accent" />
          Filtros institucionais
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <Label className="text-xs">Período</Label>
            <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="quadrienio">Quadriênio CAPES ({qStart}–{qEnd})</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
                <SelectItem value="all">Visão histórica</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodMode === "custom" && (
            <>
              <div>
                <Label className="text-xs">Ano inicial</Label>
                <Input type="number" value={customStart} onChange={(e) => setCustomStart(Number(e.target.value))} />
              </div>
              <div>
                <Label className="text-xs">Ano final</Label>
                <Input type="number" value={customEnd} onChange={(e) => setCustomEnd(Number(e.target.value))} />
              </div>
            </>
          )}
          <div>
            <Label className="text-xs">Docente</Label>
            <Select value={researcherFilter} onValueChange={setResearcherFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os docentes</SelectItem>
                {researchers.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Tipo de produção</Label>
            <Select value={prodTypeFilter} onValueChange={(v) => setProdTypeFilter(v as ProdType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="biblio">Bibliográfica</SelectItem>
                <SelectItem value="technical">Técnica</SelectItem>
                <SelectItem value="artistic">Artística/Cultural</SelectItem>
                <SelectItem value="other">Outras</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Dados referentes a <strong>{periodLabel}</strong>
          {researcherFilter !== "all" && ` · ${researchers.find((r) => r.id === researcherFilter)?.name}`}
          {prodTypeFilter !== "all" && ` · filtro de tipo aplicado`}
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* SNIP analytics */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-accent" />
          Impacto científico (SNIP)
        </div>

        {loadingExtras ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-20" /><Skeleton className="h-20" /><Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-md border bg-background p-4 text-center">
                <div className="text-2xl font-bold text-accent">
                  {avgSnipProgram != null ? avgSnipProgram.toFixed(2) : "—"}
                </div>
                <div className="text-xs text-muted-foreground">SNIP médio do programa</div>
              </div>
              <div className="rounded-md border bg-background p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{snipValues.length}</div>
                <div className="text-xs text-muted-foreground">Artigos com SNIP</div>
              </div>
              <div className="rounded-md border bg-background p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground">{snipUnavailable}</div>
                <div className="text-xs text-muted-foreground">Sem SNIP disponível</div>
              </div>
            </div>

            {snipValues.length === 0 ? (
              <Alert variant="default">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Nenhum SNIP disponível para os artigos do período. Importe métricas em <strong>journal_metrics</strong> (ISSN → SNIP),
                  manualmente ou via integração com OpenAlex/Scopus.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">Distribuição por faixa de SNIP</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={snipDistribution} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="bucket" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="count" name="Artigos" radius={[3, 3, 0, 0]}>
                          {snipDistribution.map((d) => <Cell key={d.bucket} fill={d.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">SNIP médio por docente (top 12)</div>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={avgSnipPerResearcher} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                        <YAxis type="category" dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={120} />
                        <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => v.toFixed(2)} />
                        <Bar dataKey="avg" name="SNIP médio" fill="hsl(var(--accent))" radius={[0, 3, 3, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold text-foreground">Produções por ano</div>
          <div className="h-64">
            {byYear.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byYear} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" name="Produções" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="text-sm font-semibold text-foreground">Distribuição por tipo</div>
          <div className="h-64">
            {byType.length === 0 ? (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Sem dados no período</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byType} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                    {byType.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Estrutura preparada para futura integração com OpenAlex/Scopus (grafo de coautoria, internacionalização, métricas automáticas).
      </p>
    </div>
  );
};

export default InstitutionalDashboard;
