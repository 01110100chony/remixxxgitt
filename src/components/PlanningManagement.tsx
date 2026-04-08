import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ProgramData } from "@/hooks/useProgram";
import { getQuadrienio } from "@/lib/orientation-utils";
import DiagnosticSection from "@/components/planning/DiagnosticSection";
import SwotSection from "@/components/planning/SwotSection";
import StrategicPlanSection from "@/components/planning/StrategicPlanSection";
import AcademicManagementSection from "@/components/planning/AcademicManagementSection";
import ScholarshipsSection from "@/components/planning/ScholarshipsSection";
import MobilitySection from "@/components/planning/MobilitySection";

interface Props {
  data: ProgramData;
  canEdit: boolean;
}

type PeriodMode = "quadrienio" | "custom" | "all";

export default function PlanningManagement({ data, canEdit }: Props) {
  const [q] = useState(getQuadrienio);
  const [periodMode, setPeriodMode] = useState<PeriodMode>("quadrienio");
  const [customStart, setCustomStart] = useState(q[0]);
  const [customEnd, setCustomEnd] = useState(q[1]);

  const years = useMemo(() => {
    const allYears = [
      ...data.articles.map((a) => a.year),
      ...data.orientations.map((o) => o.year),
    ].filter(Boolean) as number[];
    const min = allYears.length > 0 ? Math.min(...allYears) : q[0];
    const max = allYears.length > 0 ? Math.max(...allYears) : q[1];
    return { min, max };
  }, [data, q]);

  const startYear = periodMode === "quadrienio" ? q[0] : periodMode === "custom" ? customStart : years.min;
  const endYear = periodMode === "quadrienio" ? q[1] : periodMode === "custom" ? customEnd : years.max;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label className="text-xs">Período</Label>
          <Select value={periodMode} onValueChange={(v) => setPeriodMode(v as PeriodMode)}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quadrienio">Quadriênio ({q[0]}–{q[1]})</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {periodMode === "custom" && (
          <>
            <div>
              <Label className="text-xs">Início</Label>
              <Input type="number" className="w-24" value={customStart} onChange={(e) => setCustomStart(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Fim</Label>
              <Input type="number" className="w-24" value={customEnd} onChange={(e) => setCustomEnd(Number(e.target.value))} />
            </div>
          </>
        )}
      </div>

      <Tabs defaultValue="diagnostic">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="diagnostic">Diagnóstico</TabsTrigger>
          <TabsTrigger value="swot">Matriz SWOT</TabsTrigger>
          <TabsTrigger value="strategic">Planejamento Estratégico</TabsTrigger>
          <TabsTrigger value="academic">Gestão Acadêmica</TabsTrigger>
          <TabsTrigger value="scholarships">Bolsas e Financiamento</TabsTrigger>
          <TabsTrigger value="mobility">Mobilidade</TabsTrigger>
        </TabsList>

        <TabsContent value="diagnostic" className="mt-4">
          <DiagnosticSection data={data} startYear={startYear} endYear={endYear} />
        </TabsContent>
        <TabsContent value="swot" className="mt-4">
          <SwotSection data={data} startYear={startYear} endYear={endYear} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="strategic" className="mt-4">
          <StrategicPlanSection data={data} startYear={startYear} endYear={endYear} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="academic" className="mt-4">
          <AcademicManagementSection data={data} startYear={startYear} endYear={endYear} />
        </TabsContent>
        <TabsContent value="scholarships" className="mt-4">
          <ScholarshipsSection data={data} startYear={startYear} endYear={endYear} canEdit={canEdit} />
        </TabsContent>
        <TabsContent value="mobility" className="mt-4">
          <MobilitySection data={data} startYear={startYear} endYear={endYear} canEdit={canEdit} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
