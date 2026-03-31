import { useCallback, useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArticlesTable from "@/components/ArticlesTable";
import ArticlesSummary from "@/components/ArticlesSummary";
import ResearcherChart from "@/components/ResearcherChart";
import { Article, parseLattesXML } from "@/lib/lattes-parser";
import { Button } from "@/components/ui/button";

interface ResearcherData {
  name: string;
  fileName: string;
  articles: Article[];
}

const Index = () => {
  const [researchersMap, setResearchersMap] = useState<Record<string, ResearcherData>>({});

  const handleFilesLoad = useCallback(
    (files: { name: string; content: string }[]) => {
      setResearchersMap((prev) => {
        const next = { ...prev };
        files.forEach(({ name, content }) => {
          const { researcher, articles } = parseLattesXML(content);
          next[name] = { name: researcher, fileName: name, articles };
        });
        return next;
      });
    },
    []
  );

  const handleClear = () => setResearchersMap({});

  const allArticles = Object.values(researchersMap).flatMap((r) => r.articles);
  const researchers = Object.values(researchersMap).map((r) => r.name);
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
          <>
            <ArticlesSummary articles={allArticles} researchers={researchers} />
            <ResearcherChart articles={allArticles} researchers={researchers} />
            <ArticlesTable articles={allArticles} researchers={researchers} />
          </>
        )}
      </main>
    </div>
  );
};

export default Index;
