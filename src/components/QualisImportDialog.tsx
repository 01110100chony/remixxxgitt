import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, CheckCircle2, XCircle, AlertTriangle, FileText } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Article {
  id: string;
  title: string;
  issn: string | null;
  journal: string | null;
  qualis: string | null;
}

interface QualisEntry {
  issn: string;
  journal: string;
  qualis: string;
  matchedArticles: Article[];
  matchType: "issn" | "title" | "none";
}

interface QualisImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articles: Article[];
  onImport: (entries: { issn: string; classification: string; area: string | null }[]) => Promise<void>;
}

const normalizeIssn = (issn: string): string =>
  issn.replace(/[^0-9X]/gi, "").toUpperCase();

const KNOWN_COLUMNS: Record<string, string[]> = {
  issn: ["issn", "issn do periódico", "issn do periodico", "issn_periodico"],
  journal: ["titulo", "título", "titulo do periódico", "titulo do periodico", "journal", "periodico", "periódico"],
  qualis: ["estrato", "classificação", "classificacao", "qualis", "class", "classificação qualis"],
};

function autoMapColumns(headers: string[]): { issn: number; journal: number; qualis: number } {
  const norm = headers.map((h) => h.toLowerCase().trim().replace(/['"]/g, ""));
  const map = { issn: -1, journal: -1, qualis: -1 };

  for (const [field, aliases] of Object.entries(KNOWN_COLUMNS)) {
    const idx = norm.findIndex((h) => aliases.includes(h));
    if (idx !== -1) map[field as keyof typeof map] = idx;
  }
  return map;
}

function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim())
    .map((line) => line.split(/[;\t,]/).map((c) => c.trim().replace(/^["']|["']$/g, "")));
}

const QualisImportDialog = ({ open, onOpenChange, articles, onImport }: QualisImportDialogProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing">("upload");
  const [rawRows, setRawRows] = useState<string[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [colMap, setColMap] = useState({ issn: -1, journal: -1, qualis: -1 });
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const rows = parseCsvRows(text);
      if (rows.length < 2) return;
      const hdrs = rows[0];
      setHeaders(hdrs);
      setRawRows(rows.slice(1));
      setFileName(file.name);
      const mapped = autoMapColumns(hdrs);
      setColMap(mapped);
      setStep("mapping");
    };
    reader.readAsText(file, "utf-8");
  };

  const parsedEntries = useMemo<QualisEntry[]>(() => {
    if (colMap.issn < 0 || colMap.qualis < 0) return [];

    const articleIssnMap = new Map<string, Article[]>();
    const articleTitleMap = new Map<string, Article>();
    articles.forEach((a) => {
      if (a.issn) {
        const n = normalizeIssn(a.issn);
        if (!articleIssnMap.has(n)) articleIssnMap.set(n, []);
        articleIssnMap.get(n)!.push(a);
      }
      if (a.title) articleTitleMap.set(a.title.toLowerCase().trim(), a);
    });

    return rawRows
      .filter((row) => row[colMap.issn] && row[colMap.qualis])
      .map((row) => {
        const rawIssn = row[colMap.issn];
        const issn = normalizeIssn(rawIssn);
        const journal = colMap.journal >= 0 ? row[colMap.journal] || "" : "";
        const qualis = row[colMap.qualis].toUpperCase().trim();

        const byIssn = articleIssnMap.get(issn) || [];
        let matchType: "issn" | "title" | "none" = byIssn.length > 0 ? "issn" : "none";
        let matched = [...byIssn];

        if (matched.length === 0 && journal) {
          const key = journal.toLowerCase().trim();
          const byTitle = articles.filter(
            (a) => a.journal && a.journal.toLowerCase().trim() === key
          );
          if (byTitle.length > 0) {
            matched = byTitle;
            matchType = "title";
          }
        }

        return { issn: rawIssn, journal, qualis, matchedArticles: matched, matchType };
      });
  }, [rawRows, colMap, articles]);

  const recognized = parsedEntries.filter((e) => e.matchType !== "none");
  const unrecognized = parsedEntries.filter((e) => e.matchType === "none");

  const handleImport = async () => {
    setStep("importing");
    setImporting(true);
    const entries = parsedEntries.map((e) => ({
      issn: normalizeIssn(e.issn),
      classification: e.qualis,
      area: null,
    }));
    // Deduplicate by issn
    const unique = Array.from(new Map(entries.map((e) => [e.issn, e])).values());
    await onImport(unique);
    setImporting(false);
    onOpenChange(false);
    resetState();
  };

  const resetState = () => {
    setStep("upload");
    setRawRows([]);
    setHeaders([]);
    setColMap({ issn: -1, journal: -1, qualis: -1 });
    setFileName("");
  };

  const allMapped = colMap.issn >= 0 && colMap.qualis >= 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Tabela Qualis</DialogTitle>
        </DialogHeader>

        {step === "upload" && (
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 cursor-pointer hover:border-accent/60 transition-colors"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          >
            <input ref={fileRef} type="file" accept=".csv,.txt,.tsv" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
            <Upload className="h-9 w-9 text-muted-foreground mb-3" />
            <p className="text-lg font-medium">Arraste o arquivo CSV ou clique para selecionar</p>
            <p className="text-sm text-muted-foreground mt-1">Formato esperado: ISSN, TÍTULO, ESTRATO (separados por ; ou ,)</p>
          </div>
        )}

        {step === "mapping" && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <FileText className="h-4 w-4" />
              <span>{fileName} — {rawRows.length} registros</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {(["issn", "journal", "qualis"] as const).map((field) => (
                <div key={field} className="space-y-1">
                  <label className="text-sm font-medium capitalize">
                    {field === "journal" ? "Título/Periódico" : field === "qualis" ? "Estrato/Qualis" : "ISSN"}
                    {field !== "journal" && <span className="text-destructive ml-0.5">*</span>}
                  </label>
                  <Select
                    value={colMap[field] >= 0 ? String(colMap[field]) : ""}
                    onValueChange={(v) => setColMap((prev) => ({ ...prev, [field]: parseInt(v) }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Selecionar coluna" /></SelectTrigger>
                    <SelectContent>
                      {headers.map((h, i) => (
                        <SelectItem key={i} value={String(i)}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>

            {rawRows.length > 0 && (
              <div className="rounded border overflow-auto max-h-32">
                <Table>
                  <TableHeader>
                    <TableRow>{headers.map((h, i) => <TableHead key={i} className="text-xs">{h}</TableHead>)}</TableRow>
                  </TableHeader>
                  <TableBody>
                    {rawRows.slice(0, 3).map((row, ri) => (
                      <TableRow key={ri}>{row.map((c, ci) => <TableCell key={ci} className="text-xs py-1">{c}</TableCell>)}</TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={resetState}>Voltar</Button>
              <Button onClick={() => setStep("preview")} disabled={!allMapped}>
                Pré-visualizar ({parsedEntries.length} registros)
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4">
            <div className="flex gap-3">
              <Badge variant="default" className="gap-1">
                <CheckCircle2 className="h-3 w-3" /> {recognized.length} reconhecidos
              </Badge>
              <Badge variant="secondary" className="gap-1">
                <AlertTriangle className="h-3 w-3" /> {unrecognized.length} sem match
              </Badge>
              <Badge variant="outline">{parsedEntries.length} total</Badge>
            </div>

            <Tabs defaultValue="recognized" className="w-full">
              <TabsList>
                <TabsTrigger value="recognized">Reconhecidos ({recognized.length})</TabsTrigger>
                <TabsTrigger value="unrecognized">Não reconhecidos ({unrecognized.length})</TabsTrigger>
              </TabsList>
              <TabsContent value="recognized" className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ISSN</TableHead>
                      <TableHead className="text-xs">Periódico</TableHead>
                      <TableHead className="text-xs">Qualis</TableHead>
                      <TableHead className="text-xs">Match</TableHead>
                      <TableHead className="text-xs">Artigos</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recognized.slice(0, 100).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono py-1">{e.issn}</TableCell>
                        <TableCell className="text-xs py-1 max-w-48 truncate">{e.journal}</TableCell>
                        <TableCell className="py-1"><Badge variant="outline" className="text-xs">{e.qualis}</Badge></TableCell>
                        <TableCell className="py-1">
                          <Badge variant={e.matchType === "issn" ? "default" : "secondary"} className="text-xs">
                            {e.matchType === "issn" ? "ISSN" : "Título"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs py-1">{e.matchedArticles.length}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
              <TabsContent value="unrecognized" className="max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">ISSN</TableHead>
                      <TableHead className="text-xs">Periódico</TableHead>
                      <TableHead className="text-xs">Qualis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unrecognized.slice(0, 100).map((e, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-xs font-mono py-1">{e.issn}</TableCell>
                        <TableCell className="text-xs py-1 max-w-48 truncate">{e.journal}</TableCell>
                        <TableCell className="py-1"><Badge variant="outline" className="text-xs">{e.qualis}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>
            </Tabs>

            <p className="text-xs text-muted-foreground">
              Todos os {parsedEntries.length} registros serão salvos na tabela Qualis. Os artigos reconhecidos terão seu Qualis atualizado automaticamente.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={handleImport}>
                Importar {parsedEntries.length} registros
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center gap-4 py-8">
            <Progress value={importing ? 50 : 100} className="w-64 h-2" />
            <p className="text-sm text-muted-foreground">Importando e classificando artigos...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default QualisImportDialog;
