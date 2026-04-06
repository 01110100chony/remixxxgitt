import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Save, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";
import { generateDiagnostic, generateSwot, type SwotData, type SwotItem } from "@/lib/planning-diagnostic";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
  canEdit: boolean;
}

type Quadrant = keyof SwotData;

const quadrantConfig: { key: Quadrant; label: string; color: string; bgClass: string }[] = [
  { key: "strengths", label: "Forças (S)", color: "text-green-700 dark:text-green-400", bgClass: "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20" },
  { key: "weaknesses", label: "Fraquezas (W)", color: "text-red-700 dark:text-red-400", bgClass: "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20" },
  { key: "opportunities", label: "Oportunidades (O)", color: "text-blue-700 dark:text-blue-400", bgClass: "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20" },
  { key: "threats", label: "Ameaças (T)", color: "text-yellow-700 dark:text-yellow-400", bgClass: "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/20" },
];

export default function SwotSection({ data, startYear, endYear, canEdit }: Props) {
  const { toast } = useToast();
  const [swot, setSwot] = useState<SwotData | null>(null);
  const [newTexts, setNewTexts] = useState<Record<Quadrant, string>>({ strengths: "", weaknesses: "", opportunities: "", threats: "" });
  const [saving, setSaving] = useState(false);

  const autoSwot = useMemo(() => {
    const diag = generateDiagnostic(data, startYear, endYear);
    return generateSwot(diag, data);
  }, [data, startYear, endYear]);

  // Load saved SWOT
  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("planning_data")
        .select("config")
        .eq("program_id", data.program.id)
        .eq("type", "swot")
        .maybeSingle();
      if (rows?.config && typeof rows.config === "object" && !Array.isArray(rows.config)) {
        const saved = rows.config as unknown as SwotData;
        // Merge auto items with saved manual items
        const merged: SwotData = { strengths: [], weaknesses: [], opportunities: [], threats: [] };
        for (const q of ["strengths", "weaknesses", "opportunities", "threats"] as Quadrant[]) {
          const autoItems = autoSwot[q];
          const savedManual = (saved[q] || []).filter((s: SwotItem) => !s.auto);
          merged[q] = [...autoItems, ...savedManual];
        }
        setSwot(merged);
      } else {
        setSwot(autoSwot);
      }
    })();
  }, [data.program.id, autoSwot]);

  const handleAdd = (q: Quadrant) => {
    if (!newTexts[q].trim() || !swot) return;
    const item: SwotItem = { id: Math.random().toString(36).slice(2, 10), text: newTexts[q].trim(), auto: false };
    setSwot({ ...swot, [q]: [...swot[q], item] });
    setNewTexts({ ...newTexts, [q]: "" });
  };

  const handleRemove = (q: Quadrant, id: string) => {
    if (!swot) return;
    setSwot({ ...swot, [q]: swot[q].filter((i) => i.id !== id) });
  };

  const handleRegenerate = () => {
    setSwot(autoSwot);
    toast({ title: "SWOT regenerada", description: "Itens automáticos atualizados." });
  };

  const handleSave = async () => {
    if (!swot) return;
    setSaving(true);
    const { error } = await supabase
      .from("planning_data")
      .upsert({ program_id: data.program.id, type: "swot", config: swot as any }, { onConflict: "program_id,type" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "SWOT salva com sucesso" });
    }
  };

  if (!swot) return null;

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quadrantConfig.map(({ key, label, color, bgClass }) => (
          <Card key={key} className={bgClass}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm ${color}`}>{label}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {swot[key].map((item) => (
                <div key={item.id} className="flex items-start gap-2 text-sm">
                  <span className="flex-1">
                    {item.auto ? "🔄" : "✏️"} {item.text}
                  </span>
                  {canEdit && !item.auto && (
                    <button onClick={() => handleRemove(key, item.id)} className="text-muted-foreground hover:text-destructive">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <div className="flex gap-1 mt-2">
                  <Input
                    placeholder="Adicionar item..."
                    value={newTexts[key]}
                    onChange={(e) => setNewTexts({ ...newTexts, [key]: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && handleAdd(key)}
                    className="text-sm h-8"
                  />
                  <Button size="sm" variant="ghost" onClick={() => handleAdd(key)} className="h-8 px-2">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
