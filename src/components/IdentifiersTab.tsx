import { useState, useMemo } from "react";
import type { Researcher } from "@/hooks/useProgram";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Fingerprint, Check, X, Pencil, Save, ExternalLink,
} from "lucide-react";

interface Props {
  researchers: Researcher[];
  onRefresh: () => void;
}

interface IdField {
  key: "lattes_id" | "orcid" | "scopus_id" | "researcher_id_wos";
  label: string;
  placeholder: string;
  validate: (v: string) => boolean;
  formatHint: string;
  linkFn?: (v: string) => string;
}

const ID_FIELDS: IdField[] = [
  {
    key: "lattes_id",
    label: "Lattes ID",
    placeholder: "Ex: 1234567890123456",
    validate: (v) => /^\d{10,16}$/.test(v.trim()),
    formatHint: "10–16 dígitos numéricos",
    linkFn: (v) => `http://lattes.cnpq.br/${v}`,
  },
  {
    key: "orcid",
    label: "ORCID",
    placeholder: "Ex: 0000-0002-1825-0097",
    validate: (v) => /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(v.trim()),
    formatHint: "Formato: 0000-0000-0000-000X",
    linkFn: (v) => `https://orcid.org/${v}`,
  },
  {
    key: "scopus_id",
    label: "Scopus ID",
    placeholder: "Ex: 57209876543",
    validate: (v) => /^\d{5,15}$/.test(v.trim()),
    formatHint: "5–15 dígitos numéricos",
    linkFn: (v) => `https://www.scopus.com/authid/detail.uri?authorId=${v}`,
  },
  {
    key: "researcher_id_wos",
    label: "ResearcherID (WoS)",
    placeholder: "Ex: AAA-0000-0000",
    validate: (v) => /^[A-Z]{1,3}-\d{4}-\d{4}$/.test(v.trim()),
    formatHint: "Formato: AAA-0000-0000",
    linkFn: (v) => `https://www.webofscience.com/wos/author/record/${v}`,
  },
];

const IdentifiersTab = ({ researchers, onRefresh }: Props) => {
  const { toast } = useToast();
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Completeness
  const completeness = useMemo(() => {
    if (researchers.length === 0) return { overall: 0, byField: {} as Record<string, number> };
    const byField: Record<string, number> = {};
    let totalFilled = 0;
    const totalPossible = researchers.length * ID_FIELDS.length;
    ID_FIELDS.forEach((f) => {
      const count = researchers.filter((r) => !!(r as any)[f.key]).length;
      byField[f.key] = Math.round((count / researchers.length) * 100);
      totalFilled += count;
    });
    return { overall: Math.round((totalFilled / totalPossible) * 100), byField };
  }, [researchers]);

  const startEdit = (r: Researcher) => {
    setEditingRow(r.id);
    const vals: Record<string, string> = {};
    ID_FIELDS.forEach((f) => { vals[f.key] = (r as any)[f.key] || ""; });
    setEditValues(vals);
  };

  const cancelEdit = () => { setEditingRow(null); setEditValues({}); };

  const saveEdit = async (researcherId: string) => {
    // Validate non-empty fields
    for (const f of ID_FIELDS) {
      const v = editValues[f.key]?.trim();
      if (v && !f.validate(v)) {
        toast({ title: "Formato inválido", description: `${f.label}: ${f.formatHint}`, variant: "destructive" });
        return;
      }
    }
    setSaving(true);
    const update: Record<string, string | null> = {};
    ID_FIELDS.forEach((f) => { update[f.key] = editValues[f.key]?.trim() || null; });
    const { error } = await supabase.from("researchers").update(update).eq("id", researcherId);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Identificadores salvos" });
      setEditingRow(null);
      onRefresh();
    }
  };

  return (
    <div className="space-y-6">
      {/* Completeness overview */}
      <div className="rounded-lg border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Fingerprint className="h-4 w-4 text-accent" />
          Completude dos Identificadores
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Geral</span>
            <span>{completeness.overall}%</span>
          </div>
          <Progress value={completeness.overall} className="h-2" />
        </div>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {ID_FIELDS.map((f) => (
            <div key={f.key} className="text-center">
              <div className="text-lg font-bold text-foreground">{completeness.byField[f.key] || 0}%</div>
              <div className="text-xs text-muted-foreground">{f.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Researchers table */}
      <div className="rounded-lg border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="text-left p-3 font-medium text-foreground">Pesquisador</th>
              {ID_FIELDS.map((f) => (
                <th key={f.key} className="text-left p-3 font-medium text-foreground">{f.label}</th>
              ))}
              <th className="p-3 w-24" />
            </tr>
          </thead>
          <tbody>
            {researchers.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/10">
                <td className="p-3 font-medium text-foreground whitespace-nowrap">{r.name}</td>
                {ID_FIELDS.map((f) => {
                  const val = (r as any)[f.key] as string | null;
                  if (editingRow === r.id) {
                    return (
                      <td key={f.key} className="p-2">
                        <Input
                          value={editValues[f.key] || ""}
                          onChange={(e) => setEditValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="h-8 text-xs"
                        />
                      </td>
                    );
                  }
                  return (
                    <td key={f.key} className="p-3">
                      {val ? (
                        <span className="inline-flex items-center gap-1">
                          <Check className="h-3 w-3 text-primary" />
                          <span className="text-foreground text-xs font-mono">{val}</span>
                          {f.linkFn && (
                            <a href={f.linkFn(val)} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent/80">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <X className="h-3 w-3" /> —
                        </span>
                      )}
                    </td>
                  );
                })}
                <td className="p-3 text-right">
                  {editingRow === r.id ? (
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={saving}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="sm" onClick={() => saveEdit(r.id)} disabled={saving}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => startEdit(r)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default IdentifiersTab;
