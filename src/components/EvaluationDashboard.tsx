import { useState, useMemo, useEffect } from "react";
import type { ProgramData } from "@/hooks/useProgram";
import { evaluateProgram, DEFAULT_WEIGHTS } from "@/lib/ppg-indicators";
import { evaluateCAPES, DEFAULT_CAPES_WEIGHTS, type CAPESWeights } from "@/lib/capes-indicators";
import { getQuadrienio } from "@/lib/orientation-utils";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, Award, TrendingUp, BookOpen, GraduationCap, Globe, Users, Share2, ChevronDown, ChevronUp, Save, CalendarDays } from "lucide-react";
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

type PeriodMode = "quadrienio" | "custom" | "all";

interface Props { data: ProgramData; }

const EvaluationDashboard = ({ data }: Props) => {
  const { toast } = useToast();
  const [mode, setMode] = useState<"simplified" | "capes">("simplified");
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS);
  const [capesWeights, setCapesWeights] = useState<CAPESWeights>(DEFAULT_CAPES_WEIGHTS);
  const [showWeights, setShowWeights] = useState(false);
  const [expandedQuesito, setExpandedQuesito] = useState<string | null>(null);
  const [savingWeights, setSavingWeights] = useState(false);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");
  const [qStart, qEnd] = getQuadrienio();
  const [customStart, setCustomStart] = useState<number>(qStart);
  const [customEnd, setCustomEnd] = useState<number>(qEnd);

  const effectivePeriod = useMemo<[number, number]>(() => {
    if (periodMode === "quadrienio") return [qStart, qEnd];
    if (periodMode === "custom") return [customStart, customEnd];
    return [1900, 9999];
  }, [periodMode, qStart, qEnd, customStart, customEnd]);

  const periodLabel = periodMode === "quadrienio"
    ? `Quadriênio ${qStart}–${qEnd}`
    : periodMode === "custom"
      ? `${customStart}–${customEnd}`
      : "Todos os anos";

  // Load saved weights from DB
  useEffect(() => {
    const loadWeights = async () => {
      const { data: rows } = await supabase
        .from("evaluation_weights")
        .select("*")
        .eq("program_id", data.program.id);
      if (rows) {
        for (const row of rows) {
          if (row.mode === "simplified" && row.config) {
            setWeights({ ...DEFAULT_WEIGHTS, ...(row.config as Record<string, number>) });
          } else if (row.mode === "capes" && row.config) {
            setCapesWeights({ ...DEFAULT_CAPES_WEIGHTS, ...(row.config as unknown as CAPESWeights) });
          }
        }
      }
    };
    loadWeights();
  }, [data.program.id]);

  const saveWeights = async () => {
    setSavingWeights(true);
    const config = mode === "simplified" ? weights : capesWeights;
    const { error } = await supabase.from("evaluation_weights").upsert(
      { program_id: data.program.id, mode, config: config as any },
      { onConflict: "program_id,mode" }
    );
    setSavingWeights(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Pesos salvos", description: "Configuração de pesos salva com sucesso." });
    }
  };

  const result = useMemo(() => evaluateProgram(data, weights, effectivePeriod), [data, weights, effectivePeriod]);
  const capesResult = useMemo(() => evaluateCAPES(data, capesWeights, effectivePeriod), [data, capesWeights, effectivePeriod]);

  const radarData = result.dimensions.map((d) => ({
    dimension: d.name, score: d.score < 0 ? 0 : d.score, fullMark: 10,
  }));

  const capesRadarData = capesResult.quesitos.map((q) => ({
    dimension: q.name.replace(/^\d+\.\s*/, ""), score: q.score, fullMark: 5,
  }));

  // Production by year for line chart
  const byYear = useMemo(() => {
    const map: Record<number, number> = {};
    data.articles.forEach((a) => { if (a.year) map[a.year] = (map[a.year] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => +a - +b).map(([year, count]) => ({ year, count }));
  }, [data.articles]);

  const byResearcher = useMemo(() => {
    return data.researchers.map((r) => ({
      name: r.name.split(" ").slice(0, 2).join(" "),
      artigos: data.articles.filter((a) => a.researcher_id === r.id).length,
      orientacoes: data.orientations.filter((o) => o.researcher_id === r.id).length,
    })).sort((a, b) => b.artigos - a.artigos);
  }, [data]);

  const byQualis = useMemo(() => {
    const map: Record<string, number> = {};
    data.articles.forEach((a) => { const q = a.qualis || "Sem Qualis"; map[q] = (map[q] || 0) + 1; });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => ({ name, value }));
  }, [data.articles]);

  const byGender = useMemo(() => {
    const map: Record<string, number> = {};
    data.researchers.forEach((r) => {
      const g = r.gender || "Não informado";
      map[g] = (map[g] || 0) + data.articles.filter((a) => a.researcher_id === r.id).length;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [data]);

  const scoreColor = result.overallScore >= 7 ? "text-green-500" : result.overallScore >= 4 ? "text-yellow-500" : "text-red-500";
  const capesScoreColor = capesResult.finalScore >= 6 ? "text-green-500" : capesResult.finalScore >= 4 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="rounded-lg border bg-card p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`text-sm font-medium ${mode === "simplified" ? "text-foreground" : "text-muted-foreground"}`}>Simplificado</span>
          <Switch
            checked={mode === "capes"}
            onCheckedChange={(v) => setMode(v ? "capes" : "simplified")}
          />
          <span className={`text-sm font-medium ${mode === "capes" ? "text-foreground" : "text-muted-foreground"}`}>CAPES</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {mode === "simplified" ? "6 dimensões, score 0–10" : "3 quesitos com subitens, conceito 1–7"}
        </span>
      </div>

      {/* Period selector */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-accent" />
          Período de avaliação: {periodLabel}
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
            onClick={() => setPeriodMode("custom")}
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

      {mode === "simplified" ? (
        /* =================== SIMPLIFIED MODE =================== */
        <>
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  Total: {Object.values(weights).reduce((s, w) => s + w, 0)}%
                </p>
                <Button size="sm" variant="outline" onClick={saveWeights} disabled={savingWeights}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Salvar pesos
                </Button>
              </div>
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
                        <span className="text-sm font-bold" style={{ color: COLORS[i % COLORS.length] }}>{d.score < 0 ? "N/D" : d.score.toFixed(1)}</span>
                      </div>
                      <div className="h-1.5 rounded bg-muted/50 mt-1 overflow-hidden">
                        <div className="h-full rounded transition-all" style={{ width: `${(Math.max(0, d.score) / 10) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Charts Grid */}
          <div className="grid gap-6 md:grid-cols-2">
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
        </>
      ) : (
        /* =================== CAPES MODE =================== */
        <>
          {/* CAPES Score */}
          <div className="rounded-lg border bg-card p-6 flex flex-col items-center gap-2">
            <Award className="h-8 w-8 text-accent" />
            <div className={`text-5xl font-bold ${capesScoreColor}`}>{capesResult.finalScore.toFixed(1)}</div>
            <div className="text-lg font-semibold text-foreground">{capesResult.finalConcept}</div>
            <div className="text-sm text-muted-foreground">Conceito CAPES (escala 1–7)</div>
            <Button variant="outline" size="sm" onClick={() => setShowWeights(!showWeights)} className="mt-2">
              <Settings2 className="h-4 w-4 mr-1" /> Configurar pesos
            </Button>
          </div>

          {/* CAPES Weight config */}
          {showWeights && (
            <div className="rounded-lg border bg-card p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Settings2 className="h-4 w-4" /> Pesos dos Quesitos CAPES
              </h3>

              {/* Quesito-level weights */}
              <div className="grid gap-3 grid-cols-3">
                {capesResult.quesitos.map((q) => (
                  <div key={q.key}>
                    <Label className="text-xs">{q.name}</Label>
                    <Input
                      type="number" min={0} max={100}
                      value={capesWeights[q.key as keyof CAPESWeights].weight}
                      onChange={(e) => setCapesWeights((prev) => ({
                        ...prev,
                        [q.key]: { ...prev[q.key as keyof CAPESWeights], weight: Number(e.target.value) },
                      }))}
                      className="h-8 text-sm"
                    />
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Total quesitos: {capesResult.quesitos.reduce((s, q) => s + capesWeights[q.key as keyof CAPESWeights].weight, 0)}%
              </p>

              {/* Sub-item weights per quesito */}
              {capesResult.quesitos.map((q) => (
                <div key={q.key} className="space-y-2 border-t pt-3">
                  <h4 className="text-xs font-semibold text-foreground">{q.name} — Subitens</h4>
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                    {q.subItems.map((sub) => (
                      <div key={sub.key}>
                        <Label className="text-[10px]">{sub.label}</Label>
                        <Input
                          type="number" min={0} max={100}
                          value={capesWeights[q.key as keyof CAPESWeights].subWeights[sub.key] || 0}
                          onChange={(e) => setCapesWeights((prev) => ({
                            ...prev,
                            [q.key]: {
                              ...prev[q.key as keyof CAPESWeights],
                              subWeights: {
                                ...prev[q.key as keyof CAPESWeights].subWeights,
                                [sub.key]: Number(e.target.value),
                              },
                            },
                          }))}
                          className="h-7 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={saveWeights} disabled={savingWeights}>
                  <Save className="h-3.5 w-3.5 mr-1" /> Salvar pesos
                </Button>
              </div>
            </div>
          )}

          {/* CAPES Radar */}
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Radar CAPES</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={capesRadarData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    <Radar name="Score" dataKey="score" stroke="hsl(var(--accent))" fill="hsl(var(--accent))" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-3">
              {capesResult.quesitos.map((q, i) => (
                <div key={q.key} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">{q.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold" style={{ color: COLORS[i % COLORS.length] }}>{q.score.toFixed(1)}/5</span>
                      <span className="text-xs text-muted-foreground">({q.weight}%)</span>
                    </div>
                  </div>
                  <div className="h-2 rounded bg-muted/50 mt-2 overflow-hidden">
                    <div className="h-full rounded transition-all" style={{ width: `${(q.score / 5) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CAPES Quesito Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Detalhamento por Quesito</h3>
            {capesResult.quesitos.map((q, i) => {
              const isExpanded = expandedQuesito === q.key;
              return (
                <div key={q.key} className="rounded-lg border bg-card overflow-hidden">
                  <button
                    className="w-full p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                    onClick={() => setExpandedQuesito(isExpanded ? null : q.key)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{ backgroundColor: COLORS[i % COLORS.length] + "20", color: COLORS[i % COLORS.length] }}>
                        {q.score.toFixed(1)}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-foreground">{q.name}</div>
                        <div className="text-xs text-muted-foreground">Peso: {q.weight}% • {q.subItems.length} subitens</div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t">
                      <p className="text-sm text-muted-foreground italic pt-3">{q.autoText}</p>

                      <div className="space-y-2">
                        {q.subItems.map((sub) => {
                          const subWeight = capesWeights[q.key as keyof CAPESWeights].subWeights[sub.key] || 0;
                          return (
                            <div key={sub.key} className="flex items-center gap-3 p-2 rounded bg-muted/20">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-foreground">{sub.label}</span>
                                  <span className="text-xs text-muted-foreground">Peso: {subWeight}%</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">{sub.description}</div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-sm font-bold" style={{ color: sub.score >= 4 ? "#10b981" : sub.score >= 3 ? "#f59e0b" : "#ef4444" }}>
                                  {sub.score.toFixed(1)}/5
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Charts (shared) */}
          <div className="grid gap-6 md:grid-cols-2">
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
          </div>
        </>
      )}
    </div>
  );
};

export default EvaluationDashboard;
