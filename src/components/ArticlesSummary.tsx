import { useMemo } from "react";
import { Article } from "@/lib/lattes-parser";
import { FileText, CalendarDays } from "lucide-react";

interface ArticlesSummaryProps {
  articles: Article[];
}

const ArticlesSummary = ({ articles }: ArticlesSummaryProps) => {
  const yearCounts = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => {
      const y = a.year || "—";
      map[y] = (map[y] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [articles]);

  const maxCount = Math.max(...yearCounts.map(([, c]) => c), 1);

  return (
    <div className="rounded-lg border bg-card p-6 space-y-5">
      <div className="flex items-center gap-3">
        <FileText className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-foreground">Resumo</h2>
        <span className="ml-auto text-2xl font-bold text-accent">{articles.length}</span>
        <span className="text-sm text-muted-foreground">artigo{articles.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
          <CalendarDays className="h-4 w-4" />
          Publicações por ano
        </div>
        <div className="space-y-1.5">
          {yearCounts.map(([year, count]) => (
            <div key={year} className="flex items-center gap-3 text-sm">
              <span className="w-12 font-mono text-foreground shrink-0">{year}</span>
              <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded bg-accent/80 transition-all"
                  style={{ width: `${(count / maxCount) * 100}%` }}
                />
              </div>
              <span className="w-8 text-right font-medium text-foreground">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ArticlesSummary;
