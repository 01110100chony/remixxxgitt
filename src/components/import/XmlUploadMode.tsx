import { decodeLattesXml } from "@/lib/decode-xml";
import { Upload, FileText, Search, CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink, Users } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

interface XmlUploadModeProps {
  onFilesLoad: (files: { name: string; content: string }[]) => void;
  loadedFiles: string[];
  programId?: string | null;
  researchers?: { id: string; name: string; lattes_id: string | null; lattes_xml_filename: string | null; updated_at: string }[];
}

type FetchStatus = "idle" | "loading" | "success" | "error" | "needs_upload";

interface FetchResult {
  status: FetchStatus;
  message?: string;
  profileUrl?: string;
  hint?: string;
}

interface BatchItemResult {
  id: string;
  status: "pending" | "loading" | "success" | "needs_upload" | "error";
  message?: string;
  profileUrl?: string;
}

const XmlUploadMode = ({ onFilesLoad, loadedFiles, programId, researchers: existingResearchers }: XmlUploadModeProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lattesInput, setLattesInput] = useState("");
  const [fetchResult, setFetchResult] = useState<FetchResult>({ status: "idle" });
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState("");
  const [batchResults, setBatchResults] = useState<BatchItemResult[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [existingMatch, setExistingMatch] = useState<{ name: string; updatedAt: string } | null>(null);
  const { toast } = useToast();

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const xmlFiles = Array.from(fileList).filter((f) => f.name.endsWith(".xml"));
      if (xmlFiles.length === 0) return;
      const results = await Promise.all(
        xmlFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const text = decodeLattesXml(buffer);
          return { name: file.name, content: text };
        })
      );
      onFilesLoad(results);
    },
    [onFilesLoad]
  );

  const extractLattesId = (input: string): string | null => {
    const trimmed = input.trim();
    if (/^\d{10,16}$/.test(trimmed)) return trimmed;
    const urlMatch = trimmed.match(/lattes\.cnpq\.br\/(\d{10,16})/);
    if (urlMatch) return urlMatch[1];
    const paramMatch = trimmed.match(/idcnpq=(\d{10,16})/);
    if (paramMatch) return paramMatch[1];
    return null;
  };

  const fetchSingleLattes = async (lattesId: string) => {
    const { data, error } = await supabase.functions.invoke("fetch-lattes", { body: { lattesId } });
    if (error) throw error;
    return data;
  };

  const checkExistingResearcher = (lattesId: string) => {
    if (!existingResearchers) return null;
    return existingResearchers.find((r) => r.lattes_id === lattesId);
  };

  const handleFetchLattes = async () => {
    const lattesId = extractLattesId(lattesInput);
    if (!lattesId) {
      setFetchResult({ status: "error", message: "Informe um ID Lattes válido (16 dígitos) ou URL do perfil Lattes." });
      setExistingMatch(null);
      return;
    }
    const existing = checkExistingResearcher(lattesId);
    if (existing) {
      const updatedDate = new Date(existing.updated_at).toLocaleDateString("pt-BR");
      setExistingMatch({ name: existing.name, updatedAt: updatedDate });
      setFetchResult({ status: "success", message: `"${existing.name}" já está cadastrado(a) (atualizado em ${updatedDate}). Para atualizar, faça upload de um novo XML.` });
      return;
    }
    setExistingMatch(null);
    setFetchResult({ status: "loading" });
    try {
      const data = await fetchSingleLattes(lattesId);
      if (data.success && data.xml) {
        setFetchResult({ status: "success", message: `Currículo obtido com sucesso: ${data.filename}` });
        onFilesLoad([{ name: data.filename!, content: data.xml }]);
        setLattesInput("");
        toast({ title: "Currículo importado", description: `XML do Lattes ${lattesId} carregado automaticamente.` });
      } else {
        setFetchResult({ status: "needs_upload", message: data.error || "Não foi possível obter o currículo automaticamente.", profileUrl: data.profileUrl, hint: data.hint });
      }
    } catch (err: any) {
      setFetchResult({ status: "error", message: err.message || "Erro ao buscar currículo Lattes." });
    }
  };

  const parseBatchIds = (text: string): string[] => {
    const parts = text.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const ids: string[] = [];
    for (const part of parts) {
      const id = extractLattesId(part);
      if (id && !ids.includes(id)) ids.push(id);
    }
    return ids;
  };

  const handleBatchFetch = async () => {
    const ids = parseBatchIds(batchInput);
    if (ids.length === 0) {
      toast({ title: "Nenhum ID válido", description: "Insira IDs Lattes válidos.", variant: "destructive" });
      return;
    }
    setBatchRunning(true);
    const initial: BatchItemResult[] = ids.map((id) => ({ id, status: "pending" }));
    setBatchResults(initial);
    const loaded: { name: string; content: string }[] = [];
    let successCount = 0;
    for (let i = 0; i < ids.length; i++) {
      setBatchResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "loading" } : r));
      try {
        const data = await fetchSingleLattes(ids[i]);
        if (data.success && data.xml) {
          loaded.push({ name: data.filename!, content: data.xml });
          successCount++;
          setBatchResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "success", message: data.filename } : r));
        } else {
          setBatchResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "needs_upload", message: data.error, profileUrl: data.profileUrl } : r));
        }
      } catch (err: any) {
        setBatchResults((prev) => prev.map((r, idx) => idx === i ? { ...r, status: "error", message: err.message } : r));
      }
    }
    if (loaded.length > 0) onFilesLoad(loaded);
    setBatchRunning(false);
    toast({ title: "Importação em lote concluída", description: `${successCount} de ${ids.length} currículos importados.` });
  };

  const batchProgress = batchResults.length > 0
    ? (batchResults.filter((r) => r.status !== "pending" && r.status !== "loading").length / batchResults.length) * 100
    : 0;

  return (
    <div className="space-y-4">
      {/* Lattes auto-fetch */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-accent" />
            <h3 className="font-semibold text-foreground text-sm">Importar currículo Lattes automaticamente</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { setBatchMode(!batchMode); setBatchResults([]); }}>
            <Users className="h-4 w-4 mr-1" />
            {batchMode ? "Individual" : "Lote"}
          </Button>
        </div>

        {!batchMode ? (
          <>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="ID Lattes (ex: 1234567890123456) ou URL do perfil"
                  value={lattesInput}
                  onChange={(e) => {
                    setLattesInput(e.target.value);
                    if (fetchResult.status !== "idle") { setFetchResult({ status: "idle" }); setExistingMatch(null); }
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleFetchLattes()}
                />
              </div>
              <Button size="sm" onClick={handleFetchLattes} disabled={!lattesInput.trim() || fetchResult.status === "loading"}>
                {fetchResult.status === "loading" ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Buscar
              </Button>
            </div>
            {fetchResult.status === "loading" && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Tentando obter currículo do CNPq...
              </div>
            )}
            {fetchResult.status === "success" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <CheckCircle2 className="h-4 w-4" /> {fetchResult.message}
                </div>
                {existingMatch && (
                  <div className="rounded-md bg-accent/10 border border-accent/20 p-3 text-sm space-y-1">
                    <p className="font-medium text-foreground">Pesquisador já cadastrado</p>
                    <p className="text-muted-foreground">Para atualizar os dados, exporte o XML do Lattes e faça upload abaixo.</p>
                  </div>
                )}
              </div>
            )}
            {fetchResult.status === "error" && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" /> {fetchResult.message}
              </div>
            )}
            {fetchResult.status === "needs_upload" && (
              <FallbackMessage message={fetchResult.message} hint={fetchResult.hint} profileUrl={fetchResult.profileUrl} />
            )}
          </>
        ) : (
          <>
            <Textarea
              placeholder={"Cole múltiplos IDs ou URLs do Lattes, um por linha ou separados por vírgula:\n1234567890123456\n9876543210987654"}
              value={batchInput}
              onChange={(e) => setBatchInput(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <div className="flex items-center gap-3">
              <Button size="sm" onClick={handleBatchFetch} disabled={!batchInput.trim() || batchRunning}>
                {batchRunning ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
                Buscar todos ({parseBatchIds(batchInput).length} IDs)
              </Button>
              {batchResults.length > 0 && !batchRunning && (
                <span className="text-sm text-muted-foreground">
                  {batchResults.filter((r) => r.status === "success").length} sucesso,{" "}
                  {batchResults.filter((r) => r.status === "needs_upload" || r.status === "error").length} falha
                </span>
              )}
            </div>
            {batchRunning && (
              <div className="space-y-1">
                <Progress value={batchProgress} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  Processando {batchResults.filter((r) => r.status !== "pending" && r.status !== "loading").length} de {batchResults.length}...
                </p>
              </div>
            )}
            {batchResults.length > 0 && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {batchResults.map((r) => (
                  <div key={r.id} className="flex items-center gap-2 text-sm">
                    {r.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
                    {r.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-accent" />}
                    {r.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />}
                    {r.status === "needs_upload" && <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />}
                    {r.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                    <span className="font-mono text-xs">{r.id}</span>
                    {r.message && <span className="text-xs text-muted-foreground truncate">— {r.message}</span>}
                    {r.status === "needs_upload" && r.profileUrl && (
                      <a href={r.profileUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline text-xs ml-auto shrink-0">
                        <ExternalLink className="h-3 w-3 inline mr-0.5" />Perfil
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Manual XML upload */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver ? "border-accent bg-accent/10" : "border-border hover:border-accent/60"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); }}
      >
        <input ref={inputRef} type="file" accept=".xml" multiple className="hidden" onChange={(e) => { if (e.target.files) processFiles(e.target.files); e.target.value = ""; }} />
        <Upload className="h-9 w-9 text-muted-foreground mb-3" />
        <p className="text-lg font-medium text-foreground">Arraste arquivos XML ou clique para selecionar</p>
        <p className="text-sm text-muted-foreground mt-1">Múltiplos currículos Lattes em formato XML</p>
      </div>
    </div>
  );
};

const FallbackMessage = ({ message, hint, profileUrl }: { message?: string; hint?: string; profileUrl?: string }) => (
  <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 space-y-2">
    <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
      <div>
        <p className="font-medium">{message}</p>
        {hint && <p className="mt-1 text-yellow-700 dark:text-yellow-300">{hint}</p>}
      </div>
    </div>
    {profileUrl && (
      <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
        <ExternalLink className="h-3.5 w-3.5" /> Abrir perfil Lattes
      </a>
    )}
    <p className="text-xs text-muted-foreground">Faça upload do arquivo XML acima ↑</p>
  </div>
);

export default XmlUploadMode;
