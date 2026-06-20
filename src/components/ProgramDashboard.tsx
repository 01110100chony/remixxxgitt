import { useState, useMemo } from "react";
import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, getQuadrienio } from "@/lib/orientation-utils";
import { isProjectInPeriod } from "@/lib/orientation-utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  CalendarDays, Users, BookOpen, Star, TrendingUp, Handshake, Landmark,
  GraduationCap, FolderKanban, Wrench, ClipboardCheck, Award, AlertTriangle,
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Props {
  data: ProgramData;
}

type PeriodMode = "quadrienio" | "custom" | "all";

const COLORS = [
  "#6366f1", "#ec4899", "#f59e0b", "#10b981",
  "#8b5cf6", "#06b6d4", "#f97316", "#84cc16", "#3b82f6", "#ef4444",
];
const GENDER_COLORS: Record<string, string> = {
  Homem: "#3b82f6",
  Mulher: "#ec4899",
  "Não informado": "hsl(var(--muted-foreground))",
};
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

const QUALIS_ORDER = ["A1", "A2", "A3", "A4", "B1", "B2", "B3", "B4", "C", "NP"];
const QUALIS_COLORS: Record<string, string> = {
  A1: "#10b981", A2: "#34d399", A3: "#6ee7b7", A4: "#a7f3d0",
  B1: "#3b82f6", B2: "#60a5fa", B3: "#93c5fd", B4: "#bfdbfe",
  C: "#f59e0b", NP: "#94a3b8",
};

const ProgramDashboard = ({ data }: Props) => {
  const [qStart, qEnd] = getQuadrienio();
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");
  const [customStart, setCustomStart] = useState(qStart);
  const [customEnd, setCustomEnd] = useState(qEnd);

  const startYear = periodMode === "quadrienio" ? qStart : periodMode === "custom" ? customStart : 1900;
  const endYear = periodMode === "quadrienio" ? qEnd : periodMode === "custom" ? customEnd : 9999;
  const periodLabel = periodMode === "quadrienio"
    ? `Quadriênio ${qStart}–${qEnd}`
    : periodMode === "custom" ? `${customStart}–${customEnd}` : "Todos os anos";

  const { researchers, articles, orientations, projects, technicalProductions, reviewerActivities, metrics } = data;

  // Filtered data by period
  const fArticles = useMemo(() => articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear), [articles, startYear, endYear]);
  const fOrientations = useMemo(() => orientations.filter((o) => o.year && o.year >= startYear && o.year <= endYear), [orientations, startYear, endYear]);
  const fProjects = useMemo(() => projects.filter((p) => isProjectInPeriod(p, startYear, endYear)), [projects, startYear, endYear]);
  const fTechProds = useMemo(() => technicalProductions.filter((t) => t.year && t.year >= startYear && t.year <= endYear), [technicalProductions, startYear, endYear]);
  const fReviewer = useMemo(() => reviewerActivities.filter((r) => r.year && r.year >= startYear && r.year <= endYear), [reviewerActivities, startYear, endYear]);

  const pgOrientations = useMemo(() => fOrientations.filter((o) => isPGOrientation(o.type)), [fOrientations]);
  const fundedProjects = fProjects.filter((p) => p.funding === "Sim");

  const institutions = useMemo(() => {
    const s = new Set<string>();
    fProjects.forEach((p) => { if (p.partner_institution) p.partner_institution.split("; ").forEach((i) => { if (i) s.add(i); }); });
    return s.size;
  }, [fProjects]);

  // By year
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    fArticles.forEach((a) => { if (a.year) map[a.year] = (map[a.year] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => +a - +b).map(([year, count]) => ({ year, count }));
  }, [fArticles]);

  // By year and Qualis
  const byYearQualis = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    fArticles.forEach((a) => {
      if (!a.year) return;
      const y = String(a.year);
      const q = a.qualis || "NP";
      if (!map[y]) map[y] = {};
      map[y][q] = (map[y][q] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([year, qualis]) => ({ year, ...qualis }));
  }, [fArticles]);
  const activeQualis = useMemo(() => {
    const s = new Set<string>();
    fArticles.forEach((a) => s.add(a.qualis || "NP"));
    return QUALIS_ORDER.filter((q) => s.has(q));
  }, [fArticles]);

  // By gender (researchers only, not filtered by period)
  const byGender = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => {
      const g = r.gender || "Não informado";
      map[g] = (map[g] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [researchers]);

  // By research line
  const byResearchLine = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => {
      const line = r.research_line || "Não informada";
      const count = fArticles.filter((a) => a.researcher_id === r.id).length;
      map[line] = (map[line] || 0) + count;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
  }, [researchers, fArticles]);

  const maxLine = Math.max(...byResearchLine.map((d) => d.count), 1);
  const hasMetricsData = metrics.length > 0 && metrics.some((m) => (m.total_citations || 0) > 0 || (m.h_index || 0) > 0);
  const totalCitations = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Período</Label>
          <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
            <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quadrienio">Visão CAPES ({qStart}–{qEnd})</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Visão histórica (todos)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodMode === "custom" && (
          <>
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="number" className="w-24" value={customStart} onChange={(e) => setCustomStart(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="number" className="w-24" value={customEnd} onChange={(e) => setCustomEnd(Number(e.target.value))} />
            </div>
          </>
        )}
      </div>

      {/* Period notice */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription className="text-sm">
          Dados referentes ao {periodLabel}. {periodMode === "quadrienio" && "Para visualizar todos os dados, selecione \"Visão histórica\"."}
        </AlertDescription>
      </Alert>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { label: "Artigos", value: fArticles.length, icon: BookOpen },
          { label: "Pesquisadores", value: researchers.length, icon: Users },
          { label: "Orientações PG", value: pgOrientations.length, icon: GraduationCap },
          { label: "Projetos", value: fProjects.length, icon: FolderKanban },
          { label: "Prod. técnica", value: fTechProds.length, icon: Wrench },
          { label: "Pareceres", value: fReviewer.length, icon: ClipboardCheck },
          { label: "Citações", value: hasMetricsData ? totalCitations : "—", icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Quadriênio summary */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">{periodLabel}</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{fArticles.length}</div>
            <div className="text-xs text-muted-foreground">Artigos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {articles.length > 0 ? ((fArticles.length / articles.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">do total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{fundedProjects.length}</div>
            <div className="text-xs text-muted-foreground">Projetos financiados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {researchers.length > 0 ? (fArticles.length / researchers.length).toFixed(1) : 0}
            </div>
            <div className="text-xs text-muted-foreground">Média / docente</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By year */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" /> Artigos por ano
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byYear} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Artigos" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By gender */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-accent" /> Pesquisadores por gênero
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byGender} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byGender.map((e) => <Cell key={e.name} fill={GENDER_COLORS[e.name] || COLORS[0]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* By year and Qualis */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Award className="h-4 w-4 text-accent" /> Artigos por ano e Qualis
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byYearQualis} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              {activeQualis.map((q) => (
                <Bar key={q} dataKey={q} name={q} stackId="qualis" fill={QUALIS_COLORS[q] || "#94a3b8"} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 justify-center">
          {activeQualis.map((q) => (
            <div key={q} className="flex items-center gap-1 text-xs text-muted-foreground">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: QUALIS_COLORS[q] || "#94a3b8" }} />
              {q}
            </div>
          ))}
        </div>
      </div>

      {/* By research line */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-accent" /> Produção por linha de pesquisa
        </div>
        <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
          {byResearchLine.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-48 truncate text-foreground shrink-0" title={item.name}>{item.name}</span>
              <div className="flex-1 h-4 rounded bg-muted/50 overflow-hidden">
                <div className="h-full rounded transition-all" style={{ width: `${(item.count / maxLine) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
              </div>
              <span className="w-8 text-right font-bold text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Partnerships */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
        <div className="rounded-lg border bg-card p-4 text-center">
          <Handshake className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{institutions}</div>
          <div className="text-xs text-muted-foreground">Instituições parceiras</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <Landmark className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{fundedProjects.length}</div>
          <div className="text-xs text-muted-foreground">Projetos financiados</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {metrics.length > 0 && hasMetricsData ? (metrics.reduce((s, m) => s + (m.h_index || 0), 0) / researchers.length).toFixed(1) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">h-index médio</div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDashboard;
