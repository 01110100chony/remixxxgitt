import { useMemo, useState } from "react";
import { Production, PRODUCTION_TYPE_LABELS, PRODUCTION_CATEGORY_LABELS, ProductionType, ProductionCategory } from "@/lib/lattes-parser";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ArrowUp, ArrowDown } from "lucide-react";

interface ProductionTableProps {
  productions: Production[];
  researchers: string[];
}

type SortOrder = "desc" | "asc";

const ProductionTable = ({ productions, researchers }: ProductionTableProps) => {
  const [search, setSearch] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  const years = useMemo(() => {
    const set = new Set(productions.map((p) => p.year).filter((y) => y !== "—"));
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [productions]);

  const types = useMemo(() => {
    const set = new Set(productions.map((p) => p.type));
    return Array.from(set);
  }, [productions]);

  const categories = useMemo(() => {
    const set = new Set(productions.map((p) => p.category));
    return Array.from(set);
  }, [productions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return productions
      .filter((p) => {
        if (yearFilter !== "all" && p.year !== yearFilter) return false;
        if (researcherFilter !== "all" && p.researcher !== researcherFilter) return false;
        if (typeFilter !== "all" && p.type !== typeFilter) return false;
        if (categoryFilter !== "all" && p.category !== categoryFilter) return false;
        if (q && !p.title.toLowerCase().includes(q) && !p.authors.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => sortOrder === "desc" ? b.year.localeCompare(a.year) : a.year.localeCompare(b.year));
  }, [productions, search, yearFilter, researcherFilter, typeFilter, categoryFilter, sortOrder]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {filtered.length} de {productions.length} produção{productions.length !== 1 ? "ões" : ""}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map((c) => <SelectItem key={c} value={c}>{PRODUCTION_CATEGORY_LABELS[c] || c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{PRODUCTION_TYPE_LABELS[t] || t}</SelectItem>)}
            </SelectContent>
          </Select>
          {researchers.length > 1 && (
            <Select value={researcherFilter} onValueChange={setResearcherFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Pesquisador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {researchers.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
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
              <TableHead className="w-12 font-semibold text-foreground">#</TableHead>
              <TableHead className="font-semibold text-foreground">Título</TableHead>
              <TableHead className="w-36 font-semibold text-foreground">Tipo</TableHead>
              <TableHead className="w-20 font-semibold text-foreground cursor-pointer select-none hover:text-accent" onClick={() => setSortOrder((o) => o === "desc" ? "asc" : "desc")}>
                <span className="inline-flex items-center gap-1">
                  Ano {sortOrder === "desc" ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
                </span>
              </TableHead>
              <TableHead className="font-semibold text-foreground">Autores</TableHead>
              {researchers.length > 1 && <TableHead className="w-36 font-semibold text-foreground">Pesquisador</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={researchers.length > 1 ? 6 : 5} className="text-center text-muted-foreground py-8">
                  Nenhuma produção encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                  <TableCell className="font-medium text-sm">{p.title}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                      {PRODUCTION_TYPE_LABELS[p.type] || p.type}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-secondary/20 px-2 py-0.5 text-sm font-medium text-secondary-foreground">{p.year}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-xs truncate" title={p.authors}>{p.authors}</TableCell>
                  {researchers.length > 1 && <TableCell className="text-sm text-muted-foreground truncate" title={p.researcher}>{p.researcher}</TableCell>}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProductionTable;
