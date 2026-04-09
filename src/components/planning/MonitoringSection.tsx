import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Save, RefreshCw, Target, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado } from "@/lib/orientation-utils";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
  canEdit: boolean;
}

interface IndicatorGoal {
  id: string;
  label: string;
  category: string;
  current: number;
  goal: number;
  unit: string;
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function computeIndicators(data: ProgramData, startYear: number, endYear: number): IndicatorGoal[] {
  const { researchers, articles, orientations, projects } = data;
  const periodArticles = articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear);
  const pgOrientations = orientations.filter(
    (o) => isPGOrientation(o.type) && o.year && o.year >= startYear && o.year <= endYear
  );
  const concluded = pgOrientations.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA");
  const mestrados = concluded.filter((o) => isMestrado(o.type));
  const doutorados = concluded.filter((o) => isDoutorado(o.type));
  const numDocentes = researchers.length || 1;

  const qualisA = periodArticles.filter((a) => a.qualis && (a.qualis.startsWith("A"))).length;
  const periodProjects = projects.filter(
    (p) => (p.year_start && p.year_start >= startYear && p.year_start <= endYear) ||
           (p.year_end && p.year_end >= startYear && p.year_end <= endYear)
  );
  const funded = periodProjects.filter((p) => p.funding && p.funding !== "Não").length;

  const artPerDocente = +(periodArticles.length / numDocentes).toFixed(1);
  const orientPerDocente = +(concluded.length / numDocentes).toFixed(1);

  return [
    { id: uid(), label: "Artigos no período", category: "Produção", current: periodArticles.length, goal: numDocentes * 3, unit: "artigos" },
    { id: uid(), label: "Artigos Qualis A", category: "Produção", current: qualisA, goal: Math.max(Math.round(numDocentes * 1.5), 5), unit: "artigos" },
    { id: uid(), label: "Artigos por docente", category: "Produção", current: artPerDocente, goal: 3, unit: "art/doc" },
    { id: uid(), label: "Dissertações concluídas", category: "Formação", current: mestrados.length, goal: Math.max(numDocentes * 2, 8), unit: "dissertações" },
    { id: uid(), label: "Teses concluídas", category: "Formação", current: doutorados.length, goal: Math.max(numDocentes, 4), unit: "teses" },
    { id: uid(), label: "Orientações por docente", category: "Formação", current: orientPerDocente, goal: 2, unit: "orient/doc" },
    { id: uid(), label: "Projetos com financiamento", category: "Projetos", current: funded, goal: Math.max(Math.round(numDocentes * 0.8), 3), unit: "projetos" },
    { id: uid(), label: "Total de projetos", category: "Projetos", current: periodProjects.length, goal: numDocentes * 2, unit: "projetos" },
    { id: uid(), label: "Docentes permanentes", category: "Corpo Docente", current: numDocentes, goal: Math.max(numDocentes, 12), unit: "docentes" },
  ];
}

function progressColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 50) return "text-yellow-600";
  return "text-red-600";
}

function statusIcon(pct: number) {
  if (pct >= 80) return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (pct >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <AlertTriangle className="h-4 w-4 text-red-500" />;
}

export default function MonitoringSection({ data, startYear, endYear, canEdit }: Props) {
  const { toast } = useToast();
  const [goals, setGoals] = useState<IndicatorGoal[] | null>(null);
  const [saving, setSaving] = useState(false);

  const autoIndicators = useMemo(() => computeIndicators(data, startYear, endYear), [data, startYear, endYear]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("planning_data")
        .select("config")
        .eq("program_id", data.program.id)
        .eq("type", "monitoring_goals")
        .maybeSingle();
      if (rows?.config && Array.isArray(rows.config)) {
        // Merge saved goals with current values
        const saved = rows.config as unknown as IndicatorGoal[];
        const merged = autoIndicators.map((auto) => {
          const match = saved.find((s) => s.label === auto.label);
          return match ? { ...auto, goal: match.goal } : auto;
        });
        setGoals(merged);
      } else {
        setGoals(autoIndicators);
      }
    })();
  }, [data.program.id, autoIndicators]);

  const items = goals ?? autoIndicators;

  const categories = useMemo(() => {
    const map = new Map<string, IndicatorGoal[]>();
    items.forEach((i) => {
      const arr = map.get(i.category) || [];
      arr.push(i);
      map.set(i.category, arr);
    });
    return Array.from(map.entries());
  }, [items]);

  const overallPct = useMemo(() => {
    const total = items.reduce((sum, i) => sum + Math.min((i.current / (i.goal || 1)) * 100, 100), 0);
    return Math.round(total / items.length);
  }, [items]);

  const handleGoalChange = (label: string, value: number) => {
    setGoals((prev) => (prev ?? autoIndicators).map((g) => (g.label === label ? { ...g, goal: value } : g)));
  };

  const handleSave = async () => {
    setSaving(true);
    const payload = (goals ?? autoIndicators).map(({ label, goal, category }) => ({ label, goal, category }));
    const { data: existing } = await supabase
      .from("planning_data")
      .select("id")
      .eq("program_id", data.program.id)
      .eq("type", "monitoring_goals")
      .maybeSingle();

    if (existing) {
      await supabase.from("planning_data").update({ config: payload as any }).eq("id", existing.id);
    } else {
      await supabase.from("planning_data").insert({
        program_id: data.program.id,
        type: "monitoring_goals",
        config: payload as any,
      });
    }
    setSaving(false);
    toast({ title: "Metas salvas com sucesso" });
  };

  const handleReset = () => {
    setGoals(autoIndicators);
    toast({ title: "Metas restauradas aos valores sugeridos" });
  };

  return (
    <div className="space-y-6">
      {/* Overall progress */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5" />
            Progresso Geral do Programa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Progress value={overallPct} className="flex-1 h-3" />
            <span className={`font-bold text-lg ${progressColor(overallPct)}`}>{overallPct}%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            Período: {startYear}–{endYear} · {items.filter((i) => (i.current / (i.goal || 1)) * 100 >= 80).length} de {items.length} indicadores atingidos
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      {canEdit && (
        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando…" : "Salvar metas"}
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RefreshCw className="h-4 w-4 mr-1" /> Restaurar sugestões
          </Button>
        </div>
      )}

      {/* Category cards */}
      {categories.map(([cat, indicators]) => {
        const catPct = Math.round(
          indicators.reduce((s, i) => s + Math.min((i.current / (i.goal || 1)) * 100, 100), 0) / indicators.length
        );
        return (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  {cat}
                </span>
                <Badge variant={catPct >= 80 ? "default" : catPct >= 50 ? "secondary" : "destructive"}>
                  {catPct}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Indicador</TableHead>
                    <TableHead className="text-center">Atual</TableHead>
                    <TableHead className="text-center">Meta</TableHead>
                    <TableHead className="text-center">Progresso</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {indicators.map((ind) => {
                    const pct = Math.min(Math.round((ind.current / (ind.goal || 1)) * 100), 100);
                    return (
                      <TableRow key={ind.label}>
                        <TableCell className="font-medium">{ind.label}</TableCell>
                        <TableCell className="text-center">{ind.current} {ind.unit}</TableCell>
                        <TableCell className="text-center">
                          {canEdit ? (
                            <Input
                              type="number"
                              className="w-20 h-8 text-center mx-auto"
                              value={ind.goal}
                              onChange={(e) => handleGoalChange(ind.label, Number(e.target.value))}
                              min={0}
                            />
                          ) : (
                            <span>{ind.goal} {ind.unit}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center gap-2 justify-center">
                            <Progress value={pct} className="w-20 h-2" />
                            <span className={`text-sm font-medium ${progressColor(pct)}`}>{pct}%</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">{statusIcon(pct)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
