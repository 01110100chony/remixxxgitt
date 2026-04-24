// ============================================================
// Sincronização inteligente XML Lattes -> banco
// - Upsert por chave natural (não duplica)
// - Marca registros antigos vindos do Lattes como is_active=false
//   se sumiram do XML novo
// - PRESERVA registros source_origin='manual' e campos manuais
//   (qualis, citations, snip etc) ao atualizar
// - Registra histórico em lattes_processing_history
// ============================================================

import { supabase } from "@/integrations/supabase/client";
import { parseLattesXML, ResearcherInfo, isInQuadrienio } from "@/lib/lattes-parser";

export interface SyncCounts {
  inserted: number;
  updated: number;
  deactivated: number;
}

export interface SyncResult {
  researcherId: string;
  researcherName: string;
  articles: SyncCounts;
  orientations: SyncCounts;
  projects: SyncCounts;
  technicalProductions: SyncCounts;
  reviewerActivities: SyncCounts;
  metrics: { totalArticles: number; totalOrientations: number; totalTechnical: number; quadrienioArticles: number };
}

const norm = (s: string | null | undefined) =>
  (s || "").trim().toLowerCase().replace(/\s+/g, " ");

const yearOrNull = (y: string | null | undefined): number | null => {
  if (!y || y === "—") return null;
  const n = parseInt(String(y));
  return Number.isFinite(n) ? n : null;
};

// Build a stable natural key for deduplication
const articleKey = (title: string, year: number | null) => `${norm(title)}|${year ?? ""}`;
const orientationKey = (title: string, student: string | null, year: number | null) =>
  `${norm(title)}|${norm(student)}|${year ?? ""}`;
const projectKey = (title: string, yearStart: number | null) =>
  `${norm(title)}|${yearStart ?? ""}`;
const techKey = (type: string, title: string, year: number | null) =>
  `${norm(type)}|${norm(title)}|${year ?? ""}`;
const reviewerKey = (journalEvent: string, year: number | null) =>
  `${norm(journalEvent)}|${year ?? ""}`;

/**
 * Generic smart-sync helper.
 * - rows from XML are matched to existing rows (where source_origin='lattes') by `keyFn`.
 * - matched rows are updated (only XML-derived fields, manual fields preserved by `mergeUpdate`).
 * - unmatched XML rows are inserted with source_origin='lattes'.
 * - existing lattes rows not matched anymore are flagged is_active=false (NOT deleted).
 * - manual rows are never touched.
 */
// Permissive client to avoid TS depth issues with dynamic table names
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb: any = supabase;

async function syncTable<TRow extends { id: string; is_active: boolean | null; source_origin: string | null }>(opts: {
  table: "articles" | "orientations" | "projects" | "technical_productions" | "reviewer_activities";
  researcherId: string;
  programId: string;
  userId: string | undefined;
  xmlRows: Record<string, unknown>[];
  keyOfXml: (row: Record<string, unknown>) => string;
  keyOfDb: (row: TRow) => string;
  mergeUpdate: (xmlRow: Record<string, unknown>, dbRow: TRow) => Record<string, unknown>;
}): Promise<SyncCounts> {
  const counts: SyncCounts = { inserted: 0, updated: 0, deactivated: 0 };

  // 1. Load existing rows for this researcher
  const { data: existingRaw } = await sb
    .from(opts.table)
    .select("*")
    .eq("researcher_id", opts.researcherId);

  const existing = (existingRaw || []) as unknown as TRow[];
  const existingLattes = existing.filter((r) => (r.source_origin || "manual") === "lattes");

  const existingByKey = new Map<string, TRow>();
  existingLattes.forEach((r) => existingByKey.set(opts.keyOfDb(r), r));

  // 2. Process XML rows
  const seenKeys = new Set<string>();
  const toInsert: Record<string, unknown>[] = [];

  for (const xmlRow of opts.xmlRows) {
    const k = opts.keyOfXml(xmlRow);
    if (seenKeys.has(k)) continue; // skip duplicates within XML
    seenKeys.add(k);

    const dbRow = existingByKey.get(k);
    if (dbRow) {
      // Update — merge keeping manual fields
      const update = opts.mergeUpdate(xmlRow, dbRow);
      // Reactivate if it was previously deactivated
      update.is_active = true;
      update.source_origin = "lattes";
      const { error } = await sb
        .from(opts.table)
        .update(update as never)
        .eq("id", dbRow.id);
      if (!error) counts.updated++;
    } else {
      toInsert.push({
        ...xmlRow,
        researcher_id: opts.researcherId,
        program_id: opts.programId,
        user_id: opts.userId,
        is_active: true,
        source_origin: "lattes",
      });
    }
  }

  // 3. Insert new rows in batches
  if (toInsert.length > 0) {
    for (let i = 0; i < toInsert.length; i += 200) {
      const batch = toInsert.slice(i, i + 200);
      const { error } = await sb.from(opts.table).insert(batch as never);
      if (!error) counts.inserted += batch.length;
    }
  }

  // 4. Deactivate lattes rows not in XML anymore
  const toDeactivate = existingLattes.filter((r) => {
    const k = opts.keyOfDb(r);
    return !seenKeys.has(k) && r.is_active !== false;
  });
  if (toDeactivate.length > 0) {
    const ids = toDeactivate.map((r) => r.id);
    const { error } = await sb
      .from(opts.table)
      .update({ is_active: false } as never)
      .in("id", ids);
    if (!error) counts.deactivated = ids.length;
  }

  return counts;
}

/**
 * Process a single researcher's Lattes XML.
 * - upserts the researcher record
 * - syncs articles, orientations, projects, technical productions, reviewer activities
 * - recalculates local researcher_metrics (counts only, no API calls)
 * - logs into lattes_processing_history
 * - optionally uploads the XML to storage
 */
export async function syncLattesXml(opts: {
  programId: string;
  userId: string | undefined;
  xmlContent: string;
  xmlFilename: string;
  uploadToStorage?: boolean;
  existingResearcherId?: string;
}): Promise<SyncResult> {
  const parsed: ResearcherInfo = parseLattesXML(opts.xmlContent);

  // 1. Upsert researcher
  let researcherId = opts.existingResearcherId || "";
  if (!researcherId) {
    // Try to find existing by lattes_id (preferred) or name
    const queries: { col: string; val: string }[] = [];
    if (parsed.lattesId) queries.push({ col: "lattes_id", val: parsed.lattesId });
    queries.push({ col: "name", val: parsed.name });

    for (const q of queries) {
      const { data } = await sb
        .from("researchers")
        .select("id")
        .eq("program_id", opts.programId)
        .eq(q.col, q.val)
        .maybeSingle();
      if (data) { researcherId = data.id; break; }
    }
  }

  let xmlPath: string | null = null;

  if (!researcherId) {
    const { data: created, error } = await sb
      .from("researchers")
      .insert({
        program_id: opts.programId,
        name: parsed.name,
        gender: parsed.gender,
        research_line: parsed.researchLines.join("; ") || null,
        lattes_xml_filename: opts.xmlFilename,
        lattes_id: parsed.lattesId || null,
        orcid: parsed.orcid || null,
        user_id: opts.userId,
      } as never)
      .select("id")
      .single();
    if (error || !created) throw new Error(`Falha ao criar pesquisador: ${error?.message}`);
    researcherId = created.id;
  }

  // 2. Optionally upload XML to storage (after we know researcherId)
  if (opts.uploadToStorage) {
    xmlPath = `${opts.programId}/${researcherId}.xml`;
    const blob = new Blob([opts.xmlContent], { type: "application/xml" });
    const { error: upErr } = await supabase.storage
      .from("lattes-xml")
      .upload(xmlPath, blob, { upsert: true, contentType: "application/xml" });
    if (upErr) {
      console.warn("XML upload failed:", upErr.message);
      xmlPath = null;
    }
  }

  // 3. Update researcher metadata
  await sb
    .from("researchers")
    .update({
      name: parsed.name,
      gender: parsed.gender,
      research_line: parsed.researchLines.join("; ") || null,
      lattes_xml_filename: opts.xmlFilename,
      lattes_id: parsed.lattesId || null,
      orcid: parsed.orcid || null,
      lattes_xml_path: xmlPath,
      last_processed_at: new Date().toISOString(),
    } as never)
    .eq("id", researcherId);

  // 4. Sync articles (bibliographic productions)
  const articleProds = parsed.productions.filter((p) =>
    ["article", "book", "bookChapter", "eventWork"].includes(p.type)
  );
  const articleXmlRows = articleProds.map((p) => ({
    title: p.title,
    year: yearOrNull(p.year),
    journal: p.extra?.journal || null,
    issn: p.extra?.issn || null,
    doi: p.extra?.doi || null,
    isbn: p.extra?.isbn || null,
    authors: p.authors,
  }));

  const articlesCounts = await syncTable({
    table: "articles",
    researcherId,
    programId: opts.programId,
    userId: opts.userId,
    xmlRows: articleXmlRows,
    keyOfXml: (r) => articleKey(String(r.title), r.year as number | null),
    keyOfDb: (r) => articleKey(String((r as any).title), (r as any).year),
    // Preserve manual fields: qualis, citations
    mergeUpdate: (xml) => ({
      title: xml.title,
      year: xml.year,
      journal: xml.journal,
      issn: xml.issn,
      doi: xml.doi,
      isbn: xml.isbn,
      authors: xml.authors,
    }),
  });

  // 5. Sync orientations
  const orientationXmlRows = parsed.orientations.map((o) => ({
    type: o.kind,
    status: o.type === "concluded" ? "concluded" : "in_progress",
    title: o.title,
    student: o.student,
    year: yearOrNull(o.year),
  }));
  const orientationsCounts = await syncTable({
    table: "orientations",
    researcherId,
    programId: opts.programId,
    userId: opts.userId,
    xmlRows: orientationXmlRows,
    keyOfXml: (r) => orientationKey(String(r.title), (r.student as string) || null, r.year as number | null),
    keyOfDb: (r) => orientationKey(String((r as any).title), (r as any).student, (r as any).year),
    mergeUpdate: (xml) => ({
      type: xml.type,
      status: xml.status,
      title: xml.title,
      student: xml.student,
      year: xml.year,
    }),
  });

  // 6. Sync projects
  const projectXmlRows = parsed.projects.map((p) => ({
    title: p.title,
    year_start: yearOrNull(p.yearStart),
    year_end: p.yearEnd === "em andamento" ? null : yearOrNull(p.yearEnd),
    funding: p.funding,
    partner_institution: p.institution !== "—" ? p.institution : null,
    funder: p.funder !== "—" ? p.funder : null,
    type: p.type,
  }));
  const projectsCounts = await syncTable({
    table: "projects",
    researcherId,
    programId: opts.programId,
    userId: opts.userId,
    xmlRows: projectXmlRows,
    keyOfXml: (r) => projectKey(String(r.title), r.year_start as number | null),
    keyOfDb: (r) => projectKey(String((r as any).title), (r as any).year_start),
    mergeUpdate: (xml) => ({
      title: xml.title,
      year_start: xml.year_start,
      year_end: xml.year_end,
      funding: xml.funding,
      partner_institution: xml.partner_institution,
      funder: xml.funder,
      type: xml.type,
    }),
  });

  // 7. Sync technical productions (technical + social insertion grouped in this table)
  const techProds = parsed.productions.filter((p) =>
    ["software", "product", "technicalReport", "consultancy", "interview", "mediaParticipation", "eventOrganization"].includes(p.type)
  );
  const techXmlRows = techProds.map((p) => ({
    type: p.type,
    title: p.title,
    description: p.authors,
    year: yearOrNull(p.year),
  }));
  const techCounts = await syncTable({
    table: "technical_productions",
    researcherId,
    programId: opts.programId,
    userId: opts.userId,
    xmlRows: techXmlRows,
    keyOfXml: (r) => techKey(String(r.type), String(r.title), r.year as number | null),
    keyOfDb: (r) => techKey(String((r as any).type), String((r as any).title), (r as any).year),
    mergeUpdate: (xml) => ({
      type: xml.type,
      title: xml.title,
      description: xml.description,
      year: xml.year,
    }),
  });

  // 8. Sync reviewer activities
  const reviewerXmlRows = parsed.reviewerActivities.map((r) => ({
    journal_event: r.journalEvent,
    type: r.type || null,
    year: yearOrNull(r.year),
  }));
  const reviewerCounts = await syncTable({
    table: "reviewer_activities",
    researcherId,
    programId: opts.programId,
    userId: opts.userId,
    xmlRows: reviewerXmlRows,
    keyOfXml: (r) => reviewerKey(String(r.journal_event), r.year as number | null),
    keyOfDb: (r) => reviewerKey(String((r as any).journal_event), (r as any).year),
    mergeUpdate: (xml) => ({
      journal_event: xml.journal_event,
      type: xml.type,
      year: xml.year,
    }),
  });

  // 9. Local metric counts (respect quadriênio for "publicações recentes")
  const quadrienioArticles = articleProds.filter((p) => p.type === "article" && isInQuadrienio(p.year)).length;
  const totalArticles = articleProds.filter((p) => p.type === "article").length;
  const totalOrientations = parsed.orientations.length;
  const totalTechnical = techProds.length;

  // Upsert researcher_metrics with local counts (preserve API-derived h_index/citations if any)
  const { data: existingMetric } = await sb
    .from("researcher_metrics")
    .select("*")
    .eq("researcher_id", researcherId)
    .maybeSingle();

  await supabase.from("researcher_metrics").upsert(
    {
      researcher_id: researcherId,
      program_id: opts.programId,
      user_id: opts.userId,
      // Don't overwrite citation-derived metrics — only set if missing
      total_citations: existingMetric?.total_citations ?? 0,
      h_index: existingMetric?.h_index ?? 0,
      i10_index: existingMetric?.i10_index ?? 0,
      source: existingMetric?.source ?? "lattes",
    } as never,
    { onConflict: "researcher_id" }
  );

  // 10. History log
  const detailJson = {
    quadrienio_articles: quadrienioArticles,
    total_articles: totalArticles,
    total_orientations: totalOrientations,
    total_technical: totalTechnical,
  };
  await supabase.from("lattes_processing_history").insert({
    researcher_id: researcherId,
    program_id: opts.programId,
    user_id: opts.userId,
    xml_filename: opts.xmlFilename,
    xml_path: xmlPath,
    inserted_count:
      articlesCounts.inserted + orientationsCounts.inserted + projectsCounts.inserted + techCounts.inserted + reviewerCounts.inserted,
    updated_count:
      articlesCounts.updated + orientationsCounts.updated + projectsCounts.updated + techCounts.updated + reviewerCounts.updated,
    deactivated_count:
      articlesCounts.deactivated + orientationsCounts.deactivated + projectsCounts.deactivated + techCounts.deactivated + reviewerCounts.deactivated,
    details: detailJson,
  } as never);

  return {
    researcherId,
    researcherName: parsed.name,
    articles: articlesCounts,
    orientations: orientationsCounts,
    projects: projectsCounts,
    technicalProductions: techCounts,
    reviewerActivities: reviewerCounts,
    metrics: { totalArticles, totalOrientations, totalTechnical, quadrienioArticles },
  };
}

/**
 * Reprocess all researchers in a program who have an XML stored in storage.
 */
export async function reprocessAllInProgram(opts: {
  programId: string;
  userId: string | undefined;
  onProgress?: (current: number, total: number, name: string) => void;
}): Promise<{ processed: SyncResult[]; missingXml: { id: string; name: string }[] }> {
  const { data: researchers } = await sb
    .from("researchers")
    .select("id, name, lattes_xml_path, lattes_xml_filename")
    .eq("program_id", opts.programId);

  if (!researchers) return { processed: [], missingXml: [] };

  const withXml = researchers.filter((r) => r.lattes_xml_path);
  const missingXml = researchers
    .filter((r) => !r.lattes_xml_path)
    .map((r) => ({ id: r.id, name: r.name }));

  const processed: SyncResult[] = [];

  for (let i = 0; i < withXml.length; i++) {
    const r = withXml[i];
    opts.onProgress?.(i + 1, withXml.length, r.name);
    try {
      const { data: file, error } = await supabase.storage
        .from("lattes-xml")
        .download(r.lattes_xml_path!);
      if (error || !file) continue;
      const xmlContent = await file.text();
      const result = await syncLattesXml({
        programId: opts.programId,
        userId: opts.userId,
        xmlContent,
        xmlFilename: r.lattes_xml_filename || `${r.name}.xml`,
        uploadToStorage: false,
        existingResearcherId: r.id,
      });
      processed.push(result);
    } catch (e) {
      console.error(`Falha ao reprocessar ${r.name}:`, e);
    }
  }

  return { processed, missingXml };
}
