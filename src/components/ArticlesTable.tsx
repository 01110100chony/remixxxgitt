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
import { useState } from "react";
import { Search } from "lucide-react";

interface ArticlesTableProps {
  articles: Article[];
}

const ArticlesTable = ({ articles }: ArticlesTableProps) => {
  const [search, setSearch] = useState("");

  const filtered = articles.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.authors.toLowerCase().includes(search.toLowerCase()) ||
      a.year.includes(search)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold text-foreground">
          {articles.length} artigo{articles.length !== 1 ? "s" : ""} encontrado{articles.length !== 1 ? "s" : ""}
        </h2>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar título, autor ou ano..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="w-16 font-semibold text-foreground">#</TableHead>
              <TableHead className="font-semibold text-foreground">Título</TableHead>
              <TableHead className="w-20 font-semibold text-foreground">Ano</TableHead>
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
