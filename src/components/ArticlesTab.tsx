import { useMemo, useState } from "react";
import type { Article, Researcher, QualisRef } from "@/hooks/useProgram";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUp, ArrowDown } from "lucide-react";
import { DataSourceBanner, OriginBadge, useSourceFilter, resolveOrigin } from "@/components/data-source";

interface Props {
  articles: Article[];
  researchers: Researcher[];
}

const ArticlesTab = ({ articles, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");
  const [qualisFilter, setQualisFilter] = useState("all");
  const [originFilter, setOriginFilter] = useState<"all" | "lattes" | "manual" | "api">("all");
  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");

  const { visibleRows, showInactive, setShowInactive, breakdown } = useSourceFilter(articles);

  const hasAnyXml = breakdown.lattes > 0;

  const years = useMemo(() => {
    const set = new Set(visibleRows.map((a) => a.year).filter(Boolean));
    return Array.from(set).sort((a, b) => (b || 0) - (a || 0)).map(String);
  }, [visibleRows]);

  const qualisValues = useMemo(() => {
    const set = new Set(visibleRows.map((a) => a.qualis).filter(Boolean));
    return Array.from(set).sort() as string[];
  }, [visibleRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visibleRows
      .filter((a) => {
        if (yearFilter !== "all" && String(a.year) !== yearFilter) return false;
        if (researcherFilter !== "all" && a.researcher_id !== researcherFilter) return false;
        if (qualisFilter !== "all" && a.qualis !== qualisFilter) return false;
        if (originFilter !== "all" && resolveOrigin((a as any).source_origin) !== originFilter) return false;
        if (q && !a.title.toLowerCase().includes(q) && !(a.authors || "").toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => sortOrder === "desc" ? (b.year || 0) - (a.year || 0) : (a.year || 0) - (b.year || 0));
  }, [visibleRows, search, yearFilter, researcherFilter, qualisFilter, originFilter, sortOrder]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  const qualisColor = (q: string | null) => {
    if (!q) return "bg-muted text-muted-foreground";
    if (q.startsWith("A")) return "bg-green-500/20 text-green-700 dark:text-green-400";
    if (q.startsWith("B")) return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      <DataSourceBanner
        totalRows={articles.length}
        fromLattes={breakdown.lattes}
        fromManual={breakdown.manual}
        fromApi={breakdown.api}
        hasAnyXml={hasAnyXml}
        inactiveCount={breakdown.inactive}
        showInactive={showInactive}
        onToggleInactive={setShowInactive}
        entityLabel="artigos"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {filtered.length} de {visibleRows.length} artigo{visibleRows.length !== 1 ? "s" : ""}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {qualisValues.length > 0 && (
            <Select value={qualisFilter} onValueChange={setQualisFilter}>
              <SelectTrigger className="w-28"><SelectValue placeholder="Qualis" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Qualis</SelectItem>
                {qualisValues.map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          {researchers.length > 1 && (
            <Select value={researcherFilter} onValueChange={setResearcherFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Pesquisador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {researchers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-28"><SelectValue placeholder="Ano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {years.map((y) => <SelectItem key={y} value={y}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-28">Periódico</TableHead>
              <TableHead className="w-20 cursor-pointer hover:text-accent" onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}>
                <span className="inline-flex items-center gap-1">
                  Ano {sortOrder === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                </span>
              </TableHead>
              <TableHead className="w-16">Qualis</TableHead>
              <TableHead className="w-16">Cit.</TableHead>
              <TableHead className="w-16">DOI</TableHead>
              <TableHead className="w-20">Origem</TableHead>
              <TableHead>Autores</TableHead>
              {researchers.length > 1 && <TableHead className="w-36">Pesquisador</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={researchers.length > 1 ? 10 : 9} className="text-center text-muted-foreground py-8">Nenhum artigo encontrado.</TableCell></TableRow>
            ) : filtered.map((a, i) => (
              <TableRow key={a.id} className={`hover:bg-muted/50 ${a.is_active === false ? "opacity-50" : ""}`}>
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm max-w-xs" title={a.title}>{a.title}</TableCell>
                <TableCell className="text-xs text-muted-foreground truncate" title={a.journal || ""}>{a.journal || "—"}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-sm font-medium text-secondary-foreground">{a.year || "—"}</span></TableCell>
                <TableCell>{a.qualis ? <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${qualisColor(a.qualis)}`}>{a.qualis}</span> : "—"}</TableCell>
                <TableCell className="text-sm font-mono">{a.citations || 0}</TableCell>
                <TableCell>{a.doi ? <span className="text-xs text-accent">✓</span> : "—"}</TableCell>
                <TableCell><OriginBadge origin={(a as any).source_origin} /></TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-xs truncate" title={a.authors || ""}>{a.authors || "—"}</TableCell>
                {researchers.length > 1 && <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(a.researcher_id)}</TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ArticlesTab;
