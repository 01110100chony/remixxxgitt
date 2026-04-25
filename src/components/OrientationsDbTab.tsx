import { useMemo, useState } from "react";
import type { OrientationRow, Researcher } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado, getQuadrienio } from "@/lib/orientation-utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Search, GraduationCap, Info, CalendarDays } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { DataSourceBanner, OriginBadge, useSourceFilter } from "@/components/data-source";

interface Props {
  orientations: OrientationRow[];
  researchers: Researcher[];
}

type PeriodMode = "quadrienio" | "custom" | "all";

const OrientationsDbTab = ({ orientations, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");

  const { visibleRows, showInactive, setShowInactive, breakdown } = useSourceFilter(orientations);
  const hasAnyXml = breakdown.lattes > 0;

  const [qStart, qEnd] = getQuadrienio();
  const years = useMemo(() => {
    const set = new Set<number>();
    visibleRows.forEach((o) => { if (o.year) set.add(o.year); });
    return Array.from(set).sort((a, b) => a - b);
  }, [visibleRows]);

  const [customStart, setCustomStart] = useState<number>(years[0] || qStart);
  const [customEnd, setCustomEnd] = useState<number>(years[years.length - 1] || qEnd);

  // Ensure custom range updates when years change
  const effectiveStart = periodMode === "quadrienio" ? qStart : periodMode === "custom" ? customStart : 0;
  const effectiveEnd = periodMode === "quadrienio" ? qEnd : periodMode === "custom" ? customEnd : 9999;

  const types = useMemo(() => Array.from(new Set(visibleRows.map((o) => o.type))).sort(), [visibleRows]);
  const pgOnly = useMemo(() => visibleRows.filter((o) => isPGOrientation(o.type)), [visibleRows]);

  const pgPeriod = useMemo(() =>
    periodMode === "all"
      ? pgOnly
      : pgOnly.filter((o) => o.year && o.year >= effectiveStart && o.year <= effectiveEnd),
    [pgOnly, effectiveStart, effectiveEnd, periodMode]
  );

  const concluded = pgPeriod.filter((o) => o.status === "concluded").length;
  const inProgress = pgPeriod.filter((o) => o.status === "in_progress").length;
  const mestrado = pgPeriod.filter((o) => isMestrado(o.type)).length;
  const doutorado = pgPeriod.filter((o) => isDoutorado(o.type)).length;
  const nonPG = visibleRows.length - pgOnly.length;

  const chartData = useMemo(() => {
    const yearMap = new Map<number, { year: number; mestrado: number; doutorado: number }>();
    pgPeriod.forEach((o) => {
      if (!o.year) return;
      if (!yearMap.has(o.year)) yearMap.set(o.year, { year: o.year, mestrado: 0, doutorado: 0 });
      const entry = yearMap.get(o.year)!;
      if (isMestrado(o.type)) entry.mestrado++;
      else if (isDoutorado(o.type)) entry.doutorado++;
    });
    return Array.from(yearMap.values()).sort((a, b) => a.year - b.year);
  }, [pgPeriod]);
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orientations.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (researcherFilter !== "all" && o.researcher_id !== researcherFilter) return false;
      if (periodMode !== "all" && o.year && (o.year < effectiveStart || o.year > effectiveEnd)) return false;
      if (q && !(o.title || "").toLowerCase().includes(q) && !(o.student || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orientations, search, statusFilter, typeFilter, researcherFilter, periodMode, effectiveStart, effectiveEnd]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  const periodLabel = periodMode === "quadrienio"
    ? `Quadriênio ${qStart}–${qEnd}`
    : periodMode === "custom"
      ? `${customStart}–${customEnd}`
      : "Todos os anos";

  return (
    <div className="space-y-6">
      {/* Info banner */}
      {nonPG > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" />
          <span>O relatório CAPES considera apenas orientações de pós-graduação (mestrado/doutorado). {nonPG} orientação(ões) de graduação/IC/TCC/especialização estão excluídas do cálculo.</span>
        </div>
      )}

      {/* Period selector */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-accent" />
          Período: {periodLabel}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant={periodMode === "quadrienio" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodMode("quadrienio")}
          >
            Quadriênio ({qStart}–{qEnd})
          </Button>
          <Button
            variant={periodMode === "custom" ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setPeriodMode("custom");
              if (!customStart && years.length > 0) setCustomStart(years[0]);
              if (!customEnd && years.length > 0) setCustomEnd(years[years.length - 1]);
            }}
          >
            Personalizado
          </Button>
          <Button
            variant={periodMode === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setPeriodMode("all")}
          >
            Todos
          </Button>

          {periodMode === "custom" && (
            <>
              <div className="flex items-center gap-1 ml-2">
                <span className="text-xs text-muted-foreground">De:</span>
                <Input
                  type="number"
                  value={customStart}
                  onChange={(e) => setCustomStart(Number(e.target.value))}
                  className="w-20 h-8 text-sm"
                  min={1900}
                  max={2100}
                />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Até:</span>
                <Input
                  type="number"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(Number(e.target.value))}
                  className="w-20 h-8 text-sm"
                  min={1900}
                  max={2100}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-6">
        <div className="rounded-lg border bg-card p-4 text-center">
          <GraduationCap className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{orientations.length}</div>
          <div className="text-xs text-muted-foreground">Total geral</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{pgPeriod.length}</div>
          <div className="text-xs text-muted-foreground">PG no período</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{mestrado}</div>
          <div className="text-xs text-muted-foreground">Mestrados</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{doutorado}</div>
          <div className="text-xs text-muted-foreground">Doutorados</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{concluded}</div>
          <div className="text-xs text-muted-foreground">Concluídas (PG)</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {researchers.length > 0 ? (pgPeriod.length / researchers.length).toFixed(1) : 0}
          </div>
          <div className="text-xs text-muted-foreground">Média / docente</div>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Evolução de orientações PG por ano</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="year" className="text-xs" />
              <YAxis allowDecimals={false} className="text-xs" />
              <Tooltip />
              <Legend />
              <Bar dataKey="mestrado" name="Mestrado" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="doutorado" name="Doutorado" fill="hsl(var(--accent))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="concluded">Concluídas</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        {researchers.length > 1 && (
          <Select value={researcherFilter} onValueChange={setResearcherFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {researchers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div className="relative w-56">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-28">Nível</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-16">Ano</TableHead>
              <TableHead>Orientando</TableHead>
              <TableHead className="w-36">Orientador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma orientação encontrada.</TableCell></TableRow>
            ) : filtered.map((o, i) => (
              <TableRow key={o.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{o.title || "—"}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">{o.type}</span></TableCell>
                <TableCell><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${o.status === "concluded" ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"}`}>
                  {o.status === "concluded" ? "Concluída" : "Em andamento"}
                </span></TableCell>
                <TableCell className="text-sm">{o.year || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.student || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(o.researcher_id)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrientationsDbTab;
