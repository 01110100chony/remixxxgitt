import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Globe, Loader2, ExternalLink, Check, X, Edit2, Save, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { Program } from "@/hooks/useProgram";

interface WebsiteTabProps {
  program: Program;
  onRefresh: () => void;
}

export default function WebsiteTab({ program, onRefresh }: WebsiteTabProps) {
  const { toast } = useToast();
  const [url, setUrl] = useState((program as any).website_url || "");
  const [extracting, setExtracting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [description, setDescription] = useState((program as any).website_description || "");
  const [researchLines, setResearchLines] = useState((program as any).website_research_lines || "");
  const [languages, setLanguages] = useState((program as any).website_languages || "");
  const [hasEnglish, setHasEnglish] = useState((program as any).has_english_version || false);
  const [intScore, setIntScore] = useState((program as any).internationalization_score || 0);

  useEffect(() => {
    setUrl((program as any).website_url || "");
    setDescription((program as any).website_description || "");
    setResearchLines((program as any).website_research_lines || "");
    setLanguages((program as any).website_languages || "");
    setHasEnglish((program as any).has_english_version || false);
    setIntScore((program as any).internationalization_score || 0);
  }, [program]);

  const handleExtract = async () => {
    if (!url.trim()) {
      toast({ title: "Erro", description: "Informe a URL do site.", variant: "destructive" });
      return;
    }
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-website", {
        body: { url: url.trim() },
      });
      if (error) throw error;

      setDescription(data.description || "");
      setResearchLines(data.research_lines || "");
      setLanguages(data.languages || "");
      setHasEnglish(data.has_english_version || false);
      setIntScore(data.internationalization_score || 0);

      // Save to DB
      await supabase.from("programs").update({
        website_url: url.trim(),
        website_description: data.description || null,
        website_research_lines: data.research_lines || null,
        website_languages: data.languages || null,
        has_english_version: data.has_english_version || false,
        internationalization_score: data.internationalization_score || 0,
      } as any).eq("id", program.id);

      toast({ title: "Dados extraídos!", description: "Informações do site foram salvas." });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro na extração", description: err.message, variant: "destructive" });
    } finally {
      setExtracting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await supabase.from("programs").update({
        website_url: url.trim() || null,
        website_description: description || null,
        website_research_lines: researchLines || null,
        website_languages: languages || null,
        has_english_version: hasEnglish,
        internationalization_score: intScore,
      } as any).eq("id", program.id);

      toast({ title: "Salvo!", description: "Dados atualizados com sucesso." });
      setEditing(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const scoreColor = intScore >= 70 ? "text-green-600" : intScore >= 40 ? "text-yellow-600" : "text-red-500";
  const scoreLabel = intScore >= 70 ? "Alto" : intScore >= 40 ? "Médio" : "Baixo";

  return (
    <div className="space-y-6">
      {/* URL Input */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-5 w-5 text-accent" /> Site do programa
        </h3>
        <div className="flex gap-2">
          <Input
            placeholder="https://www.programa.edu.br"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1"
          />
          <Button onClick={handleExtract} disabled={extracting || !url.trim()}>
            {extracting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Globe className="h-4 w-4 mr-1" />}
            {extracting ? "Extraindo..." : "Extrair dados"}
          </Button>
          {url && (
            <Button variant="ghost" size="icon" asChild>
              <a href={url.startsWith("http") ? url : `https://${url}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Internationalization Score */}
      <div className="rounded-lg border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Languages className="h-5 w-5 text-accent" /> Internacionalização
          </h3>
          <div className="flex items-center gap-3">
            <Badge variant={hasEnglish ? "default" : "secondary"} className="gap-1">
              {hasEnglish ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
              {hasEnglish ? "Versão em inglês" : "Sem versão em inglês"}
            </Badge>
            <div className={`text-2xl font-bold ${scoreColor}`}>{intScore}</div>
            <span className={`text-sm ${scoreColor}`}>{scoreLabel}</span>
          </div>
        </div>

        <div className="w-full bg-muted rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${Math.min(intScore, 100)}%`,
              backgroundColor: intScore >= 70 ? "#16a34a" : intScore >= 40 ? "#ca8a04" : "#ef4444",
            }}
          />
        </div>

        {languages && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {languages.split(",").map((lang: string) => (
              <Badge key={lang.trim()} variant="outline" className="text-xs">
                {lang.trim()}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Extracted Data */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Dados extraídos</h3>
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

        <div className="space-y-3">
          <div>
            <Label className="text-muted-foreground text-xs">Descrição do programa</Label>
            {editing ? (
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-foreground mt-1">
                {description || <span className="text-muted-foreground italic">Nenhuma descrição extraída</span>}
              </p>
            )}
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Linhas de pesquisa (extraídas do site)</Label>
            {editing ? (
              <Textarea
                value={researchLines}
                onChange={(e) => setResearchLines(e.target.value)}
                rows={3}
                placeholder="Separadas por ponto e vírgula"
                className="mt-1"
              />
            ) : (
              <div className="mt-1">
                {researchLines ? (
                  <div className="flex flex-wrap gap-1.5">
                    {researchLines.split(";").map((line: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {line.trim()}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground italic">Nenhuma linha extraída</span>
                )}
              </div>
            )}
          </div>

          <div>
            <Label className="text-muted-foreground text-xs">Idiomas disponíveis</Label>
            {editing ? (
              <Input
                value={languages}
                onChange={(e) => setLanguages(e.target.value)}
                placeholder="Português, Inglês"
                className="mt-1"
              />
            ) : (
              <p className="text-sm text-foreground mt-1">
                {languages || <span className="text-muted-foreground italic">Não detectado</span>}
              </p>
            )}
          </div>

          {editing && (
            <>
              <div className="flex items-center gap-3">
                <Label className="text-muted-foreground text-xs">Versão em inglês</Label>
                <input
                  type="checkbox"
                  checked={hasEnglish}
                  onChange={(e) => setHasEnglish(e.target.checked)}
                  className="rounded"
                />
              </div>
              <div>
                <Label className="text-muted-foreground text-xs">Score de internacionalização (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={intScore}
                  onChange={(e) => setIntScore(parseInt(e.target.value) || 0)}
                  className="mt-1 w-24"
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
