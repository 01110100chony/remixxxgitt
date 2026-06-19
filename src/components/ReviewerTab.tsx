import { useMemo, useState } from "react";
import type { ReviewerActivity, Researcher } from "@/hooks/useProgram";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, ClipboardCheck } from "lucide-react";
import { DataSourceBanner, OriginBadge, useSourceFilter, hasAnyProcessedXml } from "@/components/data-source";

interface Props {
  activities: ReviewerActivity[];
  researchers: Researcher[];
}

const ReviewerTab = ({ activities, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [researcherFilter, setResearcherFilter] = useState("all");

  const { visibleRows, showInactive, setShowInactive, breakdown } = useSourceFilter(activities);
  const hasAnyXml = hasAnyProcessedXml(researchers) || breakdown.lattes > 0;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visibleRows.filter((a) => {
      if (researcherFilter !== "all" && a.researcher_id !== researcherFilter) return false;
      if (q && !a.journal_event.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visibleRows, search, researcherFilter]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">{filtered.length} atuações como parecerista</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {researchers.length > 1 && (
            <Select value={researcherFilter} onValueChange={setResearcherFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Pesquisador" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {researchers.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
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
              <TableHead>Revista / Evento</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="w-16">Ano</TableHead>
              <TableHead className="w-40">Pesquisador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhuma atuação encontrada.</TableCell></TableRow>
            ) : filtered.map((a, i) => (
              <TableRow key={a.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{a.journal_event}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">{a.type || "—"}</span></TableCell>
                <TableCell className="text-sm">{a.year || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(a.researcher_id)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ReviewerTab;
