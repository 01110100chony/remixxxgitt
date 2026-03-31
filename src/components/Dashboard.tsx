import { useMemo } from "react";
import { ResearcherInfo } from "@/lib/lattes-parser";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { LayoutDashboard, CalendarDays, Users, BookOpen } from "lucide-react";

interface DashboardProps {
  researchersData: ResearcherInfo[];
}

const CHART_COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "#f59e0b",
  "#10b981",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ef4444",
];

const GENDER_COLORS: Record<string, string> = {
  Masculino: "hsl(var(--primary))",
  Feminino: "hsl(var(--accent))",
  "Não informado": "hsl(var(--muted-foreground))",
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

const Dashboard = ({ researchersData }: DashboardProps) => {
  const allArticles = useMemo(
    () => researchersData.flatMap((r) => r.articles),
    [researchersData]
  );

  // Production by year
  const yearData = useMemo(() => {
    const map: Record<string, number> = {};
    allArticles.forEach((a) => {
      if (a.year !== "—") map[a.year] = (map[a.year] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([year, count]) => ({ year, count }));
  }, [allArticles]);

  // Production by gender
  const genderData = useMemo(() => {
    const map: Record<string, number> = {};
    researchersData.forEach((r) => {
      map[r.gender] = (map[r.gender] || 0) + r.articles.length;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [researchersData]);

  // Gender count (researchers)
  const genderResearcherCount = useMemo(() => {
    const map: Record<string, number> = {};
    researchersData.forEach((r) => {
      map[r.gender] = (map[r.gender] || 0) + 1;
    });
    return map;
  }, [researchersData]);

  // Production by research line
  const researchLineData = useMemo(() => {
    const map: Record<string, number> = {};
    researchersData.forEach((r) => {
      const lines = r.researchLines.length > 0 ? r.researchLines : ["Não informada"];
      lines.forEach((line) => {
        map[line] = (map[line] || 0) + r.articles.length;
      });
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count]) => ({ name, count }));
  }, [researchersData]);

  const maxLine = Math.max(...researchLineData.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <LayoutDashboard className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold text-foreground">Dashboard Geral</h2>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-5 text-center">
          <div className="text-3xl font-bold text-foreground">{allArticles.length}</div>
          <div className="text-sm text-muted-foreground">Total de artigos</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <div className="text-3xl font-bold text-foreground">{researchersData.length}</div>
          <div className="text-sm text-muted-foreground">Pesquisadores</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <div className="text-3xl font-bold text-foreground">{yearData.length}</div>
          <div className="text-sm text-muted-foreground">Anos com publicações</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <div className="text-3xl font-bold text-foreground">{researchLineData.filter((d) => d.name !== "Não informada").length}</div>
          <div className="text-sm text-muted-foreground">Linhas de pesquisa</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Production by year */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" />
            Produção por ano
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} tickLine={false} axisLine={{ stroke: "hsl(var(--border))" }} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }} />
                <Bar dataKey="count" name="Artigos" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production by gender */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-accent" />
            Produção por gênero
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {genderData.map((entry) => (
                    <Cell key={entry.name} fill={GENDER_COLORS[entry.name] || CHART_COLORS[0]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    `${value} artigos (${genderResearcherCount[name] || 0} pesq.)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Research lines */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <BookOpen className="h-4 w-4 text-accent" />
          Produção por linha de pesquisa
        </div>
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {researchLineData.map((item, i) => (
            <div key={item.name} className="flex items-center gap-3 text-sm">
              <span className="w-8 text-right text-muted-foreground font-mono shrink-0">{i + 1}.</span>
              <span className="w-64 truncate text-foreground shrink-0" title={item.name}>{item.name}</span>
              <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded transition-all"
                  style={{
                    width: `${(item.count / maxLine) * 100}%`,
                    backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                  }}
                />
              </div>
              <span className="w-10 text-right font-bold text-foreground">{item.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
