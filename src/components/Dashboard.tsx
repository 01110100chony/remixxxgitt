import { useMemo, useState } from "react";
import {
  ParsedData, Production, PRODUCTION_TYPE_LABELS, PRODUCTION_CATEGORY_LABELS,
  ProductionType, ProductionCategory, isInQuadrienio, getQuadrienioRange,
} from "@/lib/lattes-parser";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  LayoutDashboard, CalendarDays, Users, BookOpen, Star, TrendingUp,
  Handshake, Landmark, GraduationCap, FolderKanban,
} from "lucide-react";

interface DashboardProps {
  data: ParsedData;
}

const COLORS = [
  "hsl(var(--accent))", "hsl(var(--primary))", "#f59e0b", "#10b981",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#ef4444",
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

const Dashboard = ({ data }: DashboardProps) => {
  const { researchers, allProductions, allOrientations, allProjects, institutions, funders } = data;
  const [qStart, qEnd] = getQuadrienioRange();

  const totalArticles = allProductions.filter((p) => p.type === "article").length;
  const qProductions = allProductions.filter((p) => isInQuadrienio(p.year));
  const fundedProjects = allProjects.filter((p) => p.funding === "Sim");

  // By type
  const byType = useMemo(() => {
    const map: Record<string, number> = {};
    allProductions.forEach((p) => { map[p.type] = (map[p.type] || 0) + 1; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => ({
        name: PRODUCTION_TYPE_LABELS[type as ProductionType] || type,
        count,
      }));
  }, [allProductions]);

  // By year
  const byYear = useMemo(() => {
    const map: Record<string, number> = {};
    allProductions.forEach((p) => { if (p.year !== "—") map[p.year] = (map[p.year] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([year, count]) => ({ year, count }));
  }, [allProductions]);

  // By gender
  const byGender = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => { map[r.gender] = (map[r.gender] || 0) + r.productions.length; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [researchers]);

  // By research line
  const byResearchLine = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => {
      const lines = r.researchLines.length > 0 ? r.researchLines : ["Não informada"];
      lines.forEach((l) => { map[l] = (map[l] || 0) + r.productions.length; });
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
  }, [researchers]);

  const maxLine = Math.max(...byResearchLine.map((d) => d.count), 1);
  const maxType = Math.max(...byType.map((d) => d.count), 1);

  return (
    <div className="space-y-6">
      {/* KPIs row 1 */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "Produções", value: allProductions.length, icon: BookOpen },
          { label: "Pesquisadores", value: researchers.length, icon: Users },
          { label: "Orientações", value: allOrientations.length, icon: GraduationCap },
          { label: "Projetos", value: allProjects.length, icon: FolderKanban },
          { label: "Parcerias", value: institutions.length, icon: Handshake },
          { label: "Financiadores", value: funders.length, icon: Landmark },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Quadriênio highlight */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Quadriênio {qStart}–{qEnd}</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{qProductions.length}</div>
            <div className="text-xs text-muted-foreground">Produções</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {allProductions.length > 0 ? ((qProductions.length / allProductions.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">do total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{fundedProjects.length}</div>
            <div className="text-xs text-muted-foreground">Projetos financiados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {researchers.length > 0 ? (qProductions.length / researchers.length).toFixed(1) : 0}
            </div>
            <div className="text-xs text-muted-foreground">Média / docente</div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* By year */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" />
            Produção por ano
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byYear} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" name="Produções" fill="hsl(var(--accent))" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By gender */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-accent" />
            Produção por gênero
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

      <div className="grid gap-6 md:grid-cols-2">
        {/* By production type */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BookOpen className="h-4 w-4 text-accent" />
            Por tipo de produção
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {byType.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-foreground shrink-0" title={item.name}>{item.name}</span>
                <div className="flex-1 h-4 rounded bg-muted/50 overflow-hidden">
                  <div className="h-full rounded transition-all" style={{ width: `${(item.count / maxType) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
                <span className="w-8 text-right font-bold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* By research line */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <TrendingUp className="h-4 w-4 text-accent" />
            Por linha de pesquisa
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {byResearchLine.map((item, i) => (
              <div key={item.name} className="flex items-center gap-3 text-sm">
                <span className="w-40 truncate text-foreground shrink-0" title={item.name}>{item.name}</span>
                <div className="flex-1 h-4 rounded bg-muted/50 overflow-hidden">
                  <div className="h-full rounded transition-all" style={{ width: `${(item.count / maxLine) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                </div>
                <span className="w-8 text-right font-bold text-foreground">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
