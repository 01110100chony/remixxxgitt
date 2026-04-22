import { useMemo, useState } from "react";
import { Plus, Trash2, Palette, Sparkles, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { OtherProduction, Researcher } from "@/hooks/useProgram";

interface OtherProductionsTabProps {
  productions: OtherProduction[];
  researchers: Researcher[];
  programId: string;
  onRefresh: () => void;
}

const CATEGORIES = [
  { value: "artistic", label: "Artística/Cultural", icon: Palette },
  { value: "other", label: "Outras", icon: Sparkles },
];

const TYPE_SUGGESTIONS: Record<string, string[]> = {
  artistic: ["Exposição", "Performance", "Composição musical", "Obra audiovisual", "Curadoria", "Apresentação artística", "Publicação literária"],
  other: ["Patente", "Norma técnica", "Premiação", "Material didático", "Tradução", "Organização de evento", "Outro"],
};

const OtherProductionsTab = ({ productions, researchers, programId, onRefresh }: OtherProductionsTabProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeCategory, setActiveCategory] = useState<string>("artistic");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    category: "artistic",
    type: "",
    title: "",
    description: "",
    year: "",
    researcher_id: "",
  });

  const [form, setForm] = useState({
    researcher_id: "",
    category: "artistic",
    type: "",
    title: "",
    description: "",
    year: new Date().getFullYear().toString(),
  });

  const filtered = useMemo(
    () => productions.filter((p) => p.category === activeCategory).sort((a, b) => (b.year || 0) - (a.year || 0)),
    [productions, activeCategory]
  );

  const resetForm = () => {
    setForm({
      researcher_id: "",
      category: activeCategory,
      type: "",
      title: "",
      description: "",
      year: new Date().getFullYear().toString(),
    });
  };

  const openForm = () => {
    setForm((f) => ({ ...f, category: activeCategory }));
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.researcher_id || !form.title.trim()) {
      toast({ title: "Campos obrigatórios", description: "Selecione o pesquisador e informe o título.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const yearNum = parseInt(form.year);
    const { error } = await supabase.from("other_productions").insert({
      researcher_id: form.researcher_id,
      program_id: programId,
      user_id: user?.id,
      category: form.category,
      type: form.type.trim() || null,
      title: form.title.trim(),
      description: form.description.trim() || null,
      year: isNaN(yearNum) ? null : yearNum,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produção cadastrada", description: form.title.trim() });
    setShowForm(false);
    resetForm();
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Excluir esta produção?")) return;
    const { error } = await supabase.from("other_productions").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Produção removida" });
    onRefresh();
  };

  const counts = useMemo(() => {
    return {
      artistic: productions.filter((p) => p.category === "artistic").length,
      other: productions.filter((p) => p.category === "other").length,
    };
  }, [productions]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Outras Produções</h2>
          <p className="text-sm text-muted-foreground">Cadastre manualmente produções artísticas, culturais e outras não capturadas pelo Lattes.</p>
        </div>
        <Button size="sm" onClick={openForm}>
          <Plus className="h-4 w-4 mr-1" /> Nova produção
        </Button>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList>
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <TabsTrigger key={c.value} value={c.value}>
                <Icon className="h-4 w-4 mr-1" /> {c.label}
                <Badge variant="secondary" className="ml-2">{counts[c.value as keyof typeof counts]}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cadastrar produção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pesquisador *</Label>
                <Select value={form.researcher_id} onValueChange={(v) => setForm({ ...form, researcher_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {researchers.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Categoria *</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v, type: "" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou digite" /></SelectTrigger>
                  <SelectContent>
                    {(TYPE_SUGGESTIONS[form.category] || []).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="Ou informe livremente" className="mt-1" />
              </div>
              <div className="space-y-1.5">
                <Label>Ano</Label>
                <Input type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Título da produção" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalhes adicionais, local, parceiros, etc." rows={3} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); resetForm(); }}>Cancelar</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma produção cadastrada nesta categoria.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Pesquisador</TableHead>
                  <TableHead className="w-20">Ano</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => {
                  const r = researchers.find((x) => x.id === p.researcher_id);
                  return (
                    <TableRow key={p.id}>
                      <TableCell>
                        <div className="font-medium">{p.title || "—"}</div>
                        {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                      </TableCell>
                      <TableCell><Badge variant="outline">{p.type || "—"}</Badge></TableCell>
                      <TableCell className="text-sm">{r?.name || "—"}</TableCell>
                      <TableCell>{p.year || "—"}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OtherProductionsTab;
