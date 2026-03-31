import { useMemo } from "react";
import { ParsedData, isInQuadrienio, getQuadrienioRange, PRODUCTION_TYPE_LABELS, ProductionType } from "@/lib/lattes-parser";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { BarChart3, Trophy } from "lucide-react";

interface ResearcherChartProps {
  data: ParsedData;
}

const COLORS = [
  "hsl(var(--accent))", "hsl(var(--primary))", "#f59e0b", "#10b981",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316",
];

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

const ResearcherChart = ({ data }: ResearcherChartProps) => {
  const { researchers } = data;
  const names = researchers.map((r) => r.name);
  const [qStart, qEnd] = getQuadrienioRange();

  // Ranking data
  const ranking = useMemo(() => {
    return researchers
      .map((r) => ({
        name: r.name,
        total: r.productions.length,
        quadrienio: r.productions.filter((p) => isInQuadrienio(p.year)).length,
      }))
      .sort((a, b) => b.total - a.total);
  }, [researchers]);

  // Stacked year chart
  const yearData = useMemo(() => {
    const yearMap: Record<string, Record<string, number>> = {};
    data.allProductions.forEach((p) => {
      if (p.year === "—") return;
      if (!yearMap[p.year]) yearMap[p.year] = {};
      yearMap[p.year][p.researcher] = (yearMap[p.year][p.researcher] || 0) + 1;
    });
    return Object.entries(yearMap).sort(([a], [b]) => a.localeCompare(b)).map(([year, counts]) => ({ year, ...counts }));
  }, [data.allProductions]);

  const getMedal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
  const maxTotal = Math.max(...ranking.map((r) => r.total), 1);

  if (names.length < 2) return null;

  return (
    <div className="space-y-6">
      {/* Ranking */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            Ranking geral
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {ranking.map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-center shrink-0 text-lg leading-none">{getMedal(i)}</span>
                <span className="flex-1 truncate text-foreground" title={r.name}>{r.name}</span>
                <div className="w-24 h-5 rounded bg-muted/50 overflow-hidden shrink-0">
                  <div className="h-full rounded bg-primary/70" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-bold text-foreground">{r.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            Ranking quadriênio ({qStart}–{qEnd})
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {[...ranking].sort((a, b) => b.quadrienio - a.quadrienio).map((r, i) => (
              <div key={r.name} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-center shrink-0 text-lg leading-none">{getMedal(i)}</span>
                <span className="flex-1 truncate text-foreground" title={r.name}>{r.name}</span>
                <div className="w-24 h-5 rounded bg-muted/50 overflow-hidden shrink-0">
                  <div className="h-full rounded bg-accent/70" style={{ width: `${(r.quadrienio / Math.max(...ranking.map((x) => x.quadrienio), 1)) * 100}%` }} />
                </div>
                <span className="w-8 text-right font-bold text-accent">{r.quadrienio}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stacked chart */}
      <div className="rounded-lg border bg-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BarChart3 className="h-4 w-4 text-accent" />
          Comparativo entre docentes por ano
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={yearData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
              {names.map((n, i) => <Bar key={n} dataKey={n} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} stackId="s" />)}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ResearcherChart;
