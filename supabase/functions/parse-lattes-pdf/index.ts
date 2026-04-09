import { corsHeaders } from "@supabase/supabase-js/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response(JSON.stringify({ error: "Nenhum arquivo enviado" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use a simple text extraction approach - read PDF as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Extract text content from PDF by finding text streams
    const text = extractTextFromPdfBytes(bytes);

    if (!text || text.trim().length < 50) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Não foi possível extrair texto suficiente do PDF. O arquivo pode estar protegido ou ser uma imagem escaneada.",
          hint: "Recomendamos exportar o currículo em formato XML diretamente da Plataforma Lattes.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the extracted text to find researcher info
    const parsed = parseLattesPdfText(text);

    return new Response(JSON.stringify({ success: true, data: parsed, rawTextLength: text.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Erro ao processar PDF" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function extractTextFromPdfBytes(bytes: Uint8Array): string {
  // Simple PDF text extraction - find text between BT and ET markers
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);
  
  const textParts: string[] = [];
  
  // Try to find text in parentheses within BT...ET blocks
  const btEtRegex = /BT\s([\s\S]*?)ET/g;
  let match;
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1];
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g;
    let tjMatch;
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1]);
    }
    // TJ arrays
    const tjArrayRegex = /\[([^\]]*)\]\s*TJ/g;
    let arrMatch;
    while ((arrMatch = tjArrayRegex.exec(block)) !== null) {
      const innerRegex = /\(([^)]*)\)/g;
      let innerMatch;
      while ((innerMatch = innerRegex.exec(arrMatch[1])) !== null) {
        textParts.push(innerMatch[1]);
      }
    }
  }

  return textParts.join(" ").replace(/\\n/g, "\n").replace(/\s+/g, " ");
}

function parseLattesPdfText(text: string): {
  name: string;
  lattesId: string;
  orcid: string;
  formations: string[];
  areas: string[];
} {
  const lines = text.split(/\n/);
  
  // Try to find name - usually first prominent text
  let name = "";
  const nameMatch = text.match(/(?:Nome|Curriculum Vitae)\s*[:\-]?\s*([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,6})/i);
  if (nameMatch) {
    name = nameMatch[1].trim();
  }

  // Find Lattes ID
  let lattesId = "";
  const lattesMatch = text.match(/lattes\.cnpq\.br\/(\d{10,16})/);
  if (lattesMatch) lattesId = lattesMatch[1];
  const idMatch = text.match(/ID\s*(?:Lattes)?[:\s]*(\d{10,16})/i);
  if (!lattesId && idMatch) lattesId = idMatch[1];

  // Find ORCID
  let orcid = "";
  const orcidMatch = text.match(/orcid[:\s]*(?:https?:\/\/orcid\.org\/)?([\d-]{19})/i);
  if (orcidMatch) orcid = orcidMatch[1];

  // Find formations
  const formations: string[] = [];
  const formRegex = /(Doutorado|Mestrado|Graduação|Pós-Doutorado|Especialização)\s+em\s+([^.]+)/gi;
  let fMatch;
  while ((fMatch = formRegex.exec(text)) !== null) {
    formations.push(`${fMatch[1]} em ${fMatch[2].trim()}`);
  }

  // Find areas
  const areas: string[] = [];
  const areaRegex = /(?:Área|Grande Área)[:\s]+([^.;]+)/gi;
  let aMatch;
  while ((aMatch = areaRegex.exec(text)) !== null) {
    areas.push(aMatch[1].trim());
  }

  return { name, lattesId, orcid, formations: formations.slice(0, 10), areas: areas.slice(0, 10) };
}
