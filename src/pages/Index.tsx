import { useCallback, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import Dashboard from "@/components/Dashboard";
import ProductionTable from "@/components/ProductionTable";
import OrientationsTab from "@/components/OrientationsTab";
import ProjectsTab from "@/components/ProjectsTab";
import ResearcherChart from "@/components/ResearcherChart";
import { ResearcherInfo, parseLattesXML, aggregateData } from "@/lib/lattes-parser";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const [researchersMap, setResearchersMap] = useState<Record<string, ResearcherInfo & { fileName: string }>>({});

  const handleFilesLoad = useCallback(
    (files: { name: string; content: string }[]) => {
      setResearchersMap((prev) => {
        const next = { ...prev };
        files.forEach(({ name, content }) => {
          const info = parseLattesXML(content);
          next[name] = { ...info, fileName: name };
        });
        return next;
      });
    },
    []
  );

  const handleClear = () => setResearchersMap({});

  const researchersData = Object.values(researchersMap);
  const data = aggregateData(researchersData);
  const researchers = researchersData.map((r) => r.name);
  const loadedFiles = Object.keys(researchersMap);
  const hasParsed = loadedFiles.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-5">
          <BookOpen className="h-7 w-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Lattes <span className="text-accent">Reader</span>
            <span className="text-xs font-normal text-muted-foreground ml-2">Painel Sucupira</span>
          </h1>
          {hasParsed && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <FileUpload onFilesLoad={handleFilesLoad} loadedFiles={loadedFiles} />

        {hasParsed && (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList className="flex-wrap h-auto gap-1">
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="production">Produção</TabsTrigger>
              <TabsTrigger value="orientations">Orientações</TabsTrigger>
              <TabsTrigger value="projects">Projetos</TabsTrigger>
              <TabsTrigger value="comparative">Comparativo</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <Dashboard data={data} />
            </TabsContent>

            <TabsContent value="production">
              <ProductionTable productions={data.allProductions} researchers={researchers} />
            </TabsContent>

            <TabsContent value="orientations">
              <OrientationsTab orientations={data.allOrientations} researchers={researchers} />
            </TabsContent>

            <TabsContent value="projects">
              <ProjectsTab projects={data.allProjects} researchers={researchers} funders={data.funders} institutions={data.institutions} />
            </TabsContent>

            <TabsContent value="comparative">
              <ResearcherChart data={data} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
