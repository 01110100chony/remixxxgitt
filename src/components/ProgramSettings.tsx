import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Settings, Upload, X, Image } from "lucide-react";
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
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [name, setName] = useState(program.name);
  const [institution, setInstitution] = useState(program.institution);
  const [area, setArea] = useState((program as any).area || "");
  const [modality, setModality] = useState((program as any).modality || "");
  const [programCode, setProgramCode] = useState((program as any).program_code || "");
  const [logoUrl, setLogoUrl] = useState<string | null>((program as any).logo_url || null);

  useEffect(() => {
    setName(program.name);
    setInstitution(program.institution);
    setArea((program as any).area || "");
    setModality((program as any).modality || "");
    setProgramCode((program as any).program_code || "");
    setLogoUrl((program as any).logo_url || null);
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
        logo_url: logoUrl,
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "Formato inválido", description: "Selecione uma imagem (PNG, JPG, SVG).", variant: "destructive" });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O logotipo deve ter no máximo 2MB.", variant: "destructive" });
      return;
    }

    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${program.id}/logo.${ext}`;

      // Delete existing logo if any
      await supabase.storage.from("program-logos").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("program-logos")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("program-logos").getPublicUrl(path);
      const url = urlData.publicUrl + `?t=${Date.now()}`;

      // Save to program
      await supabase.from("programs").update({ logo_url: url } as any).eq("id", program.id);
      setLogoUrl(url);
      toast({ title: "Logotipo enviado!" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro ao enviar", description: err.message, variant: "destructive" });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    try {
      // Remove from storage
      const oldPath = logoUrl?.split("/program-logos/")[1]?.split("?")[0];
      if (oldPath) {
        await supabase.storage.from("program-logos").remove([oldPath]);
      }
      await supabase.from("programs").update({ logo_url: null } as any).eq("id", program.id);
      setLogoUrl(null);
      toast({ title: "Logotipo removido" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-5 space-y-4 max-w-lg">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-5 w-5 text-accent" /> Dados do programa
        </h3>
        <div className="space-y-3">
          {/* Logo upload */}
          <div>
            <Label className="flex items-center gap-1">
              <Image className="h-4 w-4" /> Logotipo da instituição
            </Label>
            <div className="mt-2 flex items-center gap-4">
              {logoUrl ? (
                <div className="relative">
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-16 w-16 object-contain rounded border bg-white p-1"
                  />
                  <button
                    onClick={handleRemoveLogo}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:opacity-80"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="h-16 w-16 rounded border border-dashed flex items-center justify-center text-muted-foreground">
                  <Image className="h-6 w-6" />
                </div>
              )}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1" />
                  )}
                  {uploadingLogo ? "Enviando..." : "Enviar logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG ou SVG. Máx 2MB.</p>
              </div>
            </div>
          </div>

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
