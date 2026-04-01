import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { Program } from "@/hooks/useProgram";

interface ProgramSettingsProps {
  program: Program;
  onRefresh: () => void;
}

export default function ProgramSettings({ program, onRefresh }: ProgramSettingsProps) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(program.name);
  const [institution, setInstitution] = useState(program.institution);
  const [area, setArea] = useState((program as any).area || "");
  const [modality, setModality] = useState((program as any).modality || "");
  const [programCode, setProgramCode] = useState((program as any).program_code || "");

  useEffect(() => {
    setName(program.name);
    setInstitution(program.institution);
    setArea((program as any).area || "");
    setModality((program as any).modality || "");
    setProgramCode((program as any).program_code || "");
  }, [program]);

  const handleSave = async () => {
    if (!name.trim() || !institution.trim()) {
      toast({ title: "Erro", description: "Nome e instituição são obrigatórios.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("programs").update({
        name: name.trim(),
        institution: institution.trim(),
        area: area.trim() || null,
        modality: modality.trim() || null,
        program_code: programCode.trim() || null,
      } as any).eq("id", program.id);
      if (error) throw error;
      toast({ title: "Salvo!", description: "Dados do programa atualizados." });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 space-y-4 max-w-lg">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" /> Dados do programa
        </h3>
        <div className="space-y-3">
          <div>
            <Label>Nome do programa</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Instituição</Label>
            <Input value={institution} onChange={(e) => setInstitution(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Área de avaliação CAPES</Label>
            <Input value={area} onChange={(e) => setArea(e.target.value)} placeholder="Ex: Ciência da Computação" className="mt-1" />
          </div>
          <div>
            <Label>Modalidade</Label>
            <Input value={modality} onChange={(e) => setModality(e.target.value)} placeholder="Acadêmico ou Profissional" className="mt-1" />
          </div>
          <div>
            <Label>Código do programa (CAPES)</Label>
            <Input value={programCode} onChange={(e) => setProgramCode(e.target.value)} placeholder="Ex: 42001013049P5" className="mt-1" />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} size="sm">
          {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
          {saving ? "Salvando..." : "Salvar alterações"}
        </Button>
      </div>
    </div>
  );
}
