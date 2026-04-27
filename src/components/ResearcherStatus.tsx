// ============================================================
// ResearcherStatusCard — componente compartilhado que mostra o
// estado do docente em relação ao XML do Lattes.
//
// Três estados:
//   1. "no-xml"         — Sem XML enviado
//   2. "xml-only"       — XML processado, sem complementação manual
//   3. "xml-plus-manual"— XML + dados manuais/API complementares
//
// Pode ser usado:
//   - Em formato compacto (badge inline) → variant="badge"
//   - Em formato de cartão com ações    → variant="card"
//   - Em formato de banner por aba      → variant="banner"
// ============================================================

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  FileX2,
  FileCheck2,
  Layers,
  Upload,
  RefreshCw,
  PenLine,
} from "lucide-react";
import type { Researcher } from "@/hooks/useProgram";
import { resolveOrigin } from "@/components/data-source";

/**
 * Estados possíveis do docente:
 *  - "no-xml":         sem XML e sem nenhuma linha manual/API → vazio total
 *  - "manual-only":    sem XML, mas com produções inseridas manualmente
 *  - "xml-only":       XML processado, todas as linhas vieram do XML
 *  - "xml-plus-manual": XML + linhas manuais/API complementares
 */
export type ResearcherXmlState = "no-xml" | "manual-only" | "xml-only" | "xml-plus-manual";

export interface ResearcherStatusInput {
  researcher: Pick<Researcher, "id" | "name" | "lattes_xml_path" | "last_processed_at">;
  /**
   * Linhas de uma ou mais abas (artigos, orientações, projetos, técnicas, parecerista...).
   * O estado é derivado da ORIGEM REAL (`source_origin`) das linhas pertencentes ao docente.
   */
  rows?: Array<{ researcher_id: string; source_origin?: string | null; is_active?: boolean | null }>;
}

export function getResearcherState({ researcher, rows = [] }: ResearcherStatusInput): ResearcherXmlState {
  const hasXml = !!researcher.lattes_xml_path;
  const own = rows.filter((r) => r.researcher_id === researcher.id && r.is_active !== false);

  let hasLattesRows = false;
  let hasComplementaryRows = false; // manual ou api
  for (const r of own) {
    const o = resolveOrigin(r.source_origin);
    if (o === "lattes") hasLattesRows = true;
    else hasComplementaryRows = true;
    if (hasLattesRows && hasComplementaryRows) break;
  }

  if (hasXml || hasLattesRows) {
    return hasComplementaryRows ? "xml-plus-manual" : "xml-only";
  }
  return hasComplementaryRows ? "manual-only" : "no-xml";
}

const STATE_META: Record<
  ResearcherXmlState,
  {
    label: string;
    title: string;
    description: string;
    icon: typeof FileX2;
    badgeCls: string;
    alertCls: string;
  }
> = {
  "no-xml": {
    label: "Sem XML",
    title: "Currículo Lattes não importado",
    description:
      "Os dados deste docente ficam zerados até que o XML do Lattes seja enviado. Você também pode cadastrar registros manualmente.",
    icon: FileX2,
    badgeCls: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    alertCls: "border-amber-500/30 bg-amber-500/5",
  },
  "xml-only": {
    label: "XML Lattes",
    title: "Dados sincronizados com o Lattes",
    description:
      "Todos os registros vieram do XML. Você pode complementar manualmente (DOI, SNIP, Qualis, citações) sem risco — edições manuais nunca são sobrescritas no reprocessamento.",
    icon: FileCheck2,
    badgeCls: "border-primary/40 text-primary bg-primary/10",
    alertCls: "border-primary/20 bg-primary/5",
  },
  "manual-only": {
    label: "Apenas Manual",
    title: "Sem XML — somente dados manuais",
    description:
      "Este docente ainda não teve o XML do Lattes importado, mas já há produções cadastradas manualmente. Envie o XML para sincronização completa.",
    icon: PenLine,
    badgeCls: "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10",
    alertCls: "border-amber-500/30 bg-amber-500/5",
  },
  "xml-plus-manual": {
    label: "XML + Manual",
    title: "Dados Lattes com complementação manual",
    description:
      "Há registros automáticos (XML) e edições/inserções manuais. As manuais são preservadas em todo reprocessamento.",
    icon: Layers,
    badgeCls: "border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10",
    alertCls: "border-sky-500/20 bg-sky-500/5",
  },
};

interface BaseProps extends ResearcherStatusInput {
  onUploadXml?: () => void;
  onReprocess?: () => void;
  onAddManual?: () => void;
}

interface VariantProps extends BaseProps {
  variant?: "badge" | "card" | "banner";
  className?: string;
}

export function ResearcherStatus({
  researcher,
  rows,
  onUploadXml,
  onReprocess,
  onAddManual,
  variant = "card",
  className = "",
}: VariantProps) {
  const state = getResearcherState({ researcher, rows });
  const meta = STATE_META[state];
  const Icon = meta.icon;

  if (variant === "badge") {
    return (
      <Badge variant="outline" className={`gap-1 ${meta.badgeCls} ${className}`}>
        <Icon className="h-3 w-3" />
        <span className="text-[10px]">{meta.label}</span>
      </Badge>
    );
  }

  if (variant === "banner") {
    return (
      <Alert className={`${meta.alertCls} ${className}`}>
        <Icon className="h-4 w-4" />
        <AlertTitle className="text-sm flex items-center gap-2">
          {meta.title}
          <Badge variant="outline" className={`text-[10px] ${meta.badgeCls}`}>{meta.label}</Badge>
        </AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <p>{meta.description}</p>
          {(onUploadXml || onReprocess || onAddManual) && (
            <div className="flex flex-wrap gap-2 pt-1">
              {state === "no-xml" && onUploadXml && (
                <Button size="sm" variant="default" onClick={onUploadXml} className="h-7 text-xs gap-1">
                  <Upload className="h-3 w-3" /> Enviar XML
                </Button>
              )}
              {state !== "no-xml" && onReprocess && (
                <Button size="sm" variant="outline" onClick={onReprocess} className="h-7 text-xs gap-1">
                  <RefreshCw className="h-3 w-3" /> Reprocessar
                </Button>
              )}
              {onAddManual && (
                <Button size="sm" variant="ghost" onClick={onAddManual} className="h-7 text-xs gap-1">
                  <PenLine className="h-3 w-3" /> Inserir manualmente
                </Button>
              )}
            </div>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  // card
  return (
    <div className={`rounded-lg border bg-card p-4 space-y-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{researcher.name}</span>
        </div>
        <Badge variant="outline" className={`gap-1 ${meta.badgeCls}`}>
          <span className="text-[10px]">{meta.label}</span>
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground">{meta.description}</p>
      {(onUploadXml || onReprocess || onAddManual) && (
        <div className="flex flex-wrap gap-2 pt-1">
          {state === "no-xml" && onUploadXml && (
            <Button size="sm" variant="default" onClick={onUploadXml} className="h-7 text-xs gap-1">
              <Upload className="h-3 w-3" /> Enviar XML
            </Button>
          )}
          {state !== "no-xml" && onReprocess && (
            <Button size="sm" variant="outline" onClick={onReprocess} className="h-7 text-xs gap-1">
              <RefreshCw className="h-3 w-3" /> Reprocessar
            </Button>
          )}
          {onAddManual && (
            <Button size="sm" variant="ghost" onClick={onAddManual} className="h-7 text-xs gap-1">
              <PenLine className="h-3 w-3" /> Inserir manual
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Banner agregado para uma aba: mostra resumo de quantos docentes estão
 * em cada estado e CTA para enviar XML quando necessário.
 */
export function ResearchersStatusSummary({
  researchers,
  rows = [],
  onGoToCurricula,
  className = "",
}: {
  researchers: Researcher[];
  rows?: Array<{ researcher_id: string; source_origin?: string | null; is_active?: boolean | null }>;
  onGoToCurricula?: () => void;
  className?: string;
}) {
  const counts = { "no-xml": 0, "xml-only": 0, "xml-plus-manual": 0 } as Record<ResearcherXmlState, number>;
  researchers.forEach((r) => { counts[getResearcherState({ researcher: r, rows })]++; });

  if (researchers.length === 0) return null;

  const noXml = counts["no-xml"];
  const xmlOnly = counts["xml-only"];
  const mixed = counts["xml-plus-manual"];

  if (noXml === researchers.length) {
    return (
      <Alert className={`border-amber-500/30 bg-amber-500/5 ${className}`}>
        <FileX2 className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-sm">Nenhum docente tem XML processado</AlertTitle>
        <AlertDescription className="text-xs space-y-2">
          <p>Envie o XML do Lattes na aba <strong>Currículos Lattes</strong> para análise completa, ou cadastre registros manualmente.</p>
          {onGoToCurricula && (
            <Button size="sm" variant="default" onClick={onGoToCurricula} className="h-7 text-xs gap-1">
              <Upload className="h-3 w-3" /> Ir para Currículos Lattes
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className={`rounded-lg border bg-card p-3 flex flex-wrap items-center gap-2 text-xs ${className}`}>
      <span className="font-medium text-foreground">Status dos docentes:</span>
      {xmlOnly > 0 && (
        <Badge variant="outline" className="gap-1 border-primary/40 text-primary bg-primary/10">
          <FileCheck2 className="h-3 w-3" /> {xmlOnly} XML
        </Badge>
      )}
      {mixed > 0 && (
        <Badge variant="outline" className="gap-1 border-sky-500/40 text-sky-600 dark:text-sky-400 bg-sky-500/10">
          <Layers className="h-3 w-3" /> {mixed} XML + Manual
        </Badge>
      )}
      {noXml > 0 && (
        <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10">
          <FileX2 className="h-3 w-3" /> {noXml} sem XML
        </Badge>
      )}
      {noXml > 0 && onGoToCurricula && (
        <Button size="sm" variant="ghost" onClick={onGoToCurricula} className="h-6 ml-auto text-xs gap-1">
          <Upload className="h-3 w-3" /> Enviar XML pendentes
        </Button>
      )}
    </div>
  );
}
