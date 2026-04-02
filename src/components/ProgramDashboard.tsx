import { useMemo } from "react";
import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado, getQuadrienio } from "@/lib/orientation-utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
} from "recharts";
import {
  CalendarDays, Users, BookOpen, Star, TrendingUp, Handshake, Landmark,
  GraduationCap, FolderKanban, Wrench, ClipboardCheck, Award,
} from "lucide-react";

interface Props {
  data: ProgramData;
}

const COLORS = [
  "hsl(var(--accent))", "hsl(var(--primary))", "#f59e0b", "#10b981",
  "#8b5cf6", "#ec4899", "#06b6d4", "#f97316", "#84cc16", "#ef4444",
];
const GENDER_COLORS: Record<string, string> = {
  Homem: "hsl(var(--primary))",
  Mulher: "hsl(var(--accent))",
  "Não informado": "hsl(var(--muted-foreground))",
};
const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

function getQuadrienioRange(): [number, number] {
  const y = new Date().getFullYear();
  return [y - 3, y];
}

const ProgramDashboard = ({ data }: Props) => {
  const { researchers, articles, orientations, projects, technicalProductions, reviewerActivities, metrics } = data;
  const [qStart, qEnd] = getQuadrienioRange();
  const qArticles = articles.filter((a) => a.year && a.year >= qStart && a.year <= qEnd);

  const fundedProjects = projects.filter((p) => p.funding === "Sim");
  const institutions = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => { if (p.partner_institution) p.partner_institution.split("; ").forEach((i) => { if (i) s.add(i); }); });
    return s.size;
  }, [projects]);

  // By year
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    articles.forEach((a) => { if (a.year) map[a.year] = (map[a.year] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => +a - +b).map(([year, count]) => ({
      year,
      count,
      isQ: +year >= qStart && +year <= qEnd,
    }));
  }, [articles, qStart, qEnd]);

  // By gender
  const byGender = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => {
      const g = r.gender || "Não informado";
      const count = articles.filter((a) => a.researcher_id === r.id).length;
      map[g] = (map[g] || 0) + count;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [researchers, articles]);

  // By research line
  const byResearchLine = useMemo(() => {
    const map: Record<string, number> = {};
    researchers.forEach((r) => {
      const line = r.research_line || "Não informada";
      const count = articles.filter((a) => a.researcher_id === r.id).length;
      map[line] = (map[line] || 0) + count;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a).map(([name, count]) => ({ name, count }));
  }, [researchers, articles]);

  const maxLine = Math.max(...byResearchLine.map((d) => d.count), 1);
  const totalCitations = metrics.reduce((s, m) => s + (m.total_citations || 0), 0);

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-7">
        {[
          { label: "Artigos", value: articles.length, icon: BookOpen },
          { label: "Pesquisadores", value: researchers.length, icon: Users },
          { label: "Orientações", value: orientations.length, icon: GraduationCap },
          { label: "Projetos", value: projects.length, icon: FolderKanban },
          { label: "Prod. técnica", value: technicalProductions.length, icon: Wrench },
          { label: "Pareceres", value: reviewerActivities.length, icon: ClipboardCheck },
          { label: "Citações", value: totalCitations, icon: Award },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Icon className="h-4 w-4 text-accent mx-auto mb-1.5" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Quadriênio */}
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Star className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Quadriênio {qStart}–{qEnd}</span>
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{qArticles.length}</div>
            <div className="text-xs text-muted-foreground">Artigos</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {articles.length > 0 ? ((qArticles.length / articles.length) * 100).toFixed(0) : 0}%
            </div>
            <div className="text-xs text-muted-foreground">do total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{fundedProjects.length}</div>
            <div className="text-xs text-muted-foreground">Projetos financiados</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">
              {researchers.length > 0 ? (qArticles.length / researchers.length).toFixed(1) : 0}
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
            <Users className="h-4 w-4 text-accent" /> Produção por gênero
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
            {metrics.length > 0 ? (metrics.reduce((s, m) => s + (m.h_index || 0), 0) / researchers.length).toFixed(1) : "—"}
          </div>
          <div className="text-xs text-muted-foreground">h-index médio</div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDashboard;
