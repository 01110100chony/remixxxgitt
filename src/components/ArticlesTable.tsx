import { Article } from "@/lib/lattes-parser";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMemo, useState } from "react";
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

interface ArticlesTableProps {
  articles: Article[];
  researchers: string[];
}

type SortOrder = "desc" | "asc";

const ArticlesTable = ({ articles, researchers }: ArticlesTableProps) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const years = useMemo(() => {
    const set = new Set(articles.map((a) => a.year).filter((y) => y !== "—"));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [articles]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return articles
      .filter((a) => {
        if (yearFilter !== "all" && a.year !== yearFilter) return false;
        if (researcherFilter !== "all" && a.researcher !== researcherFilter) return false;
        if (q && !a.title.toLowerCase().includes(q) && !a.authors.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) =>
        sortOrder === "desc" ? b.year.localeCompare(a.year) : a.year.localeCompare(b.year)
      );
  }, [articles, search, yearFilter, sortOrder]);

  const toggleSort = () => setSortOrder((o) => (o === "desc" ? "asc" : "desc"));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold text-foreground">
          {filtered.length} de {articles.length} artigo{articles.length !== 1 ? "s" : ""}
        </h2>
        <div className="flex items-center gap-3">
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os anos</SelectItem>
              {years.map((y) => (
                <SelectItem key={y} value={y}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título ou autor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="w-16 font-semibold text-foreground">#</TableHead>
              <TableHead className="font-semibold text-foreground">Título</TableHead>
              <TableHead
                className="w-24 font-semibold text-foreground cursor-pointer select-none hover:text-accent transition-colors"
                onClick={toggleSort}
              >
                <span className="inline-flex items-center gap-1">
                  Ano
                  {sortOrder === "desc" ? (
                    <ArrowDown className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">Autores</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhum artigo encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((article, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground font-mono text-sm">
                    {i + 1}
                  </TableCell>
                  <TableCell className="font-medium">{article.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary/20 px-2 py-0.5 text-sm font-medium text-secondary-foreground">
                      {article.year}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-md">
                    {article.authors}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ArticlesTable;
