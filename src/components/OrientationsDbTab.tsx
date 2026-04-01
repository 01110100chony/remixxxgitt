import { useMemo, useState } from "react";
import type { OrientationRow, Researcher } from "@/hooks/useProgram";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, GraduationCap } from "lucide-react";

interface Props {
  orientations: OrientationRow[];
  researchers: Researcher[];
}

const OrientationsDbTab = ({ orientations, researchers }: Props) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [researcherFilter, setResearcherFilter] = useState("all");

  const types = useMemo(() => Array.from(new Set(orientations.map((o) => o.type))).sort(), [orientations]);
  const concluded = orientations.filter((o) => o.status === "concluded").length;
  const inProgress = orientations.filter((o) => o.status === "in_progress").length;

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orientations.filter((o) => {
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      if (typeFilter !== "all" && o.type !== typeFilter) return false;
      if (researcherFilter !== "all" && o.researcher_id !== researcherFilter) return false;
      if (q && !(o.title || "").toLowerCase().includes(q) && !(o.student || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orientations, search, statusFilter, typeFilter, researcherFilter]);

  const getResearcherName = (id: string) => researchers.find((r) => r.id === id)?.name || "—";

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="rounded-lg border bg-card p-4 text-center">
          <GraduationCap className="h-4 w-4 text-accent mx-auto mb-1" />
          <div className="text-2xl font-bold text-foreground">{orientations.length}</div>
          <div className="text-xs text-muted-foreground">Total</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{concluded}</div>
          <div className="text-xs text-muted-foreground">Concluídas</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">{inProgress}</div>
          <div className="text-xs text-muted-foreground">Em andamento</div>
        </div>
        <div className="rounded-lg border bg-card p-4 text-center">
          <div className="text-2xl font-bold text-foreground">
            {researchers.length > 0 ? (orientations.length / researchers.length).toFixed(1) : 0}
          </div>
          <div className="text-xs text-muted-foreground">Média / docente</div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="concluded">Concluídas</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os níveis</SelectItem>
            {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
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
              <TableHead className="w-28">Nível</TableHead>
              <TableHead className="w-24">Status</TableHead>
              <TableHead className="w-16">Ano</TableHead>
              <TableHead>Orientando</TableHead>
              <TableHead className="w-36">Orientador</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Nenhuma orientação encontrada.</TableCell></TableRow>
            ) : filtered.map((o, i) => (
              <TableRow key={o.id} className="hover:bg-muted/50">
                <TableCell className="text-muted-foreground font-mono text-sm">{i + 1}</TableCell>
                <TableCell className="font-medium text-sm">{o.title || "—"}</TableCell>
                <TableCell><span className="rounded-md bg-secondary/20 px-2 py-0.5 text-xs font-medium text-secondary-foreground">{o.type}</span></TableCell>
                <TableCell><span className={`rounded-md px-2 py-0.5 text-xs font-medium ${o.status === "concluded" ? "bg-green-500/20 text-green-700 dark:text-green-400" : "bg-amber-500/20 text-amber-700 dark:text-amber-400"}`}>
                  {o.status === "concluded" ? "Concluída" : "Em andamento"}
                </span></TableCell>
                <TableCell className="text-sm">{o.year || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{o.student || "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground truncate">{getResearcherName(o.researcher_id)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default OrientationsDbTab;
