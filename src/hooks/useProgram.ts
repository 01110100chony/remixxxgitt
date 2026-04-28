import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
// parseLattesXML/ResearcherInfo agora ficam encapsulados em syncLattesXml
import { useToast } from "@/hooks/use-toast";
import { LATTES_SYNCED_EVENT, type LattesSyncedDetail, syncLattesXml, emitLattesSyncedEvent } from "@/lib/lattes-sync";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Program = Tables<"programs">;
export type Researcher = Tables<"researchers">;
export type Article = Tables<"articles">;
export type OrientationRow = Tables<"orientations">;
export type ProjectRow = Tables<"projects">;
export type TechnicalProduction = Tables<"technical_productions">;
export type ReviewerActivity = Tables<"reviewer_activities">;
export type ResearcherMetric = Tables<"researcher_metrics">;
export type QualisRef = Tables<"qualis_reference">;
export type OtherProduction = Tables<"other_productions">;

export interface CitationEntry {
  id: string;
  researcher_id: string;
  source: "wos" | "scopus" | "scholar" | "other";
  source_name: string | null;
  researcher_id_wos: string | null;
  total_citations: number | null;
  total_works: number | null;
  h_index: number | null;
  search_name: string | null;
  profile_link: string | null;
  reference_date: string | null;
  is_public: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface ProgramData {
  program: Program;
  researchers: Researcher[];
  articles: Article[];
  orientations: OrientationRow[];
  projects: ProjectRow[];
  technicalProductions: TechnicalProduction[];
  reviewerActivities: ReviewerActivity[];
  metrics: ResearcherMetric[];
  qualisRef: QualisRef[];
  citationEntries: CitationEntry[];
  otherProductions: OtherProduction[];
}

export function usePrograms() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchPrograms = useCallback(async () => {
    const { data, error } = await supabase.from("programs").select("*").order("name");
    if (!error && data) setPrograms(data);
    setLoading(false);
  }, []);

  useEffect(() => { if (user) fetchPrograms(); }, [user, fetchPrograms]);

  const createProgram = async (name: string, institution: string, extra?: { area?: string; modality?: string; program_code?: string }) => {
    const { data, error } = await supabase
      .from("programs")
      .insert({ name, institution, created_by: user?.id, user_id: user?.id, ...extra } as any)
      .select()
      .single();
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return null;
    }
    setPrograms((prev) => [...prev, data]);
    return data;
  };

  return { programs, loading, createProgram, refetch: fetchPrograms };
}

export function useProgramData(programId: string | null) {
  const [data, setData] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const fetchAll = useCallback(async () => {
    if (!programId) return;
    setLoading(true);
    const [
      { data: program },
      { data: researchers },
      { data: qualisRef },
    ] = await Promise.all([
      supabase.from("programs").select("*").eq("id", programId).single(),
      supabase.from("researchers").select("*").eq("program_id", programId),
      supabase.from("qualis_reference").select("*"),
    ]);

    if (!program || !researchers) { setLoading(false); return; }

    const researcherIds = researchers.map((r) => r.id);
    if (researcherIds.length === 0) {
      setData({
        program, researchers, articles: [], orientations: [], projects: [],
        technicalProductions: [], reviewerActivities: [], metrics: [], qualisRef: qualisRef || [],
        citationEntries: [], otherProductions: [],
      });
      setLoading(false);
      return;
    }

    const [
      { data: articles },
      { data: orientations },
      { data: projects },
      { data: technicalProductions },
      { data: reviewerActivities },
      { data: metrics },
      { data: citationEntries },
    ] = await Promise.all([
      supabase.from("articles").select("*").in("researcher_id", researcherIds),
      supabase.from("orientations").select("*").in("researcher_id", researcherIds),
      supabase.from("projects").select("*").in("researcher_id", researcherIds),
      supabase.from("technical_productions").select("*").in("researcher_id", researcherIds),
      supabase.from("reviewer_activities").select("*").in("researcher_id", researcherIds),
      supabase.from("researcher_metrics").select("*").in("researcher_id", researcherIds),
      supabase.from("citation_entries").select("*").in("researcher_id", researcherIds),
    ]);

    const { data: otherProductions } = await supabase
      .from("other_productions")
      .select("*")
      .in("researcher_id", researcherIds);

    setData({
      program,
      researchers,
      articles: articles || [],
      orientations: orientations || [],
      projects: projects || [],
      technicalProductions: technicalProductions || [],
      reviewerActivities: reviewerActivities || [],
      metrics: metrics || [],
      qualisRef: qualisRef || [],
      citationEntries: (citationEntries as CitationEntry[]) || [],
      otherProductions: otherProductions || [],
    });
    setLoading(false);
  }, [programId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Reage a eventos globais de sincronização do Lattes para
  // invalidar o cache em todas as abas automaticamente.
  useEffect(() => {
    if (!programId) return;
    const handler = (ev: Event) => {
      const detail = (ev as CustomEvent<LattesSyncedDetail>).detail;
      if (!detail || detail.programId !== programId) return;
      fetchAll();
      const total = detail.results.length;
      if (total > 1) {
        toast({
          title: "Dados atualizados em todas as abas",
          description: `${total} currículo(s) sincronizados.`,
        });
      } else if (total === 1) {
        toast({
          title: "Dados atualizados em todas as abas",
          description: detail.results[0].researcherName,
        });
      }
    };
    window.addEventListener(LATTES_SYNCED_EVENT, handler);
    return () => window.removeEventListener(LATTES_SYNCED_EVENT, handler);
  }, [programId, fetchAll, toast]);

  const uploadLattes = async (files: { name: string; content: string }[]) => {
    if (!programId) return;

    let success = 0;
    const results = [];
    for (const file of files) {
      try {
        const result = await syncLattesXml({
          programId,
          userId: user?.id,
          xmlContent: file.content,
          xmlFilename: file.name,
          uploadToStorage: true, // salva no bucket lattes-xml e grava lattes_xml_path
        });
        results.push(result);
        success++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro desconhecido";
        console.error(`[useProgram.uploadLattes] Falha em ${file.name}:`, err);
        toast({
          title: `Falha ao processar ${file.name}`,
          description: msg,
          variant: "destructive",
        });
      }
    }

    if (success > 0) {
      toast({
        title: "Upload concluído",
        description: `${success} de ${files.length} arquivo(s) processado(s). Dados manuais preservados.`,
      });
      // Dispara evento global de sincronização para invalidar caches em todas as abas
      emitLattesSyncedEvent({ programId, results });
    }
    await fetchAll();
  };

  const importQualis = async (entries: { issn: string; classification: string; area: string | null; journal?: string | null }[]) => {
    if (entries.length === 0) return;
    // Delete existing and insert new
    await supabase.from("qualis_reference").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    const batchSize = 500;
    for (let i = 0; i < entries.length; i += batchSize) {
      await supabase.from("qualis_reference").insert(
        entries.slice(i, i + batchSize).map(e => ({
          issn: e.issn,
          classification: e.classification,
          area: e.area,
          journal: e.journal || null,
        }))
      );
    }
    toast({ title: "Qualis importado", description: `${entries.length} registros importados.` });
    // Auto-classify articles
    await classifyArticles();
    await fetchAll();
  };

  const classifyArticles = async () => {
    if (!data) return;
    const { data: qualisData } = await supabase.from("qualis_reference").select("*");
    if (!qualisData || qualisData.length === 0) return;
    const qualisMap = new Map<string, string>();
    qualisData.forEach((q) => {
      const normalizedIssn = q.issn.replace(/[^0-9X]/gi, "").toUpperCase();
      qualisMap.set(normalizedIssn, q.classification);
    });

    const { data: articles } = await supabase.from("articles").select("id, issn")
      .in("researcher_id", data.researchers.map((r) => r.id));
    if (!articles) return;

    for (const article of articles) {
      if (!article.issn) continue;
      const normalized = article.issn.replace(/[^0-9X]/gi, "").toUpperCase();
      const classification = qualisMap.get(normalized);
      if (classification) {
        await supabase.from("articles").update({ qualis: classification }).eq("id", article.id);
      }
    }
  };

  const updateMetrics = async (researcherId: string, metrics: { total_citations: number; h_index: number; i10_index: number; source: string }) => {
    await supabase.from("researcher_metrics").upsert({
      researcher_id: researcherId,
      program_id: programId,
      ...metrics,
      user_id: user?.id,
    } as any, { onConflict: "researcher_id" });
    await fetchAll();
  };

  const fetchCitationsForResearcher = async (researcherId: string): Promise<{ total: number; hIndex: number; i10: number }> => {
    const arts = data?.articles.filter((a) => a.researcher_id === researcherId && a.doi) || [];
    if (arts.length === 0) return { total: 0, hIndex: 0, i10: 0 };

    let totalCitations = 0;
    const citationCounts: number[] = [];

    for (const article of arts) {
      try {
        const res = await fetch(`https://api.openalex.org/works/doi:${article.doi}`);
        if (res.ok) {
          const work = await res.json();
          const citations = work.cited_by_count || 0;
          totalCitations += citations;
          citationCounts.push(citations);
          await supabase.from("articles").update({ citations }).eq("id", article.id);
        }
      } catch { /* skip */ }
    }

    citationCounts.sort((a, b) => b - a);
    let hIndex = 0;
    for (let i = 0; i < citationCounts.length; i++) {
      if (citationCounts[i] >= i + 1) hIndex = i + 1;
      else break;
    }
    const i10Index = citationCounts.filter((c) => c >= 10).length;

    await updateMetrics(researcherId, {
      total_citations: totalCitations,
      h_index: hIndex,
      i10_index: i10Index,
      source: "openalex",
    });

    return { total: totalCitations, hIndex, i10: i10Index };
  };

  const fetchCitations = async (researcherId: string) => {
    const arts = data?.articles.filter((a) => a.researcher_id === researcherId && a.doi) || [];
    if (arts.length === 0) {
      toast({ title: "Sem DOIs", description: "Nenhum artigo com DOI para buscar citações.", variant: "destructive" });
      return;
    }
    const result = await fetchCitationsForResearcher(researcherId);
    toast({ title: "Citações atualizadas", description: `${result.total} citações encontradas.` });
  };

  const fetchAllCitations = async (onProgress?: (current: number, total: number, name: string) => void) => {
    if (!data) return;
    const researchersWithDoi = data.researchers.filter((r) =>
      data.articles.some((a) => a.researcher_id === r.id && a.doi)
    );
    if (researchersWithDoi.length === 0) {
      toast({ title: "Sem DOIs", description: "Nenhum pesquisador possui artigos com DOI.", variant: "destructive" });
      return;
    }

    let grandTotal = 0;
    for (let i = 0; i < researchersWithDoi.length; i++) {
      const r = researchersWithDoi[i];
      onProgress?.(i + 1, researchersWithDoi.length, r.name);
      const result = await fetchCitationsForResearcher(r.id);
      grandTotal += result.total;
    }

    await fetchAll();
    toast({
      title: "Busca concluída",
      description: `${grandTotal} citações encontradas para ${researchersWithDoi.length} pesquisador(es).`,
    });
  };

  const exportCSV = (tableName: string) => {
    if (!data) return;
    let rows: string[][] = [];
    let headers: string[] = [];

    switch (tableName) {
      case "articles":
        headers = ["Título", "Ano", "Periódico", "ISSN", "DOI", "Citações", "Qualis", "Autores", "Pesquisador"];
        rows = data.articles.map((a) => {
          const r = data.researchers.find((r) => r.id === a.researcher_id);
          return [a.title, String(a.year || ""), a.journal || "", a.issn || "", a.doi || "", String(a.citations || 0), a.qualis || "", a.authors || "", r?.name || ""];
        });
        break;
      case "orientations":
        headers = ["Título", "Tipo", "Status", "Ano", "Aluno", "Pesquisador"];
        rows = data.orientations.map((o) => {
          const r = data.researchers.find((r) => r.id === o.researcher_id);
          return [o.title || "", o.type, o.status, String(o.year || ""), o.student || "", r?.name || ""];
        });
        break;
      case "projects":
        headers = ["Título", "Tipo", "Início", "Fim", "Financiamento", "Instituição", "Financiador", "Pesquisador"];
        rows = data.projects.map((p) => {
          const r = data.researchers.find((r) => r.id === p.researcher_id);
          return [p.title, p.type || "", String(p.year_start || ""), String(p.year_end || ""), p.funding || "", p.partner_institution || "", p.funder || "", r?.name || ""];
        });
        break;
    }

    const csv = [headers.join(";"), ...rows.map((r) => r.map((c) => `"${c}"`).join(";"))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tableName}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearMyData = async () => {
    if (!user?.id) return;
    const uid = user.id;
    await Promise.all([
      supabase.from("articles").delete().eq("user_id", uid),
      supabase.from("orientations").delete().eq("user_id", uid),
      supabase.from("projects").delete().eq("user_id", uid),
      supabase.from("technical_productions").delete().eq("user_id", uid),
      supabase.from("reviewer_activities").delete().eq("user_id", uid),
      supabase.from("researcher_metrics").delete().eq("user_id", uid),
      supabase.from("citation_entries").delete().eq("user_id", uid),
      supabase.from("other_productions").delete().eq("user_id", uid),
    ]);
    await supabase.from("researchers").delete().eq("user_id", uid);
    toast({ title: "Dados limpos", description: "Todos os seus dados foram removidos." });
    await fetchAll();
  };

  return { data, loading, fetchAll, uploadLattes, importQualis, fetchCitations, fetchAllCitations, updateMetrics, exportCSV, clearMyData };
}
