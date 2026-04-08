import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, GraduationCap, BookOpen, FlaskConical } from "lucide-react";
import type { ProgramData } from "@/hooks/useProgram";
import { isPGOrientation, isMestrado, isDoutorado } from "@/lib/orientation-utils";

interface Props {
  data: ProgramData;
  startYear: number;
  endYear: number;
}

export default function AcademicManagementSection({ data, startYear, endYear }: Props) {
  const stats = useMemo(() => {
    const { researchers, articles, orientations, projects } = data;
    const periodArticles = articles.filter((a) => a.year && a.year >= startYear && a.year <= endYear);
    const pgOrientations = orientations.filter(
      (o) => isPGOrientation(o.type) && o.year && o.year >= startYear && o.year <= endYear
    );
    const concluded = pgOrientations.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA");
    const inProgress = pgOrientations.filter((o) => o.status !== "concluded" && o.status !== "CONCLUIDA");
    const mestrados = concluded.filter((o) => isMestrado(o.type));
    const doutorados = concluded.filter((o) => isDoutorado(o.type));
    const periodProjects = projects.filter(
      (p) => (p.year_start && p.year_start >= startYear && p.year_start <= endYear) ||
             (p.year_end && p.year_end >= startYear && p.year_end <= endYear)
    );

    // Per-researcher breakdown
    const perResearcher = researchers.map((r) => {
      const rArticles = periodArticles.filter((a) => a.researcher_id === r.id);
      const rOrientations = pgOrientations.filter((o) => o.researcher_id === r.id);
      const rConcluded = rOrientations.filter((o) => o.status === "concluded" || o.status === "CONCLUIDA");
      const rInProgress = rOrientations.filter((o) => o.status !== "concluded" && o.status !== "CONCLUIDA");
      const rProjects = periodProjects.filter((p) => p.researcher_id === r.id);
      return {
        name: r.name,
        articles: rArticles.length,
        orientationsConcluded: rConcluded.length,
        orientationsInProgress: rInProgress.length,
        projects: rProjects.length,
        researchLine: r.research_line || "—",
      };
    });

    return {
      totalDocentes: researchers.length,
      totalArticles: periodArticles.length,
      totalMestrados: mestrados.length,
      totalDoutorados: doutorados.length,
      totalInProgress: inProgress.length,
      totalProjects: periodProjects.length,
      perResearcher,
    };
  }, [data, startYear, endYear]);

  const kpis = [
    { icon: Users, label: "Docentes", value: stats.totalDocentes, color: "text-blue-600" },
    { icon: BookOpen, label: "Artigos", value: stats.totalArticles, color: "text-green-600" },
    { icon: GraduationCap, label: "Titulados (M+D)", value: stats.totalMestrados + stats.totalDoutorados, color: "text-purple-600" },
    { icon: FlaskConical, label: "Projetos", value: stats.totalProjects, color: "text-orange-600" },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(({ icon: Icon, label, value, color }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <Icon className={`h-8 w-8 ${color}`} />
              <div>
                <p className="text-2xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Orientações Concluídas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Mestrado</span>
              <Badge variant="secondary">{stats.totalMestrados}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Doutorado</span>
              <Badge variant="secondary">{stats.totalDoutorados}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            <div className="flex justify-between">
              <span>Orientações ativas</span>
              <Badge>{stats.totalInProgress}</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Médias por Docente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Artigos/docente</span>
              <Badge variant="outline">
                {stats.totalDocentes > 0 ? (stats.totalArticles / stats.totalDocentes).toFixed(1) : "0"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span>Titulados/docente</span>
              <Badge variant="outline">
                {stats.totalDocentes > 0
                  ? ((stats.totalMestrados + stats.totalDoutorados) / stats.totalDocentes).toFixed(1)
                  : "0"}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-researcher table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Desempenho por Docente ({startYear}–{endYear})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Docente</TableHead>
                <TableHead>Linha de Pesquisa</TableHead>
                <TableHead className="text-center">Artigos</TableHead>
                <TableHead className="text-center">Orient. Concl.</TableHead>
                <TableHead className="text-center">Orient. Andamento</TableHead>
                <TableHead className="text-center">Projetos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.perResearcher.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum docente cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                stats.perResearcher.map((r) => (
                  <TableRow key={r.name}>
                    <TableCell className="font-medium">{r.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{r.researchLine}</TableCell>
                    <TableCell className="text-center">{r.articles}</TableCell>
                    <TableCell className="text-center">{r.orientationsConcluded}</TableCell>
                    <TableCell className="text-center">{r.orientationsInProgress}</TableCell>
                    <TableCell className="text-center">{r.projects}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
