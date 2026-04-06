import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import type { ProgramData } from "@/hooks/useProgram";
import { generateDiagnostic, type DiagnosticItem } from "@/lib/planning-diagnostic";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
}

const statusIcon = (s: DiagnosticItem["status"]) => {
  if (s === "good") return <CheckCircle2 className="h-4 w-4 text-green-500" />;
  if (s === "warning") return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
};

const statusBadge = (s: DiagnosticItem["status"]) => {
  const v = s === "good" ? "default" : s === "warning" ? "secondary" : "destructive";
  const label = s === "good" ? "Bom" : s === "warning" ? "Atenção" : "Crítico";
  return <Badge variant={v}>{label}</Badge>;
};

export default function DiagnosticSection({ data, startYear, endYear }: Props) {
  const items = useMemo(() => generateDiagnostic(data, startYear, endYear), [data, startYear, endYear]);

  const categories = useMemo(() => {
    const map = new Map<string, DiagnosticItem[]>();
    for (const item of items) {
      if (!map.has(item.category)) map.set(item.category, []);
      map.get(item.category)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const strengths = items.filter((i) => i.status === "good");
  const weaknesses = items.filter((i) => i.status === "bad");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Pontos Fortes ({strengths.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum ponto forte identificado automaticamente.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {strengths.map((s, i) => (
                  <li key={i}>✅ {s.label}: <strong>{s.value}</strong></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" /> Pontos Fracos ({weaknesses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weaknesses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum ponto fraco identificado automaticamente.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {weaknesses.map((w, i) => (
                  <li key={i}>⚠️ {w.label}: <strong>{w.value}</strong></li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <h3 className="font-semibold text-foreground">Indicadores Detalhados ({startYear}–{endYear})</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(([cat, catItems]) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {catItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5">
                    {statusIcon(item.status)} {item.label}
                  </span>
                  <span className="font-medium">{item.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
