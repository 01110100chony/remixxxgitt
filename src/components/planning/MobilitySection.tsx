import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, Save, Globe, Plane, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ProgramData } from "@/hooks/useProgram";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
  canEdit: boolean;
}

interface MobilityEntry {
  id: string;
  name: string;
  type: "incoming" | "outgoing";
  role: "student" | "professor" | "researcher";
  institution: string;
  country: string;
  year: number;
  duration: string;
  program: string;
}

interface AgreementEntry {
  id: string;
  institution: string;
  country: string;
  type: string;
  active: boolean;
  year: number;
}

interface MobilityData {
  mobility: MobilityEntry[];
  agreements: AgreementEntry[];
  notes: string;
}

function uid() { return Math.random().toString(36).slice(2, 10); }

const defaultData: MobilityData = { mobility: [], agreements: [], notes: "" };

export default function MobilitySection({ data, startYear, endYear, canEdit }: Props) {
  const { toast } = useToast();
  const [mData, setMData] = useState<MobilityData>(defaultData);
  const [saving, setSaving] = useState(false);

  const intScore = data.program.internationalization_score ?? 0;
  const hasEnglish = data.program.has_english_version ?? false;
  const partnerships = useMemo(() => {
    return [...new Set(data.projects.filter((p) => p.partner_institution).map((p) => p.partner_institution!))];
  }, [data.projects]);

  useEffect(() => {
    (async () => {
      const { data: rows } = await supabase
        .from("planning_data")
        .select("config")
        .eq("program_id", data.program.id)
        .eq("type", "mobility")
        .maybeSingle();
      if (rows?.config && typeof rows.config === "object" && !Array.isArray(rows.config)) {
        setMData(rows.config as unknown as MobilityData);
      }
    })();
  }, [data.program.id]);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("planning_data")
      .upsert({ program_id: data.program.id, type: "mobility", config: mData as any }, { onConflict: "program_id,type" });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Dados de mobilidade salvos" });
    }
  };

  const addMobility = () => {
    setMData({
      ...mData,
      mobility: [...mData.mobility, { id: uid(), name: "", type: "outgoing", role: "student", institution: "", country: "", year: new Date().getFullYear(), duration: "", program: "" }],
    });
  };

  const removeMobility = (id: string) => {
    setMData({ ...mData, mobility: mData.mobility.filter((m) => m.id !== id) });
  };

  const updateMobility = (id: string, field: keyof MobilityEntry, value: string | number) => {
    setMData({
      ...mData,
      mobility: mData.mobility.map((m) => (m.id === id ? { ...m, [field]: value } : m)),
    });
  };

  const addAgreement = () => {
    setMData({
      ...mData,
      agreements: [...mData.agreements, { id: uid(), institution: "", country: "", type: "Convênio", active: true, year: new Date().getFullYear() }],
    });
  };

  const removeAgreement = (id: string) => {
    setMData({ ...mData, agreements: mData.agreements.filter((a) => a.id !== id) });
  };

  const updateAgreement = (id: string, field: keyof AgreementEntry, value: string | number | boolean) => {
    setMData({
      ...mData,
      agreements: mData.agreements.map((a) => (a.id === id ? { ...a, [field]: value } : a)),
    });
  };

  const incoming = mData.mobility.filter((m) => m.type === "incoming");
  const outgoing = mData.mobility.filter((m) => m.type === "outgoing");

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold">{intScore}</p>
              <p className="text-xs text-muted-foreground">Score Internac.</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Plane className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{outgoing.length}</p>
              <p className="text-xs text-muted-foreground">Mobilidades (saída)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold">{incoming.length}</p>
              <p className="text-xs text-muted-foreground">Mobilidades (entrada)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Globe className="h-8 w-8 text-orange-600" />
            <div>
              <p className="text-2xl font-bold">{mData.agreements.filter((a) => a.active).length}</p>
              <p className="text-xs text-muted-foreground">Convênios ativos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Status de Internacionalização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Site em inglês</span>
              <Badge variant={hasEnglish ? "default" : "destructive"}>{hasEnglish ? "Sim" : "Não"}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Parcerias institucionais</span>
              <Badge variant="outline">{partnerships.length}</Badge>
            </div>
          </CardContent>
        </Card>
        {partnerships.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Instituições Parceiras (Projetos)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {partnerships.slice(0, 10).map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                ))}
                {partnerships.length > 10 && <Badge variant="outline">+{partnerships.length - 10}</Badge>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Mobility records */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Registros de Mobilidade</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addMobility}>
              <Plus className="h-4 w-4 mr-1" /> Mobilidade
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {mData.mobility.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma mobilidade registrada. {canEdit ? "Clique em + Mobilidade para adicionar." : ""}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Papel</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Ano</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mData.mobility.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      {canEdit ? <Input value={m.name} onChange={(e) => updateMobility(m.id, "name", e.target.value)} className="h-7 text-sm" placeholder="Nome" /> : m.name}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={m.type} onValueChange={(v) => updateMobility(m.id, "type", v)}>
                          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="outgoing">Saída</SelectItem>
                            <SelectItem value="incoming">Entrada</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <Badge variant={m.type === "incoming" ? "default" : "secondary"}>{m.type === "incoming" ? "Entrada" : "Saída"}</Badge>}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={m.role} onValueChange={(v) => updateMobility(m.id, "role", v)}>
                          <SelectTrigger className="h-7 text-xs w-28"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Discente</SelectItem>
                            <SelectItem value="professor">Docente</SelectItem>
                            <SelectItem value="researcher">Pesquisador</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : m.role === "student" ? "Discente" : m.role === "professor" ? "Docente" : "Pesquisador"}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input value={m.institution} onChange={(e) => updateMobility(m.id, "institution", e.target.value)} className="h-7 text-sm" /> : m.institution}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input value={m.country} onChange={(e) => updateMobility(m.id, "country", e.target.value)} className="h-7 text-sm w-24" /> : m.country}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input type="number" value={m.year} onChange={(e) => updateMobility(m.id, "year", Number(e.target.value))} className="h-7 text-sm w-20" /> : m.year}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <button onClick={() => removeMobility(m.id)} className="text-muted-foreground hover:text-destructive">
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

      {/* Agreements */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm">Convênios e Acordos</CardTitle>
          {canEdit && (
            <Button size="sm" variant="outline" onClick={addAgreement}>
              <Plus className="h-4 w-4 mr-1" /> Convênio
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {mData.agreements.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum convênio registrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Instituição</TableHead>
                  <TableHead>País</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ano</TableHead>
                  <TableHead>Status</TableHead>
                  {canEdit && <TableHead className="w-10" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {mData.agreements.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      {canEdit ? <Input value={a.institution} onChange={(e) => updateAgreement(a.id, "institution", e.target.value)} className="h-7 text-sm" /> : a.institution}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input value={a.country} onChange={(e) => updateAgreement(a.id, "country", e.target.value)} className="h-7 text-sm w-24" /> : a.country}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input value={a.type} onChange={(e) => updateAgreement(a.id, "type", e.target.value)} className="h-7 text-sm w-28" /> : a.type}
                    </TableCell>
                    <TableCell>
                      {canEdit ? <Input type="number" value={a.year} onChange={(e) => updateAgreement(a.id, "year", Number(e.target.value))} className="h-7 text-sm w-20" /> : a.year}
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select value={a.active ? "active" : "inactive"} onValueChange={(v) => updateAgreement(a.id, "active", v === "active")}>
                          <SelectTrigger className="h-7 text-xs w-24"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Ativo</SelectItem>
                            <SelectItem value="inactive">Inativo</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : <Badge variant={a.active ? "default" : "secondary"}>{a.active ? "Ativo" : "Inativo"}</Badge>}
                    </TableCell>
                    {canEdit && (
                      <TableCell>
                        <button onClick={() => removeAgreement(a.id)} className="text-muted-foreground hover:text-destructive">
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
          <CardTitle className="text-sm">Observações</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <Textarea
              value={mData.notes}
              onChange={(e) => setMData({ ...mData, notes: e.target.value })}
              placeholder="Informações adicionais sobre mobilidade e internacionalização..."
              rows={3}
            />
          ) : (
            <p className="text-sm text-muted-foreground">{mData.notes || "Nenhuma observação."}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
