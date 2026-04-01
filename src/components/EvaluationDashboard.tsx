import { useState, useMemo } from "react";
import type { ProgramData } from "@/hooks/useProgram";
import { evaluateProgram, DEFAULT_WEIGHTS } from "@/lib/ppg-indicators";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings2, Award, TrendingUp, BookOpen, GraduationCap, Globe, Users, Share2 } from "lucide-react";
import EvaluationReport from "@/components/EvaluationReport";

const COLORS = [
  "hsl(var(--accent))", "hsl(var(--primary))", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899",
];
const DIMENSION_ICONS: Record<string, typeof BookOpen> = {
  producao: BookOpen, formacao: GraduationCap, impacto: TrendingUp,
  internacionalizacao: Globe, insercaoSocial: Users, presencaDigital: Share2,
};

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  fontSize: "13px",
};

interface Props { data: ProgramData; }

const EvaluationDashboard = ({ data }: Props) => {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);

  const result = useMemo(() => evaluateProgram(data, weights), [data, weights]);

  const radarData = result.dimensions.map((d) => ({
    dimension: d.name, score: d.score, fullMark: 10,
  }));

  // Production by year for line chart
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    data.articles.forEach((a) => { if (a.year) map[a.year] = (map[a.year] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => +a - +b).map(([year, count]) => ({ year, count }));
  }, [data.articles]);

  // By researcher
  const byResearcher = useMemo(() => {
    return data.researchers.map((r) => ({
      name: r.name.split(" ").slice(0, 2).join(" "),
      artigos: data.articles.filter((a) => a.researcher_id === r.id).length,
      orientacoes: data.orientations.filter((o) => o.researcher_id === r.id).length,
    })).sort((a, b) => b.artigos - a.artigos);
  }, [data]);

  // By Qualis
  const byQualis = useMemo(() => {
    const map: Record<string, number> = {};
    data.articles.forEach((a) => { const q = a.qualis || "Sem Qualis"; map[q] = (map[q] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [data.articles]);

  // By gender
  const byGender = useMemo(() => {
    const map: Record<string, number> = {};
    data.researchers.forEach((r) => {
      const g = r.gender || "Não informado";
      map[g] = (map[g] || 0) + data.articles.filter((a) => a.researcher_id === r.id).length;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const scoreColor = result.overallScore >= 7 ? "text-green-500" : result.overallScore >= 4 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Overall Score */}
      <div className="rounded-lg border bg-card p-6 flex flex-col items-center gap-2">
        <Award className="h-8 w-8 text-accent" />
        <div className={`text-5xl font-bold ${scoreColor}`}>{result.overallScore.toFixed(1)}</div>
        <div className="text-sm text-muted-foreground">Score Geral do Programa (0–10)</div>
        <div className="flex gap-2 mt-2">
          <Button variant="outline" size="sm" onClick={() => setShowWeights(!showWeights)}>
            <Settings2 className="h-4 w-4 mr-1" /> Pesos
          </Button>
          <EvaluationReport data={data} result={result} byYear={byYear} byResearcher={byResearcher} byQualis={byQualis} byGender={byGender} />
        </div>
      </div>

      {/* Weight config */}
      {showWeights && (
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Settings2 className="h-4 w-4" /> Configurar pesos das dimensões
          </h3>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {result.dimensions.map((d) => (
              <div key={d.key}>
                <Label className="text-xs">{d.name}</Label>
                <Input
                  type="number" min={0} max={100}
                  value={weights[d.key]}
                  onChange={(e) => setWeights({ ...weights, [d.key]: Number(e.target.value) })}
                  className="h-8 text-sm"
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Total: {Object.values(weights).reduce((s, w) => s + w, 0)}%
          </p>
        </div>
      )}

      {/* Radar + Dimension Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground mb-3">Radar do Programa</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2">
          {result.dimensions.map((d, i) => {
            const Icon = DIMENSION_ICONS[d.key] || BookOpen;
            return (
              <div key={d.key} className="rounded-lg border bg-card p-3 flex items-center gap-3">
                <Icon className="h-5 w-5 shrink-0" style={{ color: COLORS[i % COLORS.length] }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{d.name}</span>
                    <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{d.score.toFixed(1)}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted/50 mt-1 overflow-hidden">
                    <div className="h-full rounded transition-all" style={{ width: `${(d.score / 10) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Production by year */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Produção por Ano</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={byYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="count" name="Artigos" stroke="hsl(var(--accent))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By Qualis */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Produção por Qualis</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byQualis} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byQualis.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By researcher */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Produção por Pesquisador</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byResearcher.slice(0, 10)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
                <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} width={75} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="artigos" name="Artigos" fill="hsl(var(--accent))" radius={[0, 3, 3, 0]} />
                <Bar dataKey="orientacoes" name="Orientações" fill="hsl(var(--primary))" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* By gender */}
        <div className="rounded-lg border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Distribuição por Gênero</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byGender} cx="50%" cy="50%" innerRadius={40} outerRadius={75} paddingAngle={2} dataKey="value"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>
                  {byGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Dimension Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">Detalhamento por Dimensão</h3>
        {result.dimensions.map((d, i) => {
          const Icon = DIMENSION_ICONS[d.key] || BookOpen;
          return (
            <div key={d.key} className="rounded-lg border bg-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-5 w-5" style={{ color: COLORS[i % COLORS.length] }} />
                <span className="font-semibold text-foreground">{d.name}</span>
                <span className="ml-auto text-lg font-bold" style={{ color: COLORS[i % COLORS.length] }}>{d.score.toFixed(1)}/10</span>
              </div>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
                {d.indicators.map((ind) => (
                  <div key={ind.label} className="text-center">
                    <div className="text-lg font-bold text-foreground">{ind.value}</div>
                    <div className="text-xs text-muted-foreground">{ind.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground italic">{d.autoText}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default EvaluationDashboard;
