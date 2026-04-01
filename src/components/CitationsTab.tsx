import { useState, useMemo } from "react";
import type { Researcher } from "@/hooks/useProgram";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Award, Plus, Save, Trash2, Eye, EyeOff, BookOpen, Globe, GraduationCap } from "lucide-react";

export interface CitationEntry {
  id: string;
  researcher_id: string;
  source: "wos" | "scopus" | "scholar" | "other";
  source_name: string | null;
  researcher_id_wos: string | null;
  total_citations: number | null;
  total_works: number | null;
  h_index: number | null;
  search_name: string | null;
  profile_link: string | null;
  reference_date: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
}

interface Props {
  researchers: Researcher[];
  citations: CitationEntry[];
  onRefresh: () => Promise<void>;
}

const SOURCE_LABELS: Record<string, { label: string; icon: typeof Award }> = {
  wos: { label: "Web of Science", icon: Globe },
  scopus: { label: "Scopus", icon: BookOpen },
  scholar: { label: "Google Scholar", icon: GraduationCap },
  other: { label: "Outras Bases", icon: Award },
};

const emptyForm = {
  source: "wos" as CitationEntry["source"],
  source_name: "",
  researcher_id_wos: "",
  total_citations: 0,
  total_works: 0,
  h_index: 0,
  search_name: "",
  profile_link: "",
  reference_date: "",
  is_public: true,
};

const CitationsTab = ({ researchers, citations, onRefresh }: Props) => {
  const { toast } = useToast();
  const [selectedResearcherId, setSelectedResearcherId] = useState<string>(researchers[0]?.id || "");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  const researcherCitations = useMemo(
    () => citations.filter((c) => c.researcher_id === selectedResearcherId),
    [citations, selectedResearcherId]
  );

  const grouped = useMemo(() => {
    const map: Record<string, CitationEntry[]> = { wos: [], scopus: [], scholar: [], other: [] };
    researcherCitations.forEach((c) => {
      (map[c.source] ??= []).push(c);
    });
    return map;
  }, [researcherCitations]);

  // Aggregated KPIs
  const totalCitations = citations.reduce((s, c) => s + (c.total_citations || 0), 0);
  const totalWorks = citations.reduce((s, c) => s + (c.total_works || 0), 0);
  const hIndices = citations.filter((c) => c.h_index && c.h_index > 0).map((c) => c.h_index!);
  const avgHIndex = hIndices.length > 0 ? (hIndices.reduce((s, h) => s + h, 0) / hIndices.length).toFixed(1) : "0";

  const handleEdit = (entry: CitationEntry) => {
    setEditingId(entry.id);
    setForm({
      source: entry.source,
      source_name: entry.source_name || "",
      researcher_id_wos: entry.researcher_id_wos || "",
      total_citations: entry.total_citations || 0,
      total_works: entry.total_works || 0,
      h_index: entry.h_index || 0,
      search_name: entry.search_name || "",
      profile_link: entry.profile_link || "",
      reference_date: entry.reference_date || "",
      is_public: entry.is_public ?? true,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!selectedResearcherId) return;
    setSaving(true);

    const payload = {
      researcher_id: selectedResearcherId,
      source: form.source,
      source_name: form.source === "other" ? form.source_name || null : null,
      researcher_id_wos: form.source === "wos" ? form.researcher_id_wos || null : null,
      total_citations: form.total_citations,
      total_works: form.total_works,
      h_index: form.h_index || null,
      search_name: form.search_name || null,
      profile_link: form.profile_link || null,
      reference_date: form.reference_date || null,
      is_public: form.is_public,
    };

    let error;
    if (editingId) {
      ({ error } = await supabase.from("citation_entries").update(payload).eq("id", editingId));
    } else {
      ({ error } = await supabase.from("citation_entries").insert(payload as any));
    }

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Salvo", description: "Registro de citação salvo com sucesso." });
      setShowForm(false);
      setEditingId(null);
      setForm({ ...emptyForm });
      await onRefresh();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("citation_entries").delete().eq("id", id);
    toast({ title: "Removido", description: "Registro de citação removido." });
    await onRefresh();
  };

  const handleNew = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setShowForm(true);
  };

  const renderSourceSection = (source: string, entries: CitationEntry[]) => {
    const { label, icon: Icon } = SOURCE_LABELS[source];
    return (
      <div key={source} className="rounded-lg border bg-card p-5 space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Icon className="h-4 w-4 text-accent" /> {label}
          {entries.length === 0 && <span className="text-xs text-muted-foreground font-normal ml-2">Sem registros</span>}
        </h3>
        {entries.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                {source === "wos" && <TableHead>ResearcherID</TableHead>}
                {source === "other" && <TableHead>Base</TableHead>}
                <TableHead>Citações</TableHead>
                <TableHead>Trabalhos</TableHead>
                {(source === "wos") && <TableHead>h-index</TableHead>}
                <TableHead>Nome busca</TableHead>
                {(source === "scholar" || source === "other") && <TableHead>Link</TableHead>}
                <TableHead>Data</TableHead>
                <TableHead className="w-10">Vis.</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  {source === "wos" && <TableCell className="font-mono text-xs">{e.researcher_id_wos || "—"}</TableCell>}
                  {source === "other" && <TableCell>{e.source_name || "—"}</TableCell>}
                  <TableCell className="font-bold">{e.total_citations ?? 0}</TableCell>
                  <TableCell>{e.total_works ?? 0}</TableCell>
                  {(source === "wos") && <TableCell className="font-bold">{e.h_index ?? 0}</TableCell>}
                  <TableCell className="text-xs">{e.search_name || "—"}</TableCell>
                  {(source === "scholar" || source === "other") && (
                    <TableCell>
                      {e.profile_link ? (
                        <a href={e.profile_link} target="_blank" rel="noopener noreferrer" className="text-accent underline text-xs">Abrir</a>
                      ) : "—"}
                    </TableCell>
                  )}
                  <TableCell className="text-xs">{e.reference_date || "—"}</TableCell>
                  <TableCell>{e.is_public ? <Eye className="h-3.5 w-3.5 text-accent" /> : <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(e)}>Editar</Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(e.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Citações totais", value: totalCitations },
          { label: "Trabalhos indexados", value: totalWorks },
          { label: "h-index médio", value: avgHIndex },
          { label: "Registros", value: citations.length },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg border bg-card p-4 text-center">
            <Award className="h-4 w-4 text-accent mx-auto mb-1" />
            <div className="text-2xl font-bold text-foreground">{value}</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      {/* Researcher selector + add button */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedResearcherId} onValueChange={setSelectedResearcherId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecione pesquisador" />
          </SelectTrigger>
          <SelectContent>
            {researchers.map((r) => (
              <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={handleNew}>
          <Plus className="h-4 w-4 mr-1" /> Nova citação
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="rounded-lg border bg-card p-5 space-y-4 max-w-2xl">
          <h3 className="font-semibold text-foreground">{editingId ? "Editar citação" : "Nova citação"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Base</Label>
              <Select value={form.source} onValueChange={(v) => setForm((f) => ({ ...f, source: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="wos">Web of Science</SelectItem>
                  <SelectItem value="scopus">Scopus</SelectItem>
                  <SelectItem value="scholar">Google Scholar</SelectItem>
                  <SelectItem value="other">Outra base</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.source === "other" && (
              <div className="space-y-1">
                <Label className="text-xs">Nome da base</Label>
                <Input value={form.source_name} onChange={(e) => setForm((f) => ({ ...f, source_name: e.target.value }))} />
              </div>
            )}
            {form.source === "wos" && (
              <div className="space-y-1">
                <Label className="text-xs">ResearcherID</Label>
                <Input value={form.researcher_id_wos} onChange={(e) => setForm((f) => ({ ...f, researcher_id_wos: e.target.value }))} placeholder="Ex: A-1234-5678" />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Citações totais</Label>
              <Input type="number" value={form.total_citations} onChange={(e) => setForm((f) => ({ ...f, total_citations: +e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nº trabalhos</Label>
              <Input type="number" value={form.total_works} onChange={(e) => setForm((f) => ({ ...f, total_works: +e.target.value }))} />
            </div>
            {(form.source === "wos") && (
              <div className="space-y-1">
                <Label className="text-xs">h-index</Label>
                <Input type="number" value={form.h_index} onChange={(e) => setForm((f) => ({ ...f, h_index: +e.target.value }))} />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Nome usado na busca</Label>
              <Input value={form.search_name} onChange={(e) => setForm((f) => ({ ...f, search_name: e.target.value }))} />
            </div>
            {(form.source === "scholar" || form.source === "other") && (
              <div className="space-y-1">
                <Label className="text-xs">Link do perfil</Label>
                <Input value={form.profile_link} onChange={(e) => setForm((f) => ({ ...f, profile_link: e.target.value }))} placeholder="https://..." />
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">Data de referência</Label>
              <Input type="date" value={form.reference_date} onChange={(e) => setForm((f) => ({ ...f, reference_date: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={form.is_public} onCheckedChange={(v) => setForm((f) => ({ ...f, is_public: v }))} />
              <Label className="text-xs">{form.is_public ? "Público" : "Privado"}</Label>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setEditingId(null); }}>Cancelar</Button>
          </div>
        </div>
      )}

      {/* Sections by source */}
      {selectedResearcherId && (
        <div className="space-y-4">
          {Object.entries(grouped).map(([source, entries]) => renderSourceSection(source, entries))}
        </div>
      )}
    </div>
  );
};

export default CitationsTab;
