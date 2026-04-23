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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

interface CsvPreview {
  file: File;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  invalidReasons: { reason: string; count: number }[];
  detectedColumns: { key: string; label: string; found: boolean; headerName?: string }[];
  missingRequired: string[];
  missingOptional: string[];
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
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handleCSV = async (file: File) => {
    setImporting(true);
    try {
      const text = await file.text();
      const rows = parseCSV(text);
      if (rows.length < 2) {
        toast({ title: "CSV vazio", variant: "destructive" });
        return;
      }
      const headers = rows[0].map((h) => h.trim().toLowerCase());
      const idx = (names: string[]) => {
        for (const n of names) {
          const i = headers.findIndex((h) => h === n || h.includes(n));
          if (i >= 0) return i;
        }
        return -1;
      };
      const iIssn = idx(["issn"]);
      const iJournal = idx(["journal", "title", "periodico", "periódico", "revista"]);
      const iSnip = idx(["snip"]);
      const iSjr = idx(["sjr"]);
      const iCs = idx(["citescore", "cite score", "cs"]);
      const iYear = idx(["year", "ano"]);

      if (iIssn < 0) {
        toast({ title: "Coluna ISSN não encontrada", description: "O CSV deve conter coluna 'ISSN'.", variant: "destructive" });
        return;
      }

      const rawEntries = rows.slice(1)
        .map((r) => {
          const rawIssn = (r[iIssn] || "").trim();
          if (!rawIssn) return null;
          const issn = formatIssn(rawIssn);
          if (!issn) return null;
          return {
            issn,
            journal: iJournal >= 0 ? (r[iJournal] || "").trim() || null : null,
            snip: iSnip >= 0 ? num(r[iSnip]) : null,
            sjr: iSjr >= 0 ? num(r[iSjr]) : null,
            citescore: iCs >= 0 ? num(r[iCs]) : null,
            year: iYear >= 0 && r[iYear] ? parseInt(r[iYear]) || null : null,
            source: "scopus_csv",
          };
        })
        .filter((e): e is NonNullable<typeof e> => !!e);

      if (rawEntries.length === 0) {
        toast({ title: "Nenhuma linha válida", variant: "destructive" });
        return;
      }

      // Deduplicate by ISSN+year (last occurrence wins, but merge non-null metrics from earlier rows)
      const dedupMap = new Map<string, typeof rawEntries[number]>();
      for (const e of rawEntries) {
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
      const entries = Array.from(dedupMap.values());
      const duplicatesRemoved = rawEntries.length - entries.length;

      // Replace dataset for cleanliness
      await supabase.from("journal_metrics").delete().neq("id", "00000000-0000-0000-0000-000000000000");

      const batch = 500;
      for (let i = 0; i < entries.length; i += batch) {
        const { error } = await supabase.from("journal_metrics").insert(entries.slice(i, i + batch));
        if (error) {
          toast({ title: "Erro no lote", description: error.message, variant: "destructive" });
          return;
        }
      }
      toast({
        title: "Importação concluída",
        description: duplicatesRemoved > 0
          ? `${entries.length} registros importados (${duplicatesRemoved} duplicatas mescladas por ISSN+ano).`
          : `${entries.length} registros importados.`,
      });
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
                    if (f) handleCSV(f);
                    e.target.value = "";
                  }}
                />
                <Button variant="outline" size="sm" disabled={importing} asChild>
                  <span className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-1" />
                    {importing ? "Importando..." : "Importar CSV (Scopus)"}
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
            <p className="text-destructive">Atenção: a importação substitui todos os registros existentes.</p>
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
    </div>
  );
}
