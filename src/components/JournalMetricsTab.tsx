import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Trash2, Plus, Search } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

type FieldKey = "issn" | "year" | "snip" | "sjr" | "citescore" | "journal";
const FIELD_DEFS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: "issn", label: "ISSN", required: true },
  { key: "year", label: "Year (Ano)", required: false },
  { key: "snip", label: "SNIP", required: false },
  { key: "sjr", label: "SJR", required: false },
  { key: "citescore", label: "CiteScore", required: false },
  { key: "journal", label: "Journal (Periódico)", required: false },
];

interface RawCsv {
  file: File;
  headers: string[];
  rows: string[][];
}

interface CsvAnalysis {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  invalidReasons: { reason: string; count: number }[];
  duplicates: number;
  uniqueAfterDedup: number;
  sampleEntries: { issn: string; journal: string | null; snip: number | null; sjr: number | null; citescore: number | null; year: number | null }[];
  entries: {
    issn: string;
    journal: string | null;
    snip: number | null;
    sjr: number | null;
    citescore: number | null;
    year: number | null;
    source: string;
  }[];
}

interface JournalMetric {
  id: string;
  issn: string;
  journal: string | null;
  snip: number | null;
  sjr: number | null;
  citescore: number | null;
  year: number | null;
  source: string;
  updated_at: string;
}

const normalizeIssn = (s: string) => s.replace(/[^0-9X]/gi, "").toUpperCase();
const formatIssn = (s: string) => {
  const n = normalizeIssn(s);
  return n.length === 8 ? `${n.slice(0, 4)}-${n.slice(4)}` : n;
};
const num = (v: string | undefined | null) => {
  if (v === undefined || v === null || v === "") return null;
  const cleaned = String(v).replace(/\./g, "").replace(",", ".").trim();
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
};

// Parse CSV with auto-detected separator (`;` or `,`) and quoted fields
function parseCSV(text: string): string[][] {
  const stripped = text.replace(/^\uFEFF/, "");
  const firstLine = stripped.split(/\r?\n/, 1)[0] || "";
  const sep = (firstLine.match(/;/g)?.length || 0) >= (firstLine.match(/,/g)?.length || 0) ? ";" : ",";
  const rows: string[][] = [];
  let cur = "", row: string[] = [], inQ = false;
  for (let i = 0; i < stripped.length; i++) {
    const c = stripped[i];
    if (inQ) {
      if (c === '"' && stripped[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { row.push(cur); cur = ""; }
      else if (c === "\n") { row.push(cur); rows.push(row); row = []; cur = ""; }
      else if (c === "\r") { /* skip */ }
      else cur += c;
    }
  }
  if (cur.length || row.length) { row.push(cur); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length));
}

export default function JournalMetricsTab() {
  const { toast } = useToast();
  const { isCoordinatorOrAdmin } = useAuth();
  const [metrics, setMetrics] = useState<JournalMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({ issn: "", journal: "", snip: "", sjr: "", citescore: "", year: "" });
  const [rawCsv, setRawCsv] = useState<RawCsv | null>(null);
  const [colMap, setColMap] = useState<Record<FieldKey, number>>({
    issn: -1, year: -1, snip: -1, sjr: -1, citescore: -1, journal: -1,
  });
  const [analyzing, setAnalyzing] = useState(false);
  const [importMode, setImportMode] = useState<"replace" | "upsert">("upsert");

  const fetchMetrics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("journal_metrics")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1000);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else setMetrics((data || []) as JournalMetric[]);
    setLoading(false);
  };

  useEffect(() => { fetchMetrics(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return metrics;
    const q = search.toLowerCase();
    return metrics.filter(
      (m) =>
        m.issn.toLowerCase().includes(q) ||
        (m.journal || "").toLowerCase().includes(q),
    );
  }, [metrics, search]);

  const stats = useMemo(() => ({
    total: metrics.length,
    withSnip: metrics.filter((m) => m.snip != null).length,
    withSjr: metrics.filter((m) => m.sjr != null).length,
    withCs: metrics.filter((m) => m.citescore != null).length,
  }), [metrics]);

  const handleAdd = async () => {
    if (!form.issn.trim()) {
      toast({ title: "ISSN obrigatório", variant: "destructive" });
      return;
    }
    const issn = formatIssn(form.issn);
    const payload = {
      issn,
      journal: form.journal.trim() || null,
      snip: num(form.snip),
      sjr: num(form.sjr),
      citescore: num(form.citescore),
      year: form.year ? parseInt(form.year) || null : null,
      source: "manual",
    };
    const { error } = await supabase.from("journal_metrics").insert(payload);
    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Métrica adicionada", description: `${issn} cadastrado.` });
    setForm({ issn: "", journal: "", snip: "", sjr: "", citescore: "", year: "" });
    await fetchMetrics();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("journal_metrics").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Removido" });
    await fetchMetrics();
  };

  const handleClearAll = async () => {
    const { error } = await supabase.from("journal_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Tabela limpa" });
    await fetchMetrics();
  };

  const analyzeCSV = async (file: File) => {
    setAnalyzing(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast({ title: "CSV vazio", description: "Arquivo não contém linhas de dados.", variant: "destructive" });
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const findCol = (names: string[]) => {
        for (const n of names) {
          const i = headers.findIndex((h) => h === n || h.includes(n));
          if (i >= 0) return { idx: i, headerName: rows[0][i].trim() };
        }
        return { idx: -1, headerName: undefined };
      };
      const cIssn = findCol(["issn"]);
      const cJournal = findCol(["journal", "title", "periodico", "periódico", "revista"]);
      const cSnip = findCol(["snip"]);
      const cSjr = findCol(["sjr"]);
      const cCs = findCol(["citescore", "cite score", "cs"]);
      const cYear = findCol(["year", "ano"]);

      const detectedColumns = [
        { key: "ISSN", label: "ISSN", found: cIssn.idx >= 0, headerName: cIssn.headerName },
        { key: "Year", label: "Year (Ano)", found: cYear.idx >= 0, headerName: cYear.headerName },
        { key: "SNIP", label: "SNIP", found: cSnip.idx >= 0, headerName: cSnip.headerName },
        { key: "SJR", label: "SJR", found: cSjr.idx >= 0, headerName: cSjr.headerName },
        { key: "CiteScore", label: "CiteScore", found: cCs.idx >= 0, headerName: cCs.headerName },
        { key: "Journal", label: "Journal (Periódico)", found: cJournal.idx >= 0, headerName: cJournal.headerName },
      ];
      const missingRequired = detectedColumns.filter((c) => c.key === "ISSN" && !c.found).map((c) => c.label);
      const missingOptional = detectedColumns.filter((c) => c.key !== "ISSN" && !c.found).map((c) => c.label);

      const dataRows = rows.slice(1);
      const invalidCounters: Record<string, number> = {};
      const validEntries: NonNullable<CsvPreview["entries"]> = [];

      for (const r of dataRows) {
        if (cIssn.idx < 0) {
          invalidCounters["Coluna ISSN ausente"] = (invalidCounters["Coluna ISSN ausente"] || 0) + 1;
          continue;
        }
        const rawIssn = (r[cIssn.idx] || "").trim();
        if (!rawIssn) {
          invalidCounters["ISSN vazio"] = (invalidCounters["ISSN vazio"] || 0) + 1;
          continue;
        }
        const normalized = normalizeIssn(rawIssn);
        if (normalized.length !== 8) {
          invalidCounters["ISSN inválido (≠ 8 dígitos)"] = (invalidCounters["ISSN inválido (≠ 8 dígitos)"] || 0) + 1;
          continue;
        }
        const issn = formatIssn(rawIssn);
        const snip = cSnip.idx >= 0 ? num(r[cSnip.idx]) : null;
        const sjr = cSjr.idx >= 0 ? num(r[cSjr.idx]) : null;
        const citescore = cCs.idx >= 0 ? num(r[cCs.idx]) : null;
        const year = cYear.idx >= 0 && r[cYear.idx] ? parseInt(r[cYear.idx]) || null : null;

        if (snip == null && sjr == null && citescore == null) {
          invalidCounters["Sem nenhuma métrica (SNIP/SJR/CiteScore)"] =
            (invalidCounters["Sem nenhuma métrica (SNIP/SJR/CiteScore)"] || 0) + 1;
          continue;
        }

        validEntries.push({
          issn,
          journal: cJournal.idx >= 0 ? (r[cJournal.idx] || "").trim() || null : null,
          snip, sjr, citescore, year,
          source: "scopus_csv",
        });
      }

      // Deduplicate by ISSN+year
      const dedupMap = new Map<string, typeof validEntries[number]>();
      for (const e of validEntries) {
        const key = `${e.issn}|${e.year ?? ""}`;
        const prev = dedupMap.get(key);
        if (!prev) {
          dedupMap.set(key, e);
        } else {
          dedupMap.set(key, {
            issn: e.issn,
            year: e.year ?? prev.year,
            journal: e.journal ?? prev.journal,
            snip: e.snip ?? prev.snip,
            sjr: e.sjr ?? prev.sjr,
            citescore: e.citescore ?? prev.citescore,
            source: e.source,
          });
        }
      }
      const uniqueEntries = Array.from(dedupMap.values());

      setPreview({
        file,
        totalRows: dataRows.length,
        validRows: validEntries.length,
        invalidRows: dataRows.length - validEntries.length,
        invalidReasons: Object.entries(invalidCounters)
          .map(([reason, count]) => ({ reason, count }))
          .sort((a, b) => b.count - a.count),
        detectedColumns,
        missingRequired,
        missingOptional,
        duplicates: validEntries.length - uniqueEntries.length,
        uniqueAfterDedup: uniqueEntries.length,
        sampleEntries: uniqueEntries.slice(0, 5),
        entries: uniqueEntries,
      });
    } catch (e) {
      toast({ title: "Erro ao analisar CSV", description: (e as Error).message, variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const confirmImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const batch = 500;
      if (importMode === "replace") {
        await supabase.from("journal_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        for (let i = 0; i < preview.entries.length; i += batch) {
          const { error } = await supabase.from("journal_metrics").insert(preview.entries.slice(i, i + batch));
          if (error) {
            toast({ title: "Erro no lote", description: error.message, variant: "destructive" });
            return;
          }
        }
        toast({
          title: "Importação concluída (substituição)",
          description: `${preview.entries.length} registros importados${preview.duplicates > 0 ? ` (${preview.duplicates} duplicatas mescladas)` : ""}.`,
        });
      } else {
        // Upsert por chave (issn, year)
        let inserted = 0;
        let updated = 0;
        // Pré-lê os pares existentes para diferenciar inseridos vs atualizados
        const keysSet = new Set(metrics.map((m) => `${m.issn}|${m.year ?? ""}`));
        for (const e of preview.entries) {
          if (keysSet.has(`${e.issn}|${e.year ?? ""}`)) updated++;
          else inserted++;
        }
        for (let i = 0; i < preview.entries.length; i += batch) {
          const { error } = await supabase
            .from("journal_metrics")
            .upsert(preview.entries.slice(i, i + batch), { onConflict: "issn,year" });
          if (error) {
            toast({ title: "Erro no lote (upsert)", description: error.message, variant: "destructive" });
            return;
          }
        }
        toast({
          title: "Importação concluída (upsert)",
          description: `${inserted} novos, ${updated} atualizados${preview.duplicates > 0 ? ` (${preview.duplicates} duplicatas no CSV mescladas)` : ""}.`,
        });
      }
      setPreview(null);
      await fetchMetrics();
    } catch (e) {
      toast({ title: "Erro", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const handleExport = () => {
    const headers = ["ISSN", "Journal", "SNIP", "SJR", "CiteScore", "Year", "Source"];
    const rows = metrics.map((m) => [
      m.issn, m.journal || "", m.snip ?? "", m.sjr ?? "", m.citescore ?? "", m.year ?? "", m.source,
    ]);
    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `journal_metrics_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Periódicos</CardTitle>
          <CardDescription>
            Gerencie SNIP, SJR e CiteScore por ISSN. Esses valores alimentam a análise de impacto da Visão Institucional.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Com SNIP</p>
              <p className="text-2xl font-bold">{stats.withSnip}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Com SJR</p>
              <p className="text-2xl font-bold">{stats.withSjr}</p>
            </div>
            <div className="rounded-lg border bg-card p-3">
              <p className="text-xs text-muted-foreground">Com CiteScore</p>
              <p className="text-2xl font-bold">{stats.withCs}</p>
            </div>
          </div>

          {isCoordinatorOrAdmin && (
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) analyzeCSV(f);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" disabled={importing || analyzing} asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />
                    {analyzing ? "Analisando..." : importing ? "Importando..." : "Importar CSV (Scopus)"}
                  </span>
                </Button>
              </label>
              <Button variant="outline" size="sm" onClick={handleExport} disabled={metrics.length === 0}>
                <Download className="h-4 w-4 mr-1" /> Exportar CSV
              </Button>
              {metrics.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" /> Limpar tudo
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Limpar todas as métricas?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta ação removerá todos os {metrics.length} registros de journal_metrics. Não pode ser desfeita.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll}>Confirmar</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          )}

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Formato esperado do CSV:</p>
            <p>Colunas reconhecidas (cabeçalho na 1ª linha): <code>ISSN</code>, <code>Journal</code>, <code>SNIP</code>, <code>SJR</code>, <code>CiteScore</code>, <code>Year</code>.</p>
            <p>Separador: <code>;</code> ou <code>,</code>. Aceita arquivos exportados do Scopus Source List.</p>
            <p>Você poderá escolher entre <strong>upsert</strong> (atualiza apenas registros do CSV mantendo o restante) ou <strong>substituir tudo</strong> antes de confirmar.</p>
          </div>
        </CardContent>
      </Card>

      {isCoordinatorOrAdmin && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Adicionar manualmente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <Label className="text-xs">ISSN *</Label>
                <Input value={form.issn} onChange={(e) => setForm({ ...form, issn: e.target.value })} placeholder="0000-0000" />
              </div>
              <div className="lg:col-span-2">
                <Label className="text-xs">Periódico</Label>
                <Input value={form.journal} onChange={(e) => setForm({ ...form, journal: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">SNIP</Label>
                <Input value={form.snip} onChange={(e) => setForm({ ...form, snip: e.target.value })} placeholder="1.234" />
              </div>
              <div>
                <Label className="text-xs">SJR</Label>
                <Input value={form.sjr} onChange={(e) => setForm({ ...form, sjr: e.target.value })} placeholder="0.987" />
              </div>
              <div>
                <Label className="text-xs">CiteScore</Label>
                <Input value={form.citescore} onChange={(e) => setForm({ ...form, citescore: e.target.value })} placeholder="3.4" />
              </div>
              <div>
                <Label className="text-xs">Ano</Label>
                <Input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="2024" />
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={handleAdd} className="w-full">
                  <Plus className="h-4 w-4 mr-1" /> Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Registros ({filtered.length})</CardTitle>
          <div className="relative w-72 max-w-full">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por ISSN ou periódico..."
              className="pl-8"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              {metrics.length === 0 ? "Nenhuma métrica cadastrada." : "Nenhum resultado para a busca."}
            </p>
          ) : (
            <div className="max-h-[600px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ISSN</TableHead>
                    <TableHead>Periódico</TableHead>
                    <TableHead className="text-right">SNIP</TableHead>
                    <TableHead className="text-right">SJR</TableHead>
                    <TableHead className="text-right">CiteScore</TableHead>
                    <TableHead className="text-right">Ano</TableHead>
                    <TableHead>Fonte</TableHead>
                    {isCoordinatorOrAdmin && <TableHead className="w-12"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.slice(0, 500).map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.issn}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.journal || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.snip?.toFixed(3) ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.sjr?.toFixed(3) ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{m.citescore?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell className="text-right">{m.year ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className="text-xs">{m.source}</Badge></TableCell>
                      {isCoordinatorOrAdmin && (
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(m.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filtered.length > 500 && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  Exibindo 500 de {filtered.length} registros. Use a busca para refinar.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pré-validação do CSV</DialogTitle>
            <DialogDescription>
              {preview?.file.name} — revise antes de confirmar a importação.
            </DialogDescription>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {preview.missingRequired.length > 0 && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>Coluna obrigatória ausente</AlertTitle>
                  <AlertDescription>
                    {preview.missingRequired.join(", ")} — não é possível importar sem ISSN.
                  </AlertDescription>
                </Alert>
              )}

              {preview.missingOptional.length > 0 && preview.missingRequired.length === 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Colunas opcionais ausentes</AlertTitle>
                  <AlertDescription>
                    {preview.missingOptional.join(", ")} — registros importados terão esses campos vazios.
                  </AlertDescription>
                </Alert>
              )}

              <div>
                <p className="text-sm font-medium mb-2">Colunas detectadas</p>
                <div className="grid grid-cols-2 gap-2">
                  {preview.detectedColumns.map((c) => (
                    <div
                      key={c.key}
                      className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs ${
                        c.found ? "bg-card" : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {c.found ? (
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      )}
                      <span className="font-medium">{c.label}</span>
                      {c.found && c.headerName && (
                        <Badge variant="outline" className="ml-auto text-[10px] font-mono">
                          {c.headerName}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Total linhas</p>
                  <p className="text-lg font-bold">{preview.totalRows}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Válidas</p>
                  <p className="text-lg font-bold text-primary">{preview.validRows}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Inválidas</p>
                  <p className="text-lg font-bold text-destructive">{preview.invalidRows}</p>
                </div>
                <div className="rounded-lg border p-2">
                  <p className="text-[10px] uppercase text-muted-foreground">A importar</p>
                  <p className="text-lg font-bold">{preview.uniqueAfterDedup}</p>
                </div>
              </div>

              {preview.invalidReasons.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Motivos de invalidação</p>
                  <ul className="space-y-1 text-xs">
                    {preview.invalidReasons.map((r) => (
                      <li key={r.reason} className="flex justify-between rounded border bg-muted/30 px-2 py-1">
                        <span>{r.reason}</span>
                        <span className="font-mono font-semibold">{r.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.duplicates > 0 && (
                <p className="text-xs text-muted-foreground">
                  {preview.duplicates} duplicatas (mesmo ISSN+ano) serão mescladas automaticamente.
                </p>
              )}

              {preview.sampleEntries.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Amostra (primeiros {preview.sampleEntries.length} registros)</p>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">ISSN</TableHead>
                          <TableHead className="text-xs">Periódico</TableHead>
                          <TableHead className="text-xs text-right">SNIP</TableHead>
                          <TableHead className="text-xs text-right">SJR</TableHead>
                          <TableHead className="text-xs text-right">CS</TableHead>
                          <TableHead className="text-xs text-right">Ano</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {preview.sampleEntries.map((e, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-mono text-xs">{e.issn}</TableCell>
                            <TableCell className="text-xs max-w-[140px] truncate">{e.journal || "—"}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{e.snip?.toFixed(3) ?? "—"}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{e.sjr?.toFixed(3) ?? "—"}</TableCell>
                            <TableCell className="text-xs text-right tabular-nums">{e.citescore?.toFixed(2) ?? "—"}</TableCell>
                            <TableCell className="text-xs text-right">{e.year ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <p className="text-sm font-medium">Modo de importação</p>
                <div className="grid sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode("upsert")}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      importMode === "upsert" ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Upsert por ISSN+ano
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Atualiza registros existentes e insere novos. Mantém registros que não estão no CSV.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode("replace")}
                    className={`text-left rounded-lg border p-3 transition-colors ${
                      importMode === "replace" ? "border-destructive bg-destructive/5 ring-1 ring-destructive" : "hover:bg-muted/40"
                    }`}
                  >
                    <p className="text-sm font-semibold flex items-center gap-2">
                      <Trash2 className="h-4 w-4 text-destructive" />
                      Substituir tudo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Remove todos os {metrics.length} registros existentes e importa apenas os deste CSV.
                    </p>
                  </button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={importing}>
              Cancelar
            </Button>
            <Button
              onClick={confirmImport}
              variant={importMode === "replace" ? "destructive" : "default"}
              disabled={!preview || preview.uniqueAfterDedup === 0 || preview.missingRequired.length > 0 || importing}
            >
              {importing
                ? "Importando..."
                : importMode === "replace"
                  ? `Substituir tudo (${preview?.uniqueAfterDedup ?? 0})`
                  : `Aplicar upsert (${preview?.uniqueAfterDedup ?? 0})`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
