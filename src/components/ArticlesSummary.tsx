import { useMemo } from "react";
import { Article } from "@/lib/lattes-parser";
import { FileText, CalendarDays, Users, Trophy, TrendingUp } from "lucide-react";

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

  const average = researchers.length > 0 ? (articles.length / researchers.length).toFixed(1) : "0";
  const maxYear = Math.max(...yearCounts.map(([, c]) => c), 1);
  const maxRes = Math.max(...perResearcher.map(([, c]) => c), 1);

  const getMedal = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}º`;
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-5 text-center">
          <FileText className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-foreground">{articles.length}</div>
          <div className="text-sm text-muted-foreground">Total de artigos</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <Users className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-foreground">{researchers.length}</div>
          <div className="text-sm text-muted-foreground">Pesquisadores</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <TrendingUp className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-foreground">{average}</div>
          <div className="text-sm text-muted-foreground">Média por docente</div>
        </div>
        <div className="rounded-lg border bg-card p-5 text-center">
          <Trophy className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-foreground truncate" title={perResearcher[0]?.[0]}>
            {perResearcher[0]?.[1] ?? 0}
          </div>
          <div className="text-sm text-muted-foreground truncate" title={perResearcher[0]?.[0]}>
            Maior produção
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Year chart */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" />
            Publicações por ano
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
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

        {/* Ranking */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            Ranking de produção
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {perResearcher.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-center shrink-0 text-lg leading-none">{getMedal(i)}</span>
                <span className="flex-1 truncate text-foreground" title={name}>{name}</span>
                <div className="w-24 h-5 rounded bg-muted/50 overflow-hidden shrink-0">
                  <div
                    className="h-full rounded bg-primary/70 transition-all"
                    style={{ width: `${(count / maxRes) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-bold text-foreground">{count}</span>
              </div>
            ))}
          </div>
          <div className="pt-2 border-t text-sm text-muted-foreground text-center">
            Média: <span className="font-semibold text-foreground">{average}</span> artigos por docente
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArticlesSummary;
