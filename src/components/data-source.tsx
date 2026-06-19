// ============================================================
// Helpers compartilhados para padronizar a relação entre
// dados do XML do Lattes e dados manuais/API em todas as abas.
// ============================================================

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { FileCode2, PenLine, Globe2, AlertTriangle, ShieldCheck, EyeOff, Info } from "lucide-react";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

export type SourceOrigin = "lattes" | "manual" | "api" | string | null | undefined;

/** Normaliza qualquer string em uma das três fontes canônicas. */
export const resolveOrigin = (raw: SourceOrigin): "lattes" | "manual" | "api" => {
  const s = (raw || "manual").toLowerCase();
  if (s === "lattes" || s === "xml") return "lattes";
  if (s === "api" || s === "openalex" || s === "crossref" || s === "qualis_ref" || s === "scopus" || s === "wos") return "api";
  return "manual";
};

/**
 * Verdade canônica para "este programa já teve algum XML processado".
 * Baseia-se no estado do docente (lattes_xml_path + last_processed_at),
 * não nas linhas da aba atual — assim uma aba vazia (ex.: parecerista
 * sem registros no XML) não engana o usuário com "Currículo não importado".
 */
export function hasAnyProcessedXml(
  researchers: Array<{ lattes_xml_path?: string | null; last_processed_at?: string | null }>,
): boolean {
  return researchers.some((r) => !!r.lattes_xml_path && !!r.last_processed_at);
}

const ORIGIN_META = {
  lattes: {
    label: "XML",
    full: "Importado automaticamente do XML do Lattes",
    icon: FileCode2,
    cls: "border-primary/40 text-primary",
  },
  manual: {
    label: "Manual",
    full: "Inserido ou editado manualmente — não é sobrescrito por reimportações",
    icon: PenLine,
    cls: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  },
  api: {
    label: "API",
    full: "Complementado por fonte externa (OpenAlex, Crossref, Qualis...)",
    icon: Globe2,
    cls: "border-sky-500/40 text-sky-600 dark:text-sky-400",
  },
} as const;

export function OriginBadge({ origin, compact = false }: { origin: SourceOrigin; compact?: boolean }) {
  const o = resolveOrigin(origin);
  const meta = ORIGIN_META[o];
  const Icon = meta.icon;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`text-[10px] gap-1 ${meta.cls}`}>
            <Icon className="h-3 w-3" />
            {!compact && meta.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="text-xs max-w-[240px]">{meta.full}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface DataSourceBannerProps {
  totalRows: number;
  fromLattes: number;
  fromManual: number;
  fromApi: number;
  hasAnyXml: boolean;
  inactiveCount?: number;
  showInactive?: boolean;
  onToggleInactive?: (v: boolean) => void;
  /** Texto curto sobre o que a aba mostra (ex: "artigos"). */
  entityLabel?: string;
}

/**
 * Banner padrão que aparece no topo de cada aba.
 * - Indica origem dominante dos dados do programa.
 * - Mostra alerta se nenhum XML foi importado.
 * - Permite alternar visibilidade de registros inativos.
 */
export function DataSourceBanner({
  totalRows,
  fromLattes,
  fromManual,
  fromApi,
  hasAnyXml,
  inactiveCount = 0,
  showInactive,
  onToggleInactive,
  entityLabel = "registros",
}: DataSourceBannerProps) {
  // Sem nenhum XML no programa
  if (!hasAnyXml && totalRows === 0) {
    return (
      <Alert className="border-amber-500/30 bg-amber-500/5">
        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertTitle className="text-sm">Currículo Lattes não importado</AlertTitle>
        <AlertDescription className="text-xs space-y-1">
          <p>
            Os {entityLabel} ficam zerados porque ainda não há XML processado para este programa.
          </p>
          <p>
            Vá até a aba <strong>Currículos Lattes</strong> para enviar o XML, ou cadastre {entityLabel} manualmente nesta tela.
          </p>
        </AlertDescription>
      </Alert>
    );
  }

  // Tem XML mas nada nesta aba
  if (totalRows === 0) {
    return (
      <Alert className="border-primary/20 bg-primary/5">
        <Info className="h-4 w-4 text-primary" />
        <AlertTitle className="text-sm">Sem {entityLabel} para o filtro atual</AlertTitle>
        <AlertDescription className="text-xs">
          O XML foi processado, mas não há {entityLabel} desta categoria. Você pode complementar manualmente.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="rounded-lg border bg-card p-3 flex flex-wrap items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <ShieldCheck className="h-4 w-4 text-primary" />
        <span className="font-medium text-foreground">
          {fromLattes > 0 && fromManual > 0
            ? "Dados automáticos + complementação manual"
            : fromLattes > 0
              ? "Dados sincronizados com Lattes"
              : "Dados inseridos manualmente"}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{totalRows} {entityLabel}</span>
        {fromLattes > 0 && (
          <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
            <FileCode2 className="h-3 w-3" /> {fromLattes} XML
          </Badge>
        )}
        {fromManual > 0 && (
          <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-600 dark:text-amber-400">
            <PenLine className="h-3 w-3" /> {fromManual} Manual
          </Badge>
        )}
        {fromApi > 0 && (
          <Badge variant="outline" className="gap-1 border-sky-500/40 text-sky-600 dark:text-sky-400">
            <Globe2 className="h-3 w-3" /> {fromApi} API
          </Badge>
        )}
      </div>

      {onToggleInactive && inactiveCount > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
          <Label htmlFor="show-inactive" className="text-xs cursor-pointer">
            Mostrar inativos ({inactiveCount})
          </Label>
          <Switch
            id="show-inactive"
            checked={!!showInactive}
            onCheckedChange={onToggleInactive}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Calcula breakdown de origem para um conjunto de linhas com `source_origin`.
 * Também filtra por `is_active` quando aplicável.
 */
export function useSourceFilter<T extends { is_active?: boolean | null; source_origin?: string | null }>(
  rows: T[],
  initialShowInactive = false,
) {
  const [showInactive, setShowInactive] = useState(initialShowInactive);

  const visibleRows = useMemo(
    () => (showInactive ? rows : rows.filter((r) => r.is_active !== false)),
    [rows, showInactive],
  );

  const breakdown = useMemo(() => {
    const b = { lattes: 0, manual: 0, api: 0, inactive: 0 };
    for (const r of rows) {
      if (r.is_active === false) b.inactive++;
      const o = resolveOrigin(r.source_origin);
      b[o]++;
    }
    return b;
  }, [rows]);

  return { visibleRows, showInactive, setShowInactive, breakdown };
}
