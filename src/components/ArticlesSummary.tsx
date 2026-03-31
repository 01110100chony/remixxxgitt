import { useMemo } from "react";
import { Article } from "@/lib/lattes-parser";
import { FileText, CalendarDays, Users, Trophy, TrendingUp, Star } from "lucide-react";

interface ArticlesSummaryProps {
  articles: Article[];
  researchers: string[];
}

const QUADRIENIO_YEARS = 4;

function getQuadrienioRange(): [number, number] {
  const currentYear = new Date().getFullYear();
  return [currentYear - QUADRIENIO_YEARS + 1, currentYear];
}

const ArticlesSummary = ({ articles, researchers }: ArticlesSummaryProps) => {
  const [qStart, qEnd] = getQuadrienioRange();

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

  const quadrienioArticles = useMemo(
    () => articles.filter((a) => {
      const y = parseInt(a.year);
      return !isNaN(y) && y >= qStart && y <= qEnd;
    }),
    [articles, qStart, qEnd]
  );

  const quadrienioPerResearcher = useMemo(() => {
    const map: Record<string, number> = {};
    quadrienioArticles.forEach((a) => {
      map[a.researcher] = (map[a.researcher] || 0) + 1;
    });
    return Object.entries(map).sort(([, a], [, b]) => b - a);
  }, [quadrienioArticles]);

  const average = researchers.length > 0 ? (articles.length / researchers.length).toFixed(1) : "0";
  const qAverage = researchers.length > 0 ? (quadrienioArticles.length / researchers.length).toFixed(1) : "0";
  const qPercent = articles.length > 0 ? ((quadrienioArticles.length / articles.length) * 100).toFixed(0) : "0";
  const maxYear = Math.max(...yearCounts.map(([, c]) => c), 1);
  const maxRes = Math.max(...perResearcher.map(([, c]) => c), 1);
  const maxQRes = Math.max(...quadrienioPerResearcher.map(([, c]) => c), 1);

  const isQuadrienio = (year: string) => {
    const y = parseInt(year);
    return !isNaN(y) && y >= qStart && y <= qEnd;
  };

  const getMedal = (i: number) => {
    if (i === 0) return "🥇";
    if (i === 1) return "🥈";
    if (i === 2) return "🥉";
    return `${i + 1}º`;
  };

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
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
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 text-center">
          <Star className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-accent">{quadrienioArticles.length}</div>
          <div className="text-sm text-muted-foreground">Quadriênio {qStart}–{qEnd}</div>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 text-center">
          <TrendingUp className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-accent">{qPercent}%</div>
          <div className="text-sm text-muted-foreground">do total geral</div>
        </div>
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-5 text-center">
          <Users className="h-5 w-5 text-accent mx-auto mb-2" />
          <div className="text-3xl font-bold text-accent">{qAverage}</div>
          <div className="text-sm text-muted-foreground">Média quadriênio</div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Year chart with quadriênio highlight */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-accent" />
            Publicações por ano
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-accent/80" /> Quadriênio
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded bg-muted-foreground/30" /> Outros anos
            </span>
          </div>
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
            {yearCounts.map(([year, count]) => {
              const inQ = isQuadrienio(year);
              return (
                <div key={year} className={`flex items-center gap-3 text-sm ${inQ ? "font-semibold" : ""}`}>
                  <span className={`w-12 font-mono shrink-0 ${inQ ? "text-accent" : "text-foreground"}`}>{year}</span>
                  <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${inQ ? "bg-accent/80" : "bg-muted-foreground/30"}`}
                      style={{ width: `${(count / maxYear) * 100}%` }}
                    />
                  </div>
                  <span className={`w-8 text-right font-medium ${inQ ? "text-accent" : "text-foreground"}`}>{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking geral */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Trophy className="h-4 w-4 text-accent" />
            Ranking geral
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {perResearcher.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-3 text-sm">
                <span className="w-8 text-center shrink-0 text-lg leading-none">{getMedal(i)}</span>
                <span className="flex-1 truncate text-foreground" title={name}>{name}</span>
                <div className="w-24 h-5 rounded bg-muted/50 overflow-hidden shrink-0">
                  <div className="h-full rounded bg-primary/70 transition-all" style={{ width: `${(count / maxRes) * 100}%` }} />
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

      {/* Quadriênio ranking */}
      {quadrienioPerResearcher.length > 0 && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 p-6 space-y-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Star className="h-4 w-4 text-accent" />
            Ranking no quadriênio ({qStart}–{qEnd})
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {quadrienioPerResearcher.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3 text-sm">
                  <span className="w-8 text-center shrink-0 text-lg leading-none">{getMedal(i)}</span>
                  <span className="flex-1 truncate text-foreground" title={name}>{name}</span>
                  <div className="w-24 h-5 rounded bg-muted/50 overflow-hidden shrink-0">
                    <div className="h-full rounded bg-accent/70 transition-all" style={{ width: `${(count / maxQRes) * 100}%` }} />
                  </div>
                  <span className="w-8 text-right font-bold text-accent">{count}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-col items-center justify-center text-center space-y-2 py-4">
              <div className="text-5xl font-bold text-accent">{quadrienioArticles.length}</div>
              <div className="text-sm text-muted-foreground">artigos no quadriênio</div>
              <div className="text-lg font-semibold text-foreground">{qPercent}% <span className="text-sm font-normal text-muted-foreground">do total</span></div>
              <div className="text-sm text-muted-foreground">Média: <span className="font-semibold text-foreground">{qAverage}</span> por docente</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArticlesSummary;
