import { useState } from "react";
import { BookOpen } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import ArticlesTable from "@/components/ArticlesTable";
import ArticlesSummary from "@/components/ArticlesSummary";
import { Article, parseLattesXML } from "@/lib/lattes-parser";

const Index = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [parsed, setParsed] = useState(false);

  const handleFileLoad = (content: string) => {
    const result = parseLattesXML(content);
    setArticles(result);
    setParsed(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container flex items-center gap-3 py-5">
          <BookOpen className="h-7 w-7 text-accent" />
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            Lattes <span className="text-accent">Reader</span>
          </h1>
        </div>
      </header>

      <main className="container py-10 space-y-8">
        <FileUpload onFileLoad={handleFileLoad} />

        {parsed && <ArticlesTable articles={articles} />}
      </main>
    </div>
  );
};

export default Index;
