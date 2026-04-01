import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Loader2, Edit2, ExternalLink, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Program } from "@/hooks/useProgram";

interface SocialMediaTabProps {
  program: Program;
  onRefresh: () => void;
}

const NETWORKS = [
  { key: "social_instagram", label: "Instagram", icon: "📷", baseUrl: "https://instagram.com/", placeholder: "@perfil ou URL completa", color: "#E4405F" },
  { key: "social_linkedin", label: "LinkedIn", icon: "💼", baseUrl: "https://linkedin.com/", placeholder: "URL do perfil ou página", color: "#0A66C2" },
  { key: "social_youtube", label: "YouTube", icon: "▶️", baseUrl: "https://youtube.com/", placeholder: "URL do canal", color: "#FF0000" },
  { key: "social_twitter", label: "Twitter/X", icon: "𝕏", baseUrl: "https://x.com/", placeholder: "@perfil ou URL completa", color: "#000000" },
  { key: "social_facebook", label: "Facebook", icon: "📘", baseUrl: "https://facebook.com/", placeholder: "URL da página", color: "#1877F2" },
] as const;

function normalizeUrl(value: string, baseUrl: string): string {
  if (!value) return "";
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  const handle = value.replace(/^@/, "");
  return `${baseUrl}${handle}`;
}

export default function SocialMediaTab({ program, onRefresh }: SocialMediaTabProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const v: Record<string, string> = {};
    NETWORKS.forEach((n) => { v[n.key] = (program as any)[n.key] || ""; });
    setValues(v);
  }, [program]);

  const activeCount = NETWORKS.filter((n) => values[n.key]?.trim()).length;
  const digitalScore = Math.round((activeCount / NETWORKS.length) * 100);
  const scoreColor = digitalScore >= 60 ? "text-green-600" : digitalScore >= 40 ? "text-yellow-600" : "text-red-500";
  const scoreLabel = digitalScore >= 60 ? "Boa" : digitalScore >= 40 ? "Moderada" : "Baixa";

  const handleSave = async () => {
    setSaving(true);
    try {
      const update: Record<string, string | null> = {};
      NETWORKS.forEach((n) => { update[n.key] = values[n.key]?.trim() || null; });
      const { error } = await supabase.from("programs").update(update as any).eq("id", program.id);
      if (error) throw error;
      toast({ title: "Salvo!", description: "Redes sociais atualizadas." });
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Presença Digital Score */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Share2 className="h-5 w-5 text-accent" /> Presença Digital
          </h3>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{activeCount} de {NETWORKS.length} redes ativas</Badge>
            <div className={`text-2xl font-bold ${scoreColor}`}>{digitalScore}%</div>
            <span className={`text-sm ${scoreColor}`}>{scoreLabel}</span>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${digitalScore}%`,
              backgroundColor: digitalScore >= 60 ? "#16a34a" : digitalScore >= 40 ? "#ca8a04" : "#ef4444",
            }}
          />
        </div>
      </div>

      {/* Networks */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Redes sociais</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editing ? handleSave() : setEditing(true)}
            disabled={saving}
          >
            {editing ? (
              saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />
            ) : (
              <Edit2 className="h-4 w-4 mr-1" />
            )}
            {editing ? (saving ? "Salvando..." : "Salvar") : "Editar"}
          </Button>
        </div>

        <div className="grid gap-3">
          {NETWORKS.map((net) => {
            const val = values[net.key] || "";
            const url = normalizeUrl(val, net.baseUrl);
            return (
              <div key={net.key} className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{net.icon}</span>
                <span className="text-sm font-medium w-24 text-foreground">{net.label}</span>
                {editing ? (
                  <Input
                    value={val}
                    onChange={(e) => setValues({ ...values, [net.key]: e.target.value })}
                    placeholder={net.placeholder}
                    className="flex-1"
                  />
                ) : val ? (
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-sm text-foreground truncate">{val}</span>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic flex-1">Não informado</span>
                )}
                {!editing && (
                  <Badge variant={val ? "default" : "secondary"} className="text-xs">
                    {val ? "Ativo" : "—"}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
