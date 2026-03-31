import { useCallback, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArticlesTable from "@/components/ArticlesTable";
import ArticlesSummary from "@/components/ArticlesSummary";
import ResearcherChart from "@/components/ResearcherChart";
import Dashboard from "@/components/Dashboard";
import { ResearcherInfo, parseLattesXML } from "@/lib/lattes-parser";
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
  const allArticles = researchersData.flatMap((r) => r.articles);
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
          </h1>
          {hasParsed && (
            <Button variant="ghost" size="sm" className="ml-auto text-muted-foreground" onClick={handleClear}>
              <Trash2 className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
        </div>
      </header>

      <main className="container py-10 space-y-8">
        <FileUpload onFilesLoad={handleFilesLoad} loadedFiles={loadedFiles} />

        {hasParsed && (
          <Tabs defaultValue="dashboard" className="space-y-6">
            <TabsList>
              <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
              <TabsTrigger value="quadrienio">Quadriênio</TabsTrigger>
              <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
              <TabsTrigger value="artigos">Artigos</TabsTrigger>
            </TabsList>

            <TabsContent value="dashboard">
              <Dashboard researchersData={researchersData} />
            </TabsContent>

            <TabsContent value="quadrienio">
              <ArticlesSummary articles={allArticles} researchers={researchers} />
            </TabsContent>

            <TabsContent value="comparativo">
              <ResearcherChart articles={allArticles} researchers={researchers} />
            </TabsContent>

            <TabsContent value="artigos">
              <ArticlesTable articles={allArticles} researchers={researchers} />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
};

export default Index;
