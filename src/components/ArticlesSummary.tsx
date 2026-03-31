import { useMemo } from "react";
import { Article } from "@/lib/lattes-parser";
import { FileText, CalendarDays, Users } from "lucide-react";

interface ArticlesSummaryProps {
  articles: Article[];
  researchers: string[];
}

const ArticlesSummary = ({ articles, researchers }: ArticlesSummaryProps) => {
  const yearCounts = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => {
      const y = a.year || "—";
      map[y] = (map[y] || 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [articles]);

  const perResearcher = useMemo(() => {
    const map: Record<string, number> = {};
    articles.forEach((a) => {
      map[a.researcher] = (map[a.researcher] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [articles]);

  const maxYear = Math.max(...yearCounts.map(([, c]) => c), 1);
  const maxRes = Math.max(...perResearcher.map(([, c]) => c), 1);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Group totals */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <FileText className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Produção do Grupo</h2>
          <span className="ml-auto text-2xl font-bold text-accent">{articles.length}</span>
          <span className="text-sm text-muted-foreground">artigos</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-1">
            <CalendarDays className="h-4 w-4" />
            Por ano
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {yearCounts.map(([year, count]) => (
              <div key={year} className="flex items-center gap-3 text-sm">
                <span className="w-12 font-mono text-foreground shrink-0">{year}</span>
                <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                  <div
                    className="h-full rounded bg-accent/80 transition-all"
                    style={{ width: `${(count / maxYear) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium text-foreground">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Per researcher */}
      <div className="rounded-lg border bg-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <Users className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">Por Pesquisador</h2>
          <span className="ml-auto text-2xl font-bold text-accent">{researchers.length}</span>
          <span className="text-sm text-muted-foreground">pesquisador{researchers.length !== 1 ? "es" : ""}</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
          {perResearcher.map(([name, count]) => (
            <div key={name} className="flex items-center gap-3 text-sm">
              <span className="w-40 truncate text-foreground shrink-0" title={name}>{name}</span>
              <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                <div
                  className="h-full rounded bg-primary/70 transition-all"
                  style={{ width: `${(count / maxRes) * 100}%` }}
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
