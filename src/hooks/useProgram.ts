import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { parseLattesXML, ResearcherInfo } from "@/lib/lattes-parser";
import { useToast } from "@/hooks/use-toast";
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
        citationEntries: [],
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
    });
    setLoading(false);
  }, [programId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const uploadLattes = async (files: { name: string; content: string }[]) => {
    if (!programId) return;
    for (const file of files) {
      const parsed = parseLattesXML(file.content);

      // Upsert researcher
      const { data: researcher, error: rError } = await supabase
        .from("researchers")
        .upsert(
          {
            program_id: programId,
            name: parsed.name,
            gender: parsed.gender,
            research_line: parsed.researchLines.join("; ") || null,
            lattes_xml_filename: file.name,
            lattes_id: parsed.lattesId || null,
            orcid: parsed.orcid || null,
            user_id: user?.id,
          } as any,
          { onConflict: "program_id,name", ignoreDuplicates: false }
        )
        .select()
        .single();

      // If upsert with onConflict fails (no unique constraint), try insert or find
      let researcherId: string;
      if (rError) {
        const { data: existing } = await supabase
          .from("researchers")
          .select("id")
          .eq("program_id", programId)
          .eq("name", parsed.name)
          .single();
        if (existing) {
          researcherId = existing.id;
          await supabase.from("researchers").update({
            gender: parsed.gender,
            research_line: parsed.researchLines.join("; ") || null,
            lattes_xml_filename: file.name,
            lattes_id: parsed.lattesId || null,
            orcid: parsed.orcid || null,
          }).eq("id", researcherId);
        } else {
          const { data: newR } = await supabase
            .from("researchers")
            .insert({
              program_id: programId,
              name: parsed.name,
              gender: parsed.gender,
              research_line: parsed.researchLines.join("; ") || null,
              lattes_xml_filename: file.name,
              lattes_id: parsed.lattesId || null,
              orcid: parsed.orcid || null,
              user_id: user?.id,
            } as any)
            .select()
            .single();
          researcherId = newR!.id;
        }
      } else {
        researcherId = researcher!.id;
      }

      // Clear old data for this researcher
      await Promise.all([
        supabase.from("articles").delete().eq("researcher_id", researcherId),
        supabase.from("orientations").delete().eq("researcher_id", researcherId),
        supabase.from("projects").delete().eq("researcher_id", researcherId),
        supabase.from("technical_productions").delete().eq("researcher_id", researcherId),
        supabase.from("reviewer_activities").delete().eq("researcher_id", researcherId),
      ]);

      // Insert articles
      if (parsed.productions.length > 0) {
        const articles = parsed.productions
          .filter((p) => ["article", "book", "bookChapter", "eventWork"].includes(p.type))
          .map((p) => ({
            researcher_id: researcherId,
            program_id: programId,
            title: p.title,
            year: p.year !== "—" ? parseInt(p.year) || null : null,
            journal: p.extra?.journal || null,
            issn: p.extra?.issn || null,
            doi: p.extra?.doi || null,
            isbn: p.extra?.isbn || null,
            authors: p.authors,
            user_id: user?.id,
          }));
        if (articles.length > 0) {
          await supabase.from("articles").insert(articles);
        }
      }

      // Insert orientations
      if (parsed.orientations.length > 0) {
        const orientations = parsed.orientations.map((o) => ({
          researcher_id: researcherId,
          program_id: programId,
          type: o.kind,
          status: o.type === "concluded" ? "concluded" : "in_progress",
          title: o.title,
          student: o.student,
          year: o.year !== "—" ? parseInt(o.year) || null : null,
          user_id: user?.id,
        }));
        await supabase.from("orientations").insert(orientations as any);
      }

      // Insert projects
      if (parsed.projects.length > 0) {
        const projects = parsed.projects.map((p) => ({
          researcher_id: researcherId,
          program_id: programId,
          title: p.title,
          year_start: p.yearStart !== "—" ? parseInt(p.yearStart) || null : null,
          year_end: p.yearEnd !== "em andamento" && p.yearEnd !== "—" ? parseInt(p.yearEnd) || null : null,
          funding: p.funding,
          partner_institution: p.institution !== "—" ? p.institution : null,
          funder: p.funder !== "—" ? p.funder : null,
          type: p.type,
          user_id: user?.id,
        }));
        await supabase.from("projects").insert(projects as any);
      }

      // Insert technical productions
      const techProds = parsed.productions.filter((p) =>
        ["software", "product", "technicalReport", "consultancy"].includes(p.type)
      );
      if (techProds.length > 0) {
        const techInserts = techProds.map((p) => ({
          researcher_id: researcherId,
          program_id: programId,
          type: p.type,
          title: p.title,
          description: p.authors,
          year: p.year !== "—" ? parseInt(p.year) || null : null,
          user_id: user?.id,
        }));
        await supabase.from("technical_productions").insert(techInserts as any);
      }

      // Insert social insertion as technical productions
      const socialProds = parsed.productions.filter((p) =>
        ["interview", "mediaParticipation", "eventOrganization"].includes(p.type)
      );
      if (socialProds.length > 0) {
        const socialInserts = socialProds.map((p) => ({
          researcher_id: researcherId,
          program_id: programId,
          type: p.type,
          title: p.title,
          description: p.authors,
          year: p.year !== "—" ? parseInt(p.year) || null : null,
          user_id: user?.id,
        }));
        await supabase.from("technical_productions").insert(socialInserts as any);
      }

      // Insert reviewer activities
      if (parsed.reviewerActivities && parsed.reviewerActivities.length > 0) {
        const reviewerInserts = parsed.reviewerActivities.map((r) => ({
          researcher_id: researcherId,
          program_id: programId,
          journal_event: r.journalEvent,
          type: r.type || null,
          year: r.year ? parseInt(r.year) || null : null,
          user_id: user?.id,
        }));
        await supabase.from("reviewer_activities").insert(reviewerInserts as any);
      }
    }

    toast({ title: "Upload concluído", description: `${files.length} arquivo(s) processado(s) e salvo(s).` });
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
    ]);
    await supabase.from("researchers").delete().eq("user_id", uid);
    toast({ title: "Dados limpos", description: "Todos os seus dados foram removidos." });
    await fetchAll();
  };

  return { data, loading, fetchAll, uploadLattes, importQualis, fetchCitations, fetchAllCitations, updateMetrics, exportCSV, clearMyData };
}
