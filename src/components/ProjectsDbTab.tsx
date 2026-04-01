import { useMemo, useState } from "react";
import type { ProjectRow, Researcher } from "@/hooks/useProgram";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, FolderKanban, Landmark } from "lucide-react";

interface Props {
  projects: ProjectRow[];
  researchers: Researcher[];
}

const ProjectsDbTab = ({ projects, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [fundingFilter, setFundingFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");

  const funded = projects.filter((p) => p.funding === "Sim").length;
  const funders = useMemo(() => {
    const s = new Set<string>();
    projects.forEach((p) => { if (p.funder) p.funder.split("; ").forEach((f) => { if (f) s.add(f); }); });
    return Array.from(s).sort();
  }, [projects]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (fundingFilter === "funded" && p.funding !== "Sim") return false;
      if (fundingFilter === "unfunded" && p.funding !== "Não") return false;
      if (researcherFilter !== "all" && p.researcher_id !== researcherFilter) return false;
      if (q && !p.title.toLowerCase().includes(q) && !(p.partner_institution || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [projects, search, typeFilter, fundingFilter, researcherFilter]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <FolderKanban className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{projects.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{funded}</div>
          <div className="text-xs text-muted-foreground">Financiados</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <Landmark className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{funders.length}</div>
          <div className="text-xs text-muted-foreground">Agências</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {researchers.length > 0 ? (projects.length / researchers.length).toFixed(1) : 0}
          </div>
          <div className="text-xs text-muted-foreground">Média / docente</div>
        </div>
      </div>

      {funders.length > 0 && (
        <div className="rounded-lg border bg-card p-5 space-y-2">
          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Landmark className="h-4 w-4 text-accent" /> Agências de fomento
          </div>
          <div className="flex flex-wrap gap-2">
            {funders.map((f) => (
              <span key={f} className="rounded-md bg-accent/10 border border-accent/20 px-3 py-1 text-xs text-foreground">{f}</span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="research">Pesquisa</SelectItem>
            <SelectItem value="extension">Extensão</SelectItem>
          </SelectContent>
        </Select>
        <Select value={fundingFilter} onValueChange={setFundingFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="funded">Financiados</SelectItem>
            <SelectItem value="unfunded">Sem financiamento</SelectItem>
          </SelectContent>
        </Select>
        {researchers.length > 1 && (
          <Select value={researcherFilter} onValueChange={setResearcherFilter}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
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

      <div className="rounded-lg border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-primary/5">
              <TableHead className="w-12">#</TableHead>
              <TableHead>Título</TableHead>
              <TableHead className="w-24">Tipo</TableHead>
              <TableHead className="w-24">Período</TableHead>
              <TableHead>Instituição</TableHead>
              <TableHead className="w-20">Financ.</TableHead>
              <TableHead>Financiador</TableHead>
              <TableHead className="w-36">Pesquisador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhum projeto encontrado.</TableCell></TableRow>
            ) : filtered.map((p, i) => (
              <TableRow key={p.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{p.title}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">
                  {p.type === "research" ? "Pesquisa" : p.type === "extension" ? "Extensão" : "Outro"}
                </span></TableCell>
                <TableCell className="text-sm">{p.year_start || "—"}–{p.year_end || "atual"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{p.partner_institution || "—"}</TableCell>
                <TableCell><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${p.funding === "Sim" ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-muted text-muted-foreground"}`}>{p.funding || "Não"}</span></TableCell>
                <TableCell className="text-sm text-muted-foreground truncate max-w-xs">{p.funder || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(p.researcher_id)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProjectsDbTab;
