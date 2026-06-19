import { useMemo, useState } from "react";
import type { TechnicalProduction, Researcher } from "@/hooks/useProgram";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Wrench } from "lucide-react";
import { DataSourceBanner, OriginBadge, useSourceFilter, hasAnyProcessedXml } from "@/components/data-source";

interface Props {
  productions: TechnicalProduction[];
  researchers: Researcher[];
}

const TYPE_LABELS: Record<string, string> = {
  software: "Software",
  product: "Produto / Processo",
  technicalReport: "Relatório técnico",
  consultancy: "Consultoria",
  interview: "Entrevista",
  mediaParticipation: "Participação em mídia",
  eventOrganization: "Organização de evento",
};

const TechnicalProductionsTab = ({ productions, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");

  const { visibleRows, showInactive, setShowInactive, breakdown } = useSourceFilter(productions);
  const hasAnyXml = hasAnyProcessedXml(researchers) || breakdown.lattes > 0;

  const types = useMemo(() => Array.from(new Set(visibleRows.map((p) => p.type))).sort(), [visibleRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return visibleRows.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (researcherFilter !== "all" && p.researcher_id !== researcherFilter) return false;
      if (q && !(p.title || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [visibleRows, search, typeFilter, researcherFilter]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  return (
    <div className="space-y-4">
      <DataSourceBanner
        totalRows={productions.length}
        fromLattes={breakdown.lattes}
        fromManual={breakdown.manual}
        fromApi={breakdown.api}
        hasAnyXml={hasAnyXml}
        inactiveCount={breakdown.inactive}
        showInactive={showInactive}
        onToggleInactive={setShowInactive}
        entityLabel="produções técnicas"
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-semibold text-foreground">{filtered.length} produções técnicas</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {types.map((t) => <SelectItem key={t} value={t}>{TYPE_LABELS[t] || t}</SelectItem>)}
            </SelectContent>
          </Select>
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
              <TableHead>Título</TableHead>
              <TableHead className="w-36">Tipo</TableHead>
              <TableHead className="w-16">Ano</TableHead>
              <TableHead className="w-20">Origem</TableHead>
              <TableHead className="w-40">Pesquisador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma produção técnica encontrada.</TableCell></TableRow>
            ) : filtered.map((p, i) => (
              <TableRow key={p.id} className={`hover:bg-muted/50 ${p.is_active === false ? "opacity-50" : ""}`}>
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{p.title || "—"}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">{TYPE_LABELS[p.type] || p.type}</span></TableCell>
                <TableCell className="text-sm">{p.year || "—"}</TableCell>
                <TableCell><OriginBadge origin={(p as any).source_origin} /></TableCell>
                <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(p.researcher_id)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TechnicalProductionsTab;
