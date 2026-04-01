import { useCallback, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrograms, useProgramData } from "@/hooks/useProgram";
import { BookOpen, Trash2, LogOut, Plus, Upload, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgramDashboard from "@/components/ProgramDashboard";
import ArticlesTab from "@/components/ArticlesTab";
import OrientationsDbTab from "@/components/OrientationsDbTab";
import ProjectsDbTab from "@/components/ProjectsDbTab";
import TechnicalProductionsTab from "@/components/TechnicalProductionsTab";
import ReviewerTab from "@/components/ReviewerTab";
import ImpactTab from "@/components/ImpactTab";
import IdentifiersTab from "@/components/IdentifiersTab";
import FileUpload from "@/components/FileUpload";

const Index = () => {
  const { user, signOut, isCoordinatorOrAdmin } = useAuth();
  const { programs, loading: programsLoading, createProgram } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramInst, setNewProgramInst] = useState("");
  const qualisInputRef = useRef<HTMLInputElement>(null);

  const { data, loading, uploadLattes, importQualis, fetchCitations, updateMetrics, exportCSV } = useProgramData(selectedProgramId);

  const handleFilesLoad = useCallback(
    async (files: { name: string; content: string }[]) => {
      await uploadLattes(files);
    },
    [uploadLattes]
  );

  const handleCreateProgram = async () => {
    if (!newProgramName.trim() || !newProgramInst.trim()) return;
    const p = await createProgram(newProgramName.trim(), newProgramInst.trim());
    if (p) {
      setSelectedProgramId(p.id);
      setShowCreateProgram(false);
      setNewProgramName("");
      setNewProgramInst("");
    }
  };

  const handleQualisImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importQualis(text);
    e.target.value = "";
  };

  // Auto-select first program
  if (!selectedProgramId && programs.length > 0 && !programsLoading) {
    setSelectedProgramId(programs[0].id);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-4">
          <BookOpen className="h-7 w-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Lattes <span className="text-accent">Reader</span>
            <span className="text-xs font-normal text-muted-foreground ml-2">Painel PPG</span>
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-1" /> Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6 space-y-6">
        {/* Program selector */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProgramId || ""} onValueChange={setSelectedProgramId}>
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Selecione um programa" />
            </SelectTrigger>
            <SelectContent>
              {programs.map((p) => (
                <SelectItem key={p.id} value={p.id}>{p.name} — {p.institution}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isCoordinatorOrAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowCreateProgram(true)}>
              <Plus className="h-4 w-4 mr-1" /> Novo programa
            </Button>
          )}
        </div>

        {showCreateProgram && (
          <div className="rounded-lg border bg-card p-5 space-y-3 max-w-md">
            <h3 className="font-semibold text-foreground">Criar programa</h3>
            <div className="space-y-2">
              <div><Label>Nome do programa</Label><Input value={newProgramName} onChange={(e) => setNewProgramName(e.target.value)} /></div>
              <div><Label>Instituição</Label><Input value={newProgramInst} onChange={(e) => setNewProgramInst(e.target.value)} /></div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateProgram}>Criar</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowCreateProgram(false)}>Cancelar</Button>
            </div>
          </div>
        )}

        {selectedProgramId && (
          <>
            {/* Upload & Actions */}
            <div className="space-y-3">
              <FileUpload onFilesLoad={handleFilesLoad} loadedFiles={data?.researchers.map((r) => r.lattes_xml_filename || r.name) || []} />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => qualisInputRef.current?.click()}>
                  <Upload className="h-4 w-4 mr-1" /> Importar Qualis (CSV)
                </Button>
                <input ref={qualisInputRef} type="file" accept=".csv,.txt" className="hidden" onChange={handleQualisImport} />
                {data && data.articles.length > 0 && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("articles")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar artigos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("orientations")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar orientações
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("projects")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar projetos
                    </Button>
                  </>
                )}
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-muted-foreground">Carregando dados...</div>
            ) : data && data.researchers.length > 0 ? (
              <Tabs defaultValue="dashboard" className="space-y-6">
                <TabsList className="flex-wrap h-auto gap-1">
                  <TabsTrigger value="dashboard">Visão Geral</TabsTrigger>
                  <TabsTrigger value="articles">Artigos</TabsTrigger>
                  <TabsTrigger value="impact">Impacto</TabsTrigger>
                  <TabsTrigger value="orientations">Orientações</TabsTrigger>
                  <TabsTrigger value="projects">Projetos</TabsTrigger>
                  <TabsTrigger value="technical">Prod. Técnica</TabsTrigger>
                  <TabsTrigger value="reviewer">Parecerista</TabsTrigger>
                </TabsList>

                <TabsContent value="dashboard">
                  <ProgramDashboard data={data} />
                </TabsContent>
                <TabsContent value="articles">
                  <ArticlesTab articles={data.articles} researchers={data.researchers} />
                </TabsContent>
                <TabsContent value="impact">
                  <ImpactTab
                    articles={data.articles}
                    researchers={data.researchers}
                    metrics={data.metrics}
                    onFetchCitations={fetchCitations}
                    onUpdateMetrics={updateMetrics}
                  />
                </TabsContent>
                <TabsContent value="orientations">
                  <OrientationsDbTab orientations={data.orientations} researchers={data.researchers} />
                </TabsContent>
                <TabsContent value="projects">
                  <ProjectsDbTab projects={data.projects} researchers={data.researchers} />
                </TabsContent>
                <TabsContent value="technical">
                  <TechnicalProductionsTab productions={data.technicalProductions} researchers={data.researchers} />
                </TabsContent>
                <TabsContent value="reviewer">
                  <ReviewerTab activities={data.reviewerActivities} researchers={data.researchers} />
                </TabsContent>
              </Tabs>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-lg font-medium">Nenhum pesquisador cadastrado</p>
                <p className="text-sm">Faça upload de arquivos XML do Lattes para começar.</p>
              </div>
            )}
          </>
        )}

        {!selectedProgramId && !programsLoading && programs.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-xl font-medium mb-2">Bem-vindo ao Lattes Reader</p>
            <p className="text-sm mb-4">Crie um programa de pós-graduação para começar.</p>
            {isCoordinatorOrAdmin ? (
              <Button onClick={() => setShowCreateProgram(true)}>
                <Plus className="h-4 w-4 mr-1" /> Criar programa
              </Button>
            ) : (
              <p className="text-sm">Solicite acesso de coordenador ao administrador.</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
