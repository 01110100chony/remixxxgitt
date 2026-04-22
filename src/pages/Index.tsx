import { useCallback, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePrograms, useProgramData } from "@/hooks/useProgram";
import { BookOpen, Trash2, LogOut, Plus, Upload, FileText, Download, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProgramDashboard from "@/components/ProgramDashboard";
import InstitutionalDashboard from "@/components/InstitutionalDashboard";
import EvaluationDashboard from "@/components/EvaluationDashboard";
import ArticlesTab from "@/components/ArticlesTab";
import OrientationsDbTab from "@/components/OrientationsDbTab";
import ProjectsDbTab from "@/components/ProjectsDbTab";
import TechnicalProductionsTab from "@/components/TechnicalProductionsTab";
import OtherProductionsTab from "@/components/OtherProductionsTab";
import JournalMetricsTab from "@/components/JournalMetricsTab";
import ReviewerTab from "@/components/ReviewerTab";
import ImpactTab from "@/components/ImpactTab";
import CitationsTab from "@/components/CitationsTab";
import IdentifiersTab from "@/components/IdentifiersTab";
import FileUpload from "@/components/FileUpload";
import CAPESReport from "@/components/CAPESReport";
import WebsiteTab from "@/components/WebsiteTab";
import ProgramSettings from "@/components/ProgramSettings";
import SocialMediaTab from "@/components/SocialMediaTab";
import AdminPanel from "@/components/AdminPanel";
import QualisImportDialog from "@/components/QualisImportDialog";
import PlanningManagement from "@/components/PlanningManagement";
import AccessRequestsPanel from "@/components/AccessRequestsPanel";

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut, isCoordinatorOrAdmin, roles } = useAuth();
  const { programs, loading: programsLoading, createProgram } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null);
  const [showCreateProgram, setShowCreateProgram] = useState(false);
  const [newProgramName, setNewProgramName] = useState("");
  const [newProgramInst, setNewProgramInst] = useState("");
  const [newProgramArea, setNewProgramArea] = useState("");
  const [newProgramModality, setNewProgramModality] = useState("");
  const [newProgramCode, setNewProgramCode] = useState("");
  const [qualisDialogOpen, setQualisDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data, loading, fetchAll, uploadLattes, importQualis, fetchCitations, fetchAllCitations, updateMetrics, exportCSV, clearMyData } = useProgramData(selectedProgramId);

  const handleFilesLoad = useCallback(
    async (files: { name: string; content: string }[]) => {
      await uploadLattes(files);
    },
    [uploadLattes]
  );

  const handleManualAdd = useCallback(
    async (researcher: { name: string; lattesId?: string; orcid?: string; formations?: string[]; areas?: string[] }) => {
      if (!selectedProgramId || !user) return;
      const { error } = await supabase.from("researchers").insert({
        name: researcher.name,
        lattes_id: researcher.lattesId || null,
        orcid: researcher.orcid || null,
        program_id: selectedProgramId,
        user_id: user.id,
        research_line: researcher.areas?.join(", ") || null,
      });
      if (error) {
        toast({ title: "Erro ao cadastrar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Pesquisador cadastrado", description: `${researcher.name} adicionado(a) ao programa.` });
        fetchAll();
      }
    },
    [selectedProgramId, user, fetchAll]
  );

  const handleCreateProgram = async () => {
    if (!newProgramName.trim() || !newProgramInst.trim()) return;
    const p = await createProgram(newProgramName.trim(), newProgramInst.trim(), {
      area: newProgramArea.trim() || undefined,
      modality: newProgramModality.trim() || undefined,
      program_code: newProgramCode.trim() || undefined,
    });
    if (p) {
      setSelectedProgramId(p.id);
      setShowCreateProgram(false);
      setNewProgramName("");
      setNewProgramInst("");
      setNewProgramArea("");
      setNewProgramModality("");
      setNewProgramCode("");
    }
  };

  const handleQualisImportEntries = async (entries: { issn: string; classification: string; area: string | null; journal?: string | null }[]) => {
    await importQualis(entries);
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
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate("/onboarding")}>
              <Plus className="h-4 w-4 mr-1" /> Solicitar acesso
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")}>
              <User className="h-4 w-4 mr-1" /> Perfil
            </Button>
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
              <div><Label>Área de avaliação</Label><Input value={newProgramArea} onChange={(e) => setNewProgramArea(e.target.value)} placeholder="Ex: Ciência da Computação" /></div>
              <div><Label>Modalidade</Label><Input value={newProgramModality} onChange={(e) => setNewProgramModality(e.target.value)} placeholder="Acadêmico ou Profissional" /></div>
              <div><Label>Código do programa</Label><Input value={newProgramCode} onChange={(e) => setNewProgramCode(e.target.value)} placeholder="Ex: 42001013049P5" /></div>
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
              <FileUpload 
                onFilesLoad={handleFilesLoad} 
                onManualAdd={handleManualAdd}
                loadedFiles={data?.researchers.map((r) => r.lattes_xml_filename || r.name) || []} 
                programId={selectedProgramId}
                researchers={data?.researchers.map((r) => ({ id: r.id, name: r.name, lattes_id: r.lattes_id, lattes_xml_filename: r.lattes_xml_filename, updated_at: r.updated_at }))}
              />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setQualisDialogOpen(true)}>
                  <Upload className="h-4 w-4 mr-1" /> Importar Qualis (CSV)
                </Button>
                <QualisImportDialog
                  open={qualisDialogOpen}
                  onOpenChange={setQualisDialogOpen}
                  articles={data?.articles || []}
                  onImport={handleQualisImportEntries}
                />
                {data && data.articles.length > 0 && (
                  <>
                    <CAPESReport data={data} />
                    <Button variant="outline" size="sm" onClick={() => exportCSV("articles")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar artigos
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("orientations")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar orientações
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => exportCSV("projects")}>
                      <Download className="h-4 w-4 mr-1" /> Exportar projetos
                    </Button>
                    <Button variant="destructive" size="sm" onClick={async () => {
                      if (window.confirm("Tem certeza que deseja limpar TODOS os seus dados? Esta ação não pode ser desfeita.")) {
                        await clearMyData();
                      }
                    }}>
                      <Trash2 className="h-4 w-4 mr-1" /> Limpar meus dados
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
                  <TabsTrigger value="institutional">Visão Institucional</TabsTrigger>
                  <TabsTrigger value="evaluation">Avaliação PPG</TabsTrigger>
                  <TabsTrigger value="articles">Artigos</TabsTrigger>
                  <TabsTrigger value="impact">Impacto</TabsTrigger>
                  <TabsTrigger value="orientations">Orientações</TabsTrigger>
                  <TabsTrigger value="projects">Projetos</TabsTrigger>
                  <TabsTrigger value="technical">Prod. Técnica</TabsTrigger>
                  <TabsTrigger value="other">Outras Produções</TabsTrigger>
                  <TabsTrigger value="reviewer">Parecerista</TabsTrigger>
                  <TabsTrigger value="citations">Citações</TabsTrigger>
                  <TabsTrigger value="identifiers">Identificadores</TabsTrigger>
                  <TabsTrigger value="journals">Métricas Periódicos</TabsTrigger>
                  <TabsTrigger value="website">Site</TabsTrigger>
                  <TabsTrigger value="social">Presença Digital</TabsTrigger>
                  <TabsTrigger value="planning">Planejamento</TabsTrigger>
                  {isCoordinatorOrAdmin && <TabsTrigger value="requests">Solicitações</TabsTrigger>}
                  <TabsTrigger value="settings">Configurações</TabsTrigger>
                  {roles.includes("admin") && <TabsTrigger value="admin">Administração</TabsTrigger>}
                </TabsList>

                <TabsContent value="dashboard">
                  <ProgramDashboard data={data} />
                </TabsContent>
                <TabsContent value="institutional">
                  <InstitutionalDashboard data={data} />
                </TabsContent>
                <TabsContent value="evaluation">
                  <EvaluationDashboard data={data} />
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
                    onFetchAllCitations={fetchAllCitations}
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
                <TabsContent value="other">
                  <OtherProductionsTab productions={data.otherProductions} researchers={data.researchers} programId={selectedProgramId!} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="reviewer">
                  <ReviewerTab activities={data.reviewerActivities} researchers={data.researchers} />
                </TabsContent>
                <TabsContent value="citations">
                  <CitationsTab
                    researchers={data.researchers}
                    citations={data.citationEntries}
                    onRefresh={fetchAll}
                  />
                </TabsContent>
                <TabsContent value="identifiers">
                  <IdentifiersTab researchers={data.researchers} programId={selectedProgramId!} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="website">
                  <WebsiteTab program={data.program} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="social">
                  <SocialMediaTab program={data.program} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="settings">
                  <ProgramSettings program={data.program} onRefresh={fetchAll} />
                </TabsContent>
                <TabsContent value="planning">
                  <PlanningManagement data={data} canEdit={isCoordinatorOrAdmin} />
                </TabsContent>
                {isCoordinatorOrAdmin && selectedProgramId && (
                  <TabsContent value="requests">
                    <AccessRequestsPanel programId={selectedProgramId} />
                  </TabsContent>
                )}
                {roles.includes("admin") && (
                  <TabsContent value="admin">
                    <AdminPanel />
                  </TabsContent>
                )}
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
