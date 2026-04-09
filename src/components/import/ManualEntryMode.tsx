import { useState } from "react";
import { CheckCircle2, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface ManualEntryModeProps {
  onManualAdd?: (researcher: { name: string; lattesId?: string; orcid?: string; formations?: string[]; areas?: string[] }) => void;
}

const ManualEntryMode = ({ onManualAdd }: ManualEntryModeProps) => {
  const [name, setName] = useState("");
  const [institution, setInstitution] = useState("");
  const [lattesId, setLattesId] = useState("");
  const [orcid, setOrcid] = useState("");
  const [formation, setFormation] = useState("");
  const [areas, setAreas] = useState("");
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Informe pelo menos o nome do pesquisador.", variant: "destructive" });
      return;
    }
    if (!onManualAdd) {
      toast({ title: "Funcionalidade indisponível", description: "Inserção manual não está habilitada.", variant: "destructive" });
      return;
    }

    onManualAdd({
      name: name.trim(),
      lattesId: lattesId.trim() || undefined,
      orcid: orcid.trim() || undefined,
      formations: formation.trim() ? [formation.trim()] : undefined,
      areas: areas.trim() ? areas.split(",").map((a) => a.trim()).filter(Boolean) : undefined,
    });

    toast({ title: "Pesquisador adicionado", description: `${name.trim()} foi cadastrado(a) manualmente.` });
    setName("");
    setInstitution("");
    setLattesId("");
    setOrcid("");
    setFormation("");
    setAreas("");
  };

  return (
    <div className="rounded-lg border bg-card p-5 space-y-4">
      <div className="flex items-center gap-2">
        <PenLine className="h-5 w-5 text-emerald-500" />
        <h3 className="font-semibold text-foreground text-sm">Cadastrar pesquisador manualmente</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="manual-name">Nome completo *</Label>
          <Input id="manual-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Maria da Silva" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-institution">Instituição</Label>
          <Input id="manual-institution" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex: USP, UNICAMP" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-lattes">ID Lattes</Label>
          <Input id="manual-lattes" value={lattesId} onChange={(e) => setLattesId(e.target.value)} placeholder="16 dígitos" className="font-mono" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="manual-orcid">ORCID</Label>
          <Input id="manual-orcid" value={orcid} onChange={(e) => setOrcid(e.target.value)} placeholder="0000-0000-0000-0000" className="font-mono" />
        </div>
        <div className="space-y-1.5 col-span-full">
          <Label htmlFor="manual-formation">Formação principal</Label>
          <Input id="manual-formation" value={formation} onChange={(e) => setFormation(e.target.value)} placeholder="Ex: Doutorado em Ciência da Computação" />
        </div>
        <div className="space-y-1.5 col-span-full">
          <Label htmlFor="manual-areas">Áreas de atuação</Label>
          <Input id="manual-areas" value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Separadas por vírgula: IA, Redes, Engenharia de Software" />
        </div>
      </div>

      <Button size="sm" onClick={handleSubmit} disabled={!name.trim()}>
        <CheckCircle2 className="h-4 w-4 mr-1" /> Cadastrar pesquisador
      </Button>
    </div>
  );
};

export default ManualEntryMode;
