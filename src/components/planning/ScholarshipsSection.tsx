import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, X, Save, DollarSign, Award, Landmark } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
  canEdit: boolean;
}

interface ScholarshipEntry {
  id: string;
  source: string;
  type: string;
  quantity: number;
  level: string;
  notes: string;
}

interface FundingEntry {
  id: string;
  funder: string;
  project: string;
  amount: string;
  yearStart: number;
  yearEnd: number | null;
}

interface ScholarshipData {
  scholarships: ScholarshipEntry[];
  funding: FundingEntry[];
  notes: string;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const defaultData: ScholarshipData = { scholarships: [], funding: [], notes: "" };

export default function ScholarshipsSection({ data, startYear, endYear, canEdit }: Props) {
  const { toast } = useToast();
  const [sData, setSData] = useState<ScholarshipData>(defaultData);
  const [saving, setSaving] = useState(false);

  // Auto-extract funding info from projects
  const projectFunding = data.projects.filter(
    (p) => p.funding && p.funding !== "Não" &&
    ((p.year_start && p.year_start >= startYear) || (p.year_end && p.year_end >= startYear))
  );

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("planning_data")
        .select("config")
        .eq("program_id", data.program.id)
        .eq("type", "scholarships")
        .maybeSingle();
      if (rows?.config && typeof rows.config === "object" && !Array.isArray(rows.config)) {
        setSData(rows.config as unknown as ScholarshipData);
      }
    })();
  }, [data.program.id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("planning_data")
      .upsert({ program_id: data.program.id, type: "scholarships", config: sData as any }, { onConflict: "program_id,type" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados de bolsas salvos" });
    }
  };

  const addScholarship = () => {
    setSData({
      ...sData,
      scholarships: [...sData.scholarships, { id: uid(), source: "CAPES", type: "DS", quantity: 1, level: "Mestrado", notes: "" }],
    });
  };

  const removeScholarship = (id: string) => {
    setSData({ ...sData, scholarships: sData.scholarships.filter((s) => s.id !== id) });
  };

  const updateScholarship = (id: string, field: keyof ScholarshipEntry, value: string | number) => {
    setSData({
      ...sData,
      scholarships: sData.scholarships.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    });
  };

  const addFunding = () => {
    setSData({
      ...sData,
      funding: [...sData.funding, { id: uid(), funder: "", project: "", amount: "", yearStart: startYear, yearEnd: null }],
    });
  };

  const removeFunding = (id: string) => {
    setSData({ ...sData, funding: sData.funding.filter((f) => f.id !== id) });
  };

  const updateFunding = (id: string, field: keyof FundingEntry, value: string | number | null) => {
    setSData({
      ...sData,
      funding: sData.funding.map((f) => (f.id === id ? { ...f, [field]: value } : f)),
    });
  };

  const totalBolsas = sData.scholarships.reduce((s, b) => s + b.quantity, 0);

  return (
    <div className="space-y-6">
      {canEdit && (
        <div className="flex gap-2 justify-end">
          <Button size="sm" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4 mr-1" /> {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Award className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{totalBolsas}</p>
              <p className="text-xs text-muted-foreground">Bolsas registradas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Landmark className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{projectFunding.length}</p>
              <p className="text-xs text-muted-foreground">Projetos financiados</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{sData.funding.length}</p>
              <p className="text-xs text-muted-foreground">Fontes de financiamento</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scholarships table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Bolsas</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addScholarship}>
              <Plus className="h-4 w-4 mr-1" /> Bolsa
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sData.scholarships.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma bolsa registrada. {canEdit ? "Clique em + Bolsa para adicionar." : ""}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fonte</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nível</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Obs</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sData.scholarships.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      {canEdit ? (
                        <Input value={s.source} onChange={(e) => updateScholarship(s.id, "source", e.target.value)} className="h-7 text-sm w-24" />
                      ) : s.source}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input value={s.type} onChange={(e) => updateScholarship(s.id, "type", e.target.value)} className="h-7 text-sm w-20" />
                      ) : s.type}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input value={s.level} onChange={(e) => updateScholarship(s.id, "level", e.target.value)} className="h-7 text-sm w-24" />
                      ) : <Badge variant="outline">{s.level}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {canEdit ? (
                        <Input type="number" value={s.quantity} onChange={(e) => updateScholarship(s.id, "quantity", Number(e.target.value))} className="h-7 text-sm w-16 text-center" />
                      ) : s.quantity}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input value={s.notes} onChange={(e) => updateScholarship(s.id, "notes", e.target.value)} className="h-7 text-sm" placeholder="Observações" />
                      ) : <span className="text-xs text-muted-foreground">{s.notes}</span>}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <button onClick={() => removeScholarship(s.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Additional funding */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Financiamentos e Fomento</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addFunding}>
              <Plus className="h-4 w-4 mr-1" /> Financiamento
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {sData.funding.length === 0 && projectFunding.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum financiamento registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Financiador</TableHead>
                  <TableHead>Projeto</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Período</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Auto-extracted from projects */}
                {projectFunding.map((p) => {
                  const r = data.researchers.find((r) => r.id === p.researcher_id);
                  return (
                    <TableRow key={p.id} className="bg-muted/30">
                      <TableCell className="text-sm">
                        <span className="text-muted-foreground">🔄</span> {p.funder || "N/I"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[250px] truncate">{p.title}</TableCell>
                      <TableCell className="text-sm">{p.funding}</TableCell>
                      <TableCell className="text-sm">{p.year_start || "?"} – {p.year_end || "atual"}</TableCell>
                      {canEdit && <TableCell />}
                    </TableRow>
                  );
                })}
                {/* Manual entries */}
                {sData.funding.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      {canEdit ? (
                        <Input value={f.funder} onChange={(e) => updateFunding(f.id, "funder", e.target.value)} className="h-7 text-sm" placeholder="CAPES, CNPq..." />
                      ) : f.funder}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input value={f.project} onChange={(e) => updateFunding(f.id, "project", e.target.value)} className="h-7 text-sm" placeholder="Nome do projeto" />
                      ) : f.project}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Input value={f.amount} onChange={(e) => updateFunding(f.id, "amount", e.target.value)} className="h-7 text-sm w-28" placeholder="R$ 0,00" />
                      ) : f.amount}
                    </TableCell>
                    <TableCell className="text-sm">
                      {canEdit ? (
                        <div className="flex gap-1 items-center">
                          <Input type="number" value={f.yearStart} onChange={(e) => updateFunding(f.id, "yearStart", Number(e.target.value))} className="h-7 text-sm w-20" />
                          <span>–</span>
                          <Input type="number" value={f.yearEnd || ""} onChange={(e) => updateFunding(f.id, "yearEnd", e.target.value ? Number(e.target.value) : null)} className="h-7 text-sm w-20" placeholder="atual" />
                        </div>
                      ) : `${f.yearStart} – ${f.yearEnd || "atual"}`}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <button onClick={() => removeFunding(f.id)} className="text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Observações Gerais</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Textarea
              value={sData.notes}
              onChange={(e) => setSData({ ...sData, notes: e.target.value })}
              placeholder="Informações adicionais sobre bolsas e financiamento..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{sData.notes || "Nenhuma observação."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
