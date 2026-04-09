import { useState, useRef } from "react";
import { Upload, FileText, Loader2, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PdfUploadModeProps {
  programId?: string | null;
  onManualAdd?: (researcher: { name: string; lattesId?: string; orcid?: string; formations?: string[]; areas?: string[] }) => void;
}

type PdfStatus = "idle" | "uploading" | "parsing_frontend" | "parsing_backend" | "success" | "partial" | "error";

interface PdfResult {
  name: string;
  lattesId: string;
  orcid: string;
  formations: string[];
  areas: string[];
}

const PdfUploadMode = ({ programId, onManualAdd }: PdfUploadModeProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<PdfStatus>("idle");
  const [result, setResult] = useState<PdfResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [fileName, setFileName] = useState("");
  const { toast } = useToast();

  const extractTextFrontend = async (file: File): Promise<string> => {
    try {
      const pdfjsLib = await import("pdfjs-dist");
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
      
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch {
      return "";
    }
  };

  const parseTextLocally = (text: string): PdfResult | null => {
    if (text.trim().length < 30) return null;

    let name = "";
    const nameMatch = text.match(/(?:Nome|Curriculum Vitae|Endereço para acessar este CV)\s*[:\-]?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+(?:de|da|do|dos|das|e)?\s*[A-ZÀ-Ú]?[a-zà-ú]+){1,6})/i);
    if (nameMatch) name = nameMatch[1].trim();

    let lattesId = "";
    const lattesMatch = text.match(/lattes\.cnpq\.br\/(\d{10,16})/);
    if (lattesMatch) lattesId = lattesMatch[1];

    let orcid = "";
    const orcidMatch = text.match(/orcid[:\s]*(?:https?:\/\/orcid\.org\/)?([\d]{4}-[\d]{4}-[\d]{4}-[\d]{3,4}[X\d]?)/i);
    if (orcidMatch) orcid = orcidMatch[1];

    const formations: string[] = [];
    const formRegex = /(Doutorado|Mestrado|Graduação|Pós-Doutorado|Especialização)\s+em\s+([^.]+?)(?:\.|$)/gi;
    let fMatch;
    while ((fMatch = formRegex.exec(text)) !== null) {
      formations.push(`${fMatch[1]} em ${fMatch[2].trim()}`);
    }

    const areas: string[] = [];
    const areaRegex = /(?:Área|Grande Área)[:\s]+([^.;]+)/gi;
    let aMatch;
    while ((aMatch = areaRegex.exec(text)) !== null) {
      areas.push(aMatch[1].trim());
    }

    if (!name && !lattesId) return null;

    return {
      name: name || "Nome não identificado",
      lattesId,
      orcid,
      formations: formations.slice(0, 10),
      areas: areas.slice(0, 10),
    };
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith(".pdf")) {
      toast({ title: "Arquivo inválido", description: "Selecione um arquivo PDF.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setResult(null);
    setErrorMsg("");

    // Step 1: Try frontend extraction
    setStatus("parsing_frontend");
    const frontendText = await extractTextFrontend(file);
    const frontendResult = parseTextLocally(frontendText);

    if (frontendResult && frontendResult.name !== "Nome não identificado") {
      setResult(frontendResult);
      setStatus("success");
      toast({ title: "PDF processado", description: `Dados extraídos de ${file.name}` });
      return;
    }

    // Step 2: Fallback to backend
    setStatus("parsing_backend");
    try {
      const formData = new FormData();
      formData.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-lattes-pdf", {
        body: formData,
      });

      if (error) throw error;

      if (data?.success && data.data) {
        const backendResult = data.data as PdfResult;
        if (backendResult.name || backendResult.lattesId) {
          setResult(backendResult);
          setStatus(backendResult.name === "Nome não identificado" ? "partial" : "success");
          toast({ title: "PDF processado via servidor", description: `Dados extraídos de ${file.name}` });
          return;
        }
      }

      // Both failed
      setStatus("error");
      setErrorMsg(data?.error || "Não foi possível extrair dados do PDF. Recomendamos usar o formato XML.");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Erro ao processar PDF no servidor.");
    }
  };

  const handleConfirmAdd = () => {
    if (!result || !onManualAdd) return;
    onManualAdd({
      name: result.name,
      lattesId: result.lattesId || undefined,
      orcid: result.orcid || undefined,
      formations: result.formations,
      areas: result.areas,
    });
    toast({ title: "Pesquisador adicionado", description: `${result.name} foi cadastrado(a).` });
    setResult(null);
    setStatus("idle");
    setFileName("");
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 p-3 text-sm text-orange-800 dark:text-orange-200">
        <AlertTriangle className="h-4 w-4 inline mr-1.5" />
        <strong>Atenção:</strong> A extração de PDF é limitada e pode não capturar todos os dados. Para resultados completos, use o <strong>upload XML</strong>.
      </div>

      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20" : "border-border hover:border-orange-400/60"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden" onChange={(e) => { if (e.target.files?.[0]) handleFile(e.target.files[0]); e.target.value = ""; }} />
        <FileText className="h-9 w-9 text-muted-foreground mb-3" />
        <p className="text-lg font-medium text-foreground">Arraste um PDF do Lattes ou clique para selecionar</p>
        <p className="text-sm text-muted-foreground mt-1">Currículo exportado da Plataforma Lattes em PDF</p>
      </div>

      {/* Status messages */}
      {(status === "parsing_frontend" || status === "parsing_backend") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {status === "parsing_frontend" ? "Extraindo texto do PDF..." : "Processando no servidor (fallback)..."}
        </div>
      )}

      {status === "error" && (
        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive space-y-1">
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4" /> <strong>{errorMsg}</strong>
          </div>
          <p className="text-muted-foreground">Sugestão: exporte seu currículo em formato XML na <a href="https://lattes.cnpq.br" target="_blank" rel="noopener noreferrer" className="text-accent underline">Plataforma Lattes</a>.</p>
        </div>
      )}

      {/* Extracted data preview */}
      {result && (status === "success" || status === "partial") && (
        <div className="rounded-lg border bg-card p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <CheckCircle2 className={`h-4 w-4 ${status === "partial" ? "text-yellow-500" : "text-green-600 dark:text-green-400"}`} />
            <span className="font-medium text-foreground">
              {status === "partial" ? "Dados parcialmente extraídos" : "Dados extraídos com sucesso"}
            </span>
            <span className="text-muted-foreground">— {fileName}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">Nome:</span>
              <span className="ml-2 font-medium text-foreground">{result.name}</span>
            </div>
            {result.lattesId && (
              <div>
                <span className="text-muted-foreground">ID Lattes:</span>
                <span className="ml-2 font-mono text-foreground">{result.lattesId}</span>
              </div>
            )}
            {result.orcid && (
              <div>
                <span className="text-muted-foreground">ORCID:</span>
                <span className="ml-2 font-mono text-foreground">{result.orcid}</span>
              </div>
            )}
            {result.formations.length > 0 && (
              <div className="col-span-full">
                <span className="text-muted-foreground">Formação:</span>
                <ul className="ml-4 mt-1 list-disc text-foreground">
                  {result.formations.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            )}
            {result.areas.length > 0 && (
              <div className="col-span-full">
                <span className="text-muted-foreground">Áreas:</span>
                <span className="ml-2 text-foreground">{result.areas.join("; ")}</span>
              </div>
            )}
          </div>

          {onManualAdd && (
            <Button size="sm" onClick={handleConfirmAdd}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Adicionar pesquisador
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default PdfUploadMode;
