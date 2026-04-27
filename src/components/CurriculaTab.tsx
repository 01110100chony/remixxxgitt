import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileText, Upload, RefreshCw, Loader2, CheckCircle2, AlertTriangle, Download, History,
  FileCode2, PenLine, Info, ShieldCheck,
} from "lucide-react";
import { syncLattesXml, reprocessAllInProgram, type SyncResult } from "@/lib/lattes-sync";
import type { Researcher } from "@/hooks/useProgram";
import { ResearcherStatus } from "@/components/ResearcherStatus";

interface Props {
  researchers: Researcher[];
  programId: string;
  onRefresh: () => void;
}

interface ProcessingState {
  researcherId: string | null;
  global: boolean;
  current: number;
  total: number;
  currentName: string;
}

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
};

const CurriculaTab = ({ researchers, programId, onRefresh }: Props) => {
  const { user, isCoordinatorOrAdmin } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState<ProcessingState>({
    researcherId: null, global: false, current: 0, total: 0, currentName: "",
  });
  const [lastResults, setLastResults] = useState<SyncResult[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTargetId, setUploadTargetId] = useState<string | null>(null);

  const handleProcessExisting = async (r: Researcher & { lattes_xml_path?: string | null }) => {
    if (!r.lattes_xml_path) {
      // Trigger upload
      setUploadTargetId(r.id);
      fileInputRef.current?.click();
      return;
    }
    setProcessing({ researcherId: r.id, global: false, current: 1, total: 1, currentName: r.name });
    try {
      const { data: file, error } = await supabase.storage
        .from("lattes-xml")
        .download(r.lattes_xml_path);
      if (error || !file) throw new Error(error?.message || "XML não encontrado no storage");
      const xmlContent = await file.text();
      const result = await syncLattesXml({
        programId,
        userId: user?.id,
        xmlContent,
        xmlFilename: r.lattes_xml_filename || `${r.name}.xml`,
        uploadToStorage: false,
        existingResearcherId: r.id,
      });
      setLastResults([result]);
      toast({
        title: "Currículo processado",
        description: `${r.name}: ${result.articles.inserted + result.articles.updated} artigos, ${result.orientations.inserted + result.orientations.updated} orientações.`,
      });
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Falha no processamento", description: msg, variant: "destructive" });
    } finally {
      setProcessing({ researcherId: null, global: false, current: 0, total: 0, currentName: "" });
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !uploadTargetId) return;
    const targetId = uploadTargetId;
    setUploadTargetId(null);
    const target = researchers.find((r) => r.id === targetId);
    if (!target) return;

    setProcessing({ researcherId: targetId, global: false, current: 1, total: 1, currentName: target.name });
    try {
      const buffer = await file.arrayBuffer();
      const xmlContent = new TextDecoder("iso-8859-1").decode(buffer);
      const result = await syncLattesXml({
        programId,
        userId: user?.id,
        xmlContent,
        xmlFilename: file.name,
        uploadToStorage: true,
        existingResearcherId: targetId,
      });
      setLastResults([result]);
      toast({
        title: "XML enviado e processado",
        description: `${target.name}: ${result.articles.inserted + result.articles.updated} artigos sincronizados.`,
      });
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Falha no processamento", description: msg, variant: "destructive" });
    } finally {
      setProcessing({ researcherId: null, global: false, current: 0, total: 0, currentName: "" });
    }
  };

  const handleReprocessAll = async () => {
    const withXml = researchers.filter((r: any) => r.lattes_xml_path).length;
    if (withXml === 0) {
      toast({
        title: "Nenhum XML armazenado",
        description: "Envie pelo menos um XML para um docente antes de reprocessar.",
        variant: "destructive",
      });
      return;
    }
    if (!window.confirm(`Reprocessar ${withXml} currículo(s)? Itens existentes serão atualizados; itens não encontrados no XML serão marcados como inativos (não apagados).`)) return;

    setProcessing({ researcherId: null, global: true, current: 0, total: withXml, currentName: "" });
    try {
      const { processed, missingXml } = await reprocessAllInProgram({
        programId,
        userId: user?.id,
        onProgress: (current, total, name) =>
          setProcessing({ researcherId: null, global: true, current, total, currentName: name }),
      });
      setLastResults(processed);
      toast({
        title: "Reprocessamento concluído",
        description: `${processed.length} processado(s)${missingXml.length ? `, ${missingXml.length} sem XML` : ""}.`,
      });
      onRefresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido";
      toast({ title: "Falha", description: msg, variant: "destructive" });
    } finally {
      setProcessing({ researcherId: null, global: false, current: 0, total: 0, currentName: "" });
    }
  };

  const handleDownloadXml = async (r: Researcher & { lattes_xml_path?: string | null }) => {
    if (!r.lattes_xml_path) return;
    const { data, error } = await supabase.storage.from("lattes-xml").download(r.lattes_xml_path);
    if (error || !data) {
      toast({ title: "Erro ao baixar", description: error?.message || "Arquivo indisponível", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(data);
    const a = document.createElement("a");
    a.href = url;
    a.download = r.lattes_xml_filename || `${r.name}.xml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const withXmlCount = researchers.filter((r: any) => r.lattes_xml_path).length;
  const withoutXmlCount = researchers.length - withXmlCount;
  const isAnyProcessing = processing.researcherId !== null || processing.global;

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={handleFileSelected}
      />

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-accent" />
                Processamento de currículos Lattes
              </CardTitle>
              <CardDescription>
                Sincronização inteligente: atualiza registros existentes, insere novos e desativa o que sumiu do XML — sem apagar dados manuais (Qualis, citações, SNIP).
              </CardDescription>
            </div>
            {isCoordinatorOrAdmin && (
              <Button
                onClick={handleReprocessAll}
                disabled={isAnyProcessing || withXmlCount === 0}
                size="sm"
              >
                {processing.global ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Reprocessar todos os currículos ({withXmlCount})
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="rounded-lg border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Docentes</p>
              <p className="text-lg font-bold">{researchers.length}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Com XML salvo</p>
              <p className="text-lg font-bold text-primary">{withXmlCount}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Sem XML</p>
              <p className="text-lg font-bold text-destructive">{withoutXmlCount}</p>
            </div>
            <div className="rounded-lg border p-2">
              <p className="text-[10px] uppercase text-muted-foreground">Última sessão</p>
              <p className="text-lg font-bold">{lastResults.length}</p>
            </div>
          </div>

          {processing.global && processing.total > 0 && (
            <div className="space-y-1">
              <Progress value={(processing.current / processing.total) * 100} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Processando {processing.current}/{processing.total} — {processing.currentName}
              </p>
            </div>
          )}

          {withoutXmlCount > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>{withoutXmlCount} docente(s) sem currículo importado</AlertTitle>
              <AlertDescription className="text-xs space-y-1">
                <p>
                  Enquanto o XML não é enviado, as métricas (artigos, orientações, h-index) ficam <strong>zeradas</strong> para esse docente.
                </p>
                <p>
                  Você pode <strong>enviar o XML do Lattes</strong> (recomendado) ou <strong>cadastrar produções manualmente</strong> nas abas correspondentes (Artigos, Orientações etc.).
                </p>
              </AlertDescription>
            </Alert>
          )}

          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertTitle className="text-sm">Dados manuais são preservados</AlertTitle>
            <AlertDescription className="text-xs space-y-1">
              <p>
                Reprocessar o XML <strong>nunca sobrescreve</strong> registros que você inseriu ou editou manualmente
                (Qualis, citações, SNIP, DOI complementado).
              </p>
              <p className="flex flex-wrap gap-2 pt-1">
                <Badge variant="outline" className="text-[10px] gap-1 border-primary/40 text-primary">
                  <FileCode2 className="h-3 w-3" /> Lattes (automático)
                </Badge>
                <Badge variant="outline" className="text-[10px] gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
                  <PenLine className="h-3 w-3" /> Manual (editado por você)
                </Badge>
                <span className="text-muted-foreground self-center">— veja o selo de origem em cada produção.</span>
              </p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Docentes do programa</CardTitle>
        </CardHeader>
        <CardContent>
          {researchers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhum docente cadastrado ainda. Use a área de upload acima para adicionar.
            </p>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pesquisador(a)</TableHead>
                    <TableHead>Lattes ID</TableHead>
                    <TableHead>XML</TableHead>
                    <TableHead>Último processamento</TableHead>
                    {isCoordinatorOrAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {researchers.map((r: any) => {
                    const hasXml = !!r.lattes_xml_path;
                    const isThisProcessing = processing.researcherId === r.id;
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="font-mono text-xs">{r.lattes_id || "—"}</TableCell>
                        <TableCell>
                          <ResearcherStatus researcher={r} variant="badge" />
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.last_processed_at ? (
                            formatDate(r.last_processed_at)
                          ) : (
                            <span className="italic text-amber-600 dark:text-amber-400">
                              nunca — métricas estarão zeradas até o envio
                            </span>
                          )}
                        </TableCell>
                        {isCoordinatorOrAdmin && (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              {hasXml && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDownloadXml(r)}
                                  title="Baixar XML salvo"
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                variant={hasXml ? "outline" : "default"}
                                size="sm"
                                onClick={() => handleProcessExisting(r)}
                                disabled={isAnyProcessing}
                              >
                                {isThisProcessing ? (
                                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                                ) : hasXml ? (
                                  <RefreshCw className="h-3.5 w-3.5 mr-1" />
                                ) : (
                                  <Upload className="h-3.5 w-3.5 mr-1" />
                                )}
                                {hasXml ? "Processar" : "Enviar XML"}
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {lastResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <History className="h-4 w-4 text-accent" />
              Resumo do último processamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Docente</TableHead>
                    <TableHead className="text-right">Artigos (+/~/✕)</TableHead>
                    <TableHead className="text-right">Orientações</TableHead>
                    <TableHead className="text-right">Projetos</TableHead>
                    <TableHead className="text-right">Téc./Social</TableHead>
                    <TableHead className="text-right">Quadriênio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lastResults.map((r) => (
                    <TableRow key={r.researcherId}>
                      <TableCell className="font-medium">{r.researcherName}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <span className="text-primary">+{r.articles.inserted}</span>{" "}
                        <span className="text-muted-foreground">~{r.articles.updated}</span>{" "}
                        <span className="text-destructive">✕{r.articles.deactivated}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <span className="text-primary">+{r.orientations.inserted}</span>{" "}
                        <span className="text-muted-foreground">~{r.orientations.updated}</span>{" "}
                        <span className="text-destructive">✕{r.orientations.deactivated}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <span className="text-primary">+{r.projects.inserted}</span>{" "}
                        <span className="text-muted-foreground">~{r.projects.updated}</span>{" "}
                        <span className="text-destructive">✕{r.projects.deactivated}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <span className="text-primary">+{r.technicalProductions.inserted}</span>{" "}
                        <span className="text-muted-foreground">~{r.technicalProductions.updated}</span>{" "}
                        <span className="text-destructive">✕{r.technicalProductions.deactivated}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums font-semibold">
                        {r.metrics.quadrienioArticles}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Legenda: <span className="text-primary">+inseridos</span>{" "}
              <span className="text-muted-foreground">~atualizados</span>{" "}
              <span className="text-destructive">✕desativados</span> (não apagados; campos manuais como Qualis/citações são preservados).
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CurriculaTab;
