import { Upload, FileText, Search, CheckCircle2, XCircle, AlertTriangle, Loader2, ExternalLink } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadProps {
  onFilesLoad: (files: { name: string; content: string }[]) => void;
  loadedFiles: string[];
}

type FetchStatus = "idle" | "loading" | "success" | "error" | "needs_upload";

interface FetchResult {
  status: FetchStatus;
  message?: string;
  profileUrl?: string;
  hint?: string;
}

const FileUpload = ({ onFilesLoad, loadedFiles }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [lattesInput, setLattesInput] = useState("");
  const [fetchResult, setFetchResult] = useState<FetchResult>({ status: "idle" });
  const { toast } = useToast();

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const xmlFiles = Array.from(fileList).filter((f) => f.name.endsWith(".xml"));
      if (xmlFiles.length === 0) return;

      const results = await Promise.all(
        xmlFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const text = new TextDecoder("iso-8859-1").decode(buffer);
          return { name: file.name, content: text };
        })
      );
      onFilesLoad(results);
    },
    [onFilesLoad]
  );

  const extractLattesId = (input: string): string | null => {
    const trimmed = input.trim();
    // Direct numeric ID
    if (/^\d{10,16}$/.test(trimmed)) return trimmed;
    // URL like https://lattes.cnpq.br/1234567890123456
    const urlMatch = trimmed.match(/lattes\.cnpq\.br\/(\d{10,16})/);
    if (urlMatch) return urlMatch[1];
    // URL with idcnpq parameter
    const paramMatch = trimmed.match(/idcnpq=(\d{10,16})/);
    if (paramMatch) return paramMatch[1];
    return null;
  };

  const handleFetchLattes = async () => {
    const lattesId = extractLattesId(lattesInput);
    if (!lattesId) {
      setFetchResult({
        status: "error",
        message: "Informe um ID Lattes válido (16 dígitos) ou URL do perfil Lattes.",
      });
      return;
    }

    setFetchResult({ status: "loading" });

    try {
      const { data, error } = await supabase.functions.invoke("fetch-lattes", {
        body: { lattesId },
      });

      if (error) throw error;

      if (data.success && data.xml) {
        setFetchResult({
          status: "success",
          message: `Currículo obtido com sucesso: ${data.filename}`,
        });
        onFilesLoad([{ name: data.filename, content: data.xml }]);
        setLattesInput("");
        toast({
          title: "Currículo importado",
          description: `XML do Lattes ${lattesId} carregado automaticamente.`,
        });
      } else {
        setFetchResult({
          status: "needs_upload",
          message: data.error || "Não foi possível obter o currículo automaticamente.",
          profileUrl: data.profileUrl,
          hint: data.hint,
        });
      }
    } catch (err: any) {
      setFetchResult({
        status: "error",
        message: err.message || "Erro ao buscar currículo Lattes.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Lattes auto-fetch */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground text-sm">Importar currículo Lattes automaticamente</h3>
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="ID Lattes (ex: 1234567890123456) ou URL do perfil"
              value={lattesInput}
              onChange={(e) => {
                setLattesInput(e.target.value);
                if (fetchResult.status !== "idle") setFetchResult({ status: "idle" });
              }}
              onKeyDown={(e) => e.key === "Enter" && handleFetchLattes()}
            />
          </div>
          <Button
            size="sm"
            onClick={handleFetchLattes}
            disabled={!lattesInput.trim() || fetchResult.status === "loading"}
          >
            {fetchResult.status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Search className="h-4 w-4 mr-1" />
            )}
            Buscar
          </Button>
        </div>

        {/* Status feedback */}
        {fetchResult.status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Tentando obter currículo do CNPq...
          </div>
        )}
        {fetchResult.status === "success" && (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="h-4 w-4" />
            {fetchResult.message}
          </div>
        )}
        {fetchResult.status === "error" && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <XCircle className="h-4 w-4" />
            {fetchResult.message}
          </div>
        )}
        {fetchResult.status === "needs_upload" && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 p-3 space-y-2">
            <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{fetchResult.message}</p>
                {fetchResult.hint && <p className="mt-1 text-yellow-700 dark:text-yellow-300">{fetchResult.hint}</p>}
              </div>
            </div>
            {fetchResult.profileUrl && (
              <a
                href={fetchResult.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Abrir perfil Lattes
              </a>
            )}
            <p className="text-xs text-muted-foreground">
              Faça upload do arquivo XML abaixo ↓
            </p>
          </div>
        )}
      </div>

      {/* Manual upload */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/60"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-9 w-9 text-muted-foreground mb-3" />
        <p className="text-lg font-medium text-foreground">
          Arraste arquivos XML ou clique para selecionar
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Múltiplos currículos Lattes em formato XML
        </p>
      </div>

      {loadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loadedFiles.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-3 py-1.5 text-sm text-foreground"
            >
              <FileText className="h-3.5 w-3.5 text-accent" />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
