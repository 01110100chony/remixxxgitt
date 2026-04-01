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
      .insert({ name, institution, created_by: user?.id, ...extra } as any)
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
          },
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
            })
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
        const articles: TablesInsert<"articles">[] = parsed.productions
          .filter((p) => ["article", "book", "bookChapter", "eventWork"].includes(p.type))
          .map((p) => ({
            researcher_id: researcherId,
            title: p.title,
            year: p.year !== "—" ? parseInt(p.year) || null : null,
            journal: p.extra?.journal || null,
            issn: p.extra?.issn || null,
            doi: p.extra?.doi || null,
            isbn: p.extra?.isbn || null,
            authors: p.authors,
          }));
        if (articles.length > 0) {
          await supabase.from("articles").insert(articles);
        }
      }

      // Insert orientations
      if (parsed.orientations.length > 0) {
        const orientations: TablesInsert<"orientations">[] = parsed.orientations.map((o) => ({
          researcher_id: researcherId,
          type: o.kind,
          status: o.type === "concluded" ? "concluded" : "in_progress",
          title: o.title,
          student: o.student,
          year: o.year !== "—" ? parseInt(o.year) || null : null,
        }));
        await supabase.from("orientations").insert(orientations);
      }

      // Insert projects
      if (parsed.projects.length > 0) {
        const projects: TablesInsert<"projects">[] = parsed.projects.map((p) => ({
          researcher_id: researcherId,
          title: p.title,
          year_start: p.yearStart !== "—" ? parseInt(p.yearStart) || null : null,
          year_end: p.yearEnd !== "em andamento" && p.yearEnd !== "—" ? parseInt(p.yearEnd) || null : null,
          funding: p.funding,
          partner_institution: p.institution !== "—" ? p.institution : null,
          funder: p.funder !== "—" ? p.funder : null,
          type: p.type,
        }));
        await supabase.from("projects").insert(projects);
      }

      // Insert technical productions
      const techProds = parsed.productions.filter((p) =>
        ["software", "product", "technicalReport", "consultancy"].includes(p.type)
      );
      if (techProds.length > 0) {
        const techInserts: TablesInsert<"technical_productions">[] = techProds.map((p) => ({
          researcher_id: researcherId,
          type: p.type,
          title: p.title,
          description: p.authors,
          year: p.year !== "—" ? parseInt(p.year) || null : null,
        }));
        await supabase.from("technical_productions").insert(techInserts);
      }

      // Insert social insertion as technical productions
      const socialProds = parsed.productions.filter((p) =>
        ["interview", "mediaParticipation", "eventOrganization"].includes(p.type)
      );
      if (socialProds.length > 0) {
        const socialInserts: TablesInsert<"technical_productions">[] = socialProds.map((p) => ({
          researcher_id: researcherId,
          type: p.type,
          title: p.title,
          description: p.authors,
          year: p.year !== "—" ? parseInt(p.year) || null : null,
        }));
        await supabase.from("technical_productions").insert(socialInserts);
      }

      // Insert reviewer activities
      if (parsed.reviewerActivities && parsed.reviewerActivities.length > 0) {
        const reviewerInserts: TablesInsert<"reviewer_activities">[] = parsed.reviewerActivities.map((r) => ({
          researcher_id: researcherId,
          journal_event: r.journalEvent,
          type: r.type || null,
          year: r.year ? parseInt(r.year) || null : null,
        }));
        await supabase.from("reviewer_activities").insert(reviewerInserts);
      }
    }

    toast({ title: "Upload concluído", description: `${files.length} arquivo(s) processado(s) e salvo(s).` });
    await fetchAll();
  };

  const importQualis = async (csvContent: string) => {
    const lines = csvContent.split("\n").filter((l) => l.trim());
    const entries: TablesInsert<"qualis_reference">[] = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(/[;,\t]/);
      if (parts.length >= 2) {
        const issn = parts[0].trim().replace(/[^0-9Xx-]/g, "");
        const classification = parts[1].trim().toUpperCase();
        const area = parts[2]?.trim() || null;
        if (issn && classification) entries.push({ issn, classification, area });
      }
    }
    if (entries.length > 0) {
      // Delete existing and insert new
      await supabase.from("qualis_reference").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      const batchSize = 500;
      for (let i = 0; i < entries.length; i += batchSize) {
        await supabase.from("qualis_reference").insert(entries.slice(i, i + batchSize));
      }
      toast({ title: "Qualis importado", description: `${entries.length} registros importados.` });
      // Auto-classify articles
      await classifyArticles();
      await fetchAll();
    }
  };

  const classifyArticles = async () => {
    if (!data) return;
    const { data: qualisData } = await supabase.from("qualis_reference").select("*");
    if (!qualisData || qualisData.length === 0) return;
    const qualisMap = new Map<string, string>();
    qualisData.forEach((q) => {
      const normalizedIssn = q.issn.replace(/-/g, "");
      qualisMap.set(normalizedIssn, q.classification);
    });

    const { data: articles } = await supabase.from("articles").select("id, issn")
      .in("researcher_id", data.researchers.map((r) => r.id));
    if (!articles) return;

    for (const article of articles) {
      if (!article.issn) continue;
      const normalized = article.issn.replace(/-/g, "");
      const classification = qualisMap.get(normalized);
      if (classification) {
        await supabase.from("articles").update({ qualis: classification }).eq("id", article.id);
      }
    }
  };

  const updateMetrics = async (researcherId: string, metrics: { total_citations: number; h_index: number; i10_index: number; source: string }) => {
    await supabase.from("researcher_metrics").upsert({
      researcher_id: researcherId,
      ...metrics,
    }, { onConflict: "researcher_id" });
    await fetchAll();
  };

  const fetchCitations = async (researcherId: string) => {
    const articles = data?.articles.filter((a) => a.researcher_id === researcherId && a.doi) || [];
    if (articles.length === 0) {
      toast({ title: "Sem DOIs", description: "Nenhum artigo com DOI para buscar citações.", variant: "destructive" });
      return;
    }

    let totalCitations = 0;
    const citationCounts: number[] = [];

    for (const article of articles) {
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

    // Calculate h-index
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

    toast({ title: "Citações atualizadas", description: `${totalCitations} citações encontradas.` });
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

  return { data, loading, fetchAll, uploadLattes, importQualis, fetchCitations, updateMetrics, exportCSV };
}
