import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";
import { generateDiagnostic, generateStrategicPlan, type StrategicDimension } from "@/lib/planning-diagnostic";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
  canEdit: boolean;
}

const termLabels: Record<string, string> = { short: "Curto prazo", medium: "Médio prazo", long: "Longo prazo" };
const termColors: Record<string, string> = { short: "default", medium: "secondary", long: "outline" };

function uid() { return Math.random().toString(36).slice(2, 10); }

export default function StrategicPlanSection({ data, startYear, endYear, canEdit }: Props) {
  const { toast } = useToast();
  const [dimensions, setDimensions] = useState<StrategicDimension[] | null>(null);
  const [saving, setSaving] = useState(false);

  const autoPlan = useMemo(() => {
    const diag = generateDiagnostic(data, startYear, endYear);
    return generateStrategicPlan(diag, data);
  }, [data, startYear, endYear]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("planning_data")
        .select("config")
        .eq("program_id", data.program.id)
        .eq("type", "strategic_plan")
        .maybeSingle();
      if (rows?.config && Array.isArray(rows.config)) {
        setDimensions(rows.config as unknown as StrategicDimension[]);
      } else {
        setDimensions(autoPlan);
      }
    })();
  }, [data.program.id, autoPlan]);

  const handleRegenerate = () => {
    setDimensions(autoPlan);
    toast({ title: "Plano regenerado" });
  };

  const handleSave = async () => {
    if (!dimensions) return;
    setSaving(true);
    const { error } = await supabase
      .from("planning_data")
      .upsert({ program_id: data.program.id, type: "strategic_plan", config: dimensions as any }, { onConflict: "program_id,type" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Plano salvo com sucesso" });
    }
  };

  const updateDimension = (dimId: string, partial: Partial<StrategicDimension>) => {
    if (!dimensions) return;
    setDimensions(dimensions.map((d) => (d.id === dimId ? { ...d, ...partial } : d)));
  };

  const addGoal = (dimId: string) => {
    if (!dimensions) return;
    const dim = dimensions.find((d) => d.id === dimId);
    if (!dim) return;
    updateDimension(dimId, { goals: [...dim.goals, { id: uid(), text: "Nova meta", term: "short" }] });
  };

  const addAction = (dimId: string) => {
    if (!dimensions) return;
    const dim = dimensions.find((d) => d.id === dimId);
    if (!dim) return;
    updateDimension(dimId, { actions: [...dim.actions, { id: uid(), text: "Nova ação", term: "short" }] });
  };

  const addIndicator = (dimId: string) => {
    if (!dimensions) return;
    const dim = dimensions.find((d) => d.id === dimId);
    if (!dim) return;
    updateDimension(dimId, { indicators: [...dim.indicators, { id: uid(), text: "Novo indicador" }] });
  };

  if (!dimensions) return null;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleRegenerate}>
            <RefreshCw className="h-4 w-4 mr-1" /> Regenerar
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}

      <Accordion type="multiple" defaultValue={dimensions.map((d) => d.id)}>
        {dimensions.map((dim) => (
          <AccordionItem key={dim.id} value={dim.id}>
            <AccordionTrigger className="text-base font-semibold">{dim.name}</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Objective */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase">Objetivo</label>
                {canEdit ? (
                  <Input
                    value={dim.objective}
                    onChange={(e) => updateDimension(dim.id, { objective: e.target.value })}
                    className="mt-1"
                  />
                ) : (
                  <p className="text-sm mt-1">{dim.objective}</p>
                )}
              </div>

              {/* Goals */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Metas</label>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => addGoal(dim.id)} className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Meta
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5 mt-1">
                  {dim.goals.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Badge variant={termColors[g.term] as any} className="text-xs shrink-0">{termLabels[g.term]}</Badge>
                      {canEdit ? (
                        <>
                          <Input
                            value={g.text}
                            onChange={(e) =>
                              updateDimension(dim.id, { goals: dim.goals.map((x) => (x.id === g.id ? { ...x, text: e.target.value } : x)) })
                            }
                            className="h-7 text-sm"
                          />
                          <Select
                            value={g.term}
                            onValueChange={(v) =>
                              updateDimension(dim.id, { goals: dim.goals.map((x) => (x.id === g.id ? { ...x, term: v as any } : x)) })
                            }
                          >
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">Curto</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="long">Longo</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            onClick={() => updateDimension(dim.id, { goals: dim.goals.filter((x) => x.id !== g.id) })}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm">{g.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Ações</label>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => addAction(dim.id)} className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Ação
                    </Button>
                  )}
                </div>
                <div className="space-y-1.5 mt-1">
                  {dim.actions.map((a) => (
                    <div key={a.id} className="flex items-center gap-2">
                      <Badge variant={termColors[a.term] as any} className="text-xs shrink-0">{termLabels[a.term]}</Badge>
                      {canEdit ? (
                        <>
                          <Input
                            value={a.text}
                            onChange={(e) =>
                              updateDimension(dim.id, { actions: dim.actions.map((x) => (x.id === a.id ? { ...x, text: e.target.value } : x)) })
                            }
                            className="h-7 text-sm"
                          />
                          <Select
                            value={a.term}
                            onValueChange={(v) =>
                              updateDimension(dim.id, { actions: dim.actions.map((x) => (x.id === a.id ? { ...x, term: v as any } : x)) })
                            }
                          >
                            <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="short">Curto</SelectItem>
                              <SelectItem value="medium">Médio</SelectItem>
                              <SelectItem value="long">Longo</SelectItem>
                            </SelectContent>
                          </Select>
                          <button
                            onClick={() => updateDimension(dim.id, { actions: dim.actions.filter((x) => x.id !== a.id) })}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm">{a.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Indicators */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground uppercase">Indicadores</label>
                  {canEdit && (
                    <Button variant="ghost" size="sm" onClick={() => addIndicator(dim.id)} className="h-6 text-xs">
                      <Plus className="h-3 w-3 mr-1" /> Indicador
                    </Button>
                  )}
                </div>
                <div className="space-y-1 mt-1">
                  {dim.indicators.map((ind) => (
                    <div key={ind.id} className="flex items-center gap-2">
                      <span className="text-muted-foreground">📊</span>
                      {canEdit ? (
                        <>
                          <Input
                            value={ind.text}
                            onChange={(e) =>
                              updateDimension(dim.id, { indicators: dim.indicators.map((x) => (x.id === ind.id ? { ...x, text: e.target.value } : x)) })
                            }
                            className="h-7 text-sm"
                          />
                          <button
                            onClick={() => updateDimension(dim.id, { indicators: dim.indicators.filter((x) => x.id !== ind.id) })}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-sm">{ind.text}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
