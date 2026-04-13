import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.49.4/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { researcher_id, orcid, program_id } = await req.json();

    if (!researcher_id || !orcid) {
      return new Response(
        JSON.stringify({ error: "researcher_id and orcid are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch author from OpenAlex by ORCID
    const authorRes = await fetch(
      `https://api.openalex.org/authors/orcid:${orcid}`,
      { headers: { "User-Agent": "mailto:lovable@lovable.dev" } }
    );

    if (!authorRes.ok) {
      return new Response(
        JSON.stringify({ found: false, error: "Author not found in OpenAlex" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const author = await authorRes.json();

    const result = {
      found: true,
      display_name: author.display_name || null,
      works_count: author.works_count || 0,
      cited_by_count: author.cited_by_count || 0,
      h_index: author.summary_stats?.h_index || null,
      i10_index: author.summary_stats?.i10_index || null,
      profile_link: author.id || null,
      last_known_institutions: (author.last_known_institutions || [])
        .map((i: any) => i.display_name)
        .filter(Boolean),
    };

    // Save to citation_entries
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, supabaseKey);

    // Upsert citation entry for openalex source
    const { error: ceError } = await sb
      .from("citation_entries")
      .upsert(
        {
          researcher_id,
          program_id: program_id || null,
          source: "openalex",
          source_name: "OpenAlex",
          total_citations: result.cited_by_count,
          total_works: result.works_count,
          h_index: result.h_index,
          profile_link: result.profile_link,
          search_name: result.display_name,
          reference_date: new Date().toISOString().split("T")[0],
          is_public: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "researcher_id,source" }
      );

    if (ceError) {
      console.error("citation_entries upsert error:", ceError);
    }

    // Also update researcher_metrics
    const { error: rmError } = await sb
      .from("researcher_metrics")
      .upsert(
        {
          researcher_id,
          program_id: program_id || null,
          total_citations: result.cited_by_count,
          h_index: result.h_index,
          i10_index: result.i10_index,
          source: "openalex",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "researcher_id" }
      );

    if (rmError) {
      console.error("researcher_metrics upsert error:", rmError);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
