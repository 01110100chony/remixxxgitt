const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the website HTML
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log('Fetching URL:', formattedUrl);

    const pageRes = await fetch(formattedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LattesReader/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
      },
    });

    if (!pageRes.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch URL: ${pageRes.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const html = await pageRes.text();
    // Truncate to avoid token limits
    const truncatedHtml = html.substring(0, 15000);

    // Check for English version indicators
    const hasEnglishIndicators = /\b(english|en\/|\/en\b|lang=en|hreflang="en"|\.en\.|english version)/i.test(html);
    
    // Check for language links/selectors
    const languagePatterns = [];
    if (/\b(portugu[eê]s|pt-BR|pt_BR|lang=pt)/i.test(html)) languagePatterns.push('Português');
    if (/\b(english|lang=en|en-US|en_US)/i.test(html)) languagePatterns.push('Inglês');
    if (/\b(espa[nñ]ol|lang=es|es-ES)/i.test(html)) languagePatterns.push('Espanhol');
    if (/\b(fran[cç]ais|lang=fr)/i.test(html)) languagePatterns.push('Francês');

    // Use Lovable AI (Gemini) to extract structured info
    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) {
      // Fallback: return basic info without AI
      return new Response(
        JSON.stringify({
          description: '',
          research_lines: '',
          languages: languagePatterns.join(', ') || 'Português',
          has_english_version: hasEnglishIndicators,
          internationalization_score: hasEnglishIndicators ? 50 : 10,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiPrompt = `Analyze this HTML from a Brazilian graduate program (PPG) website and extract the following information in Portuguese. Return ONLY a valid JSON object with these fields:

{
  "description": "Brief description of the program (2-3 sentences, in Portuguese)",
  "research_lines": "List of research lines separated by semicolons",
  "languages": "Languages available on the site, separated by commas",
  "has_english_version": true/false,
  "internationalization_score": 0-100 (based on: English version, international partnerships, foreign language content, international exchange programs)
}

HTML content:
${truncatedHtml}

Detected language patterns: ${languagePatterns.join(', ') || 'none'}
Has English indicators: ${hasEnglishIndicators}

Return ONLY the JSON object, no explanation.`;

    const aiRes = await fetch('https://api.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: aiPrompt }],
        temperature: 0.1,
      }),
    });

    if (!aiRes.ok) {
      console.error('AI API error:', aiRes.status);
      // Fallback
      return new Response(
        JSON.stringify({
          description: '',
          research_lines: '',
          languages: languagePatterns.join(', ') || 'Português',
          has_english_version: hasEnglishIndicators,
          internationalization_score: hasEnglishIndicators ? 50 : 10,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiRes.json();
    const content = aiData.choices?.[0]?.message?.content || '';
    
    // Parse JSON from AI response
    let extracted;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      extracted = {
        description: '',
        research_lines: '',
        languages: languagePatterns.join(', ') || 'Português',
        has_english_version: hasEnglishIndicators,
        internationalization_score: hasEnglishIndicators ? 50 : 10,
      };
    }

    // Merge detected patterns
    if (languagePatterns.length > 0 && !extracted.languages) {
      extracted.languages = languagePatterns.join(', ');
    }
    if (hasEnglishIndicators) {
      extracted.has_english_version = true;
    }

    console.log('Extraction complete');
    return new Response(
      JSON.stringify(extracted),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to extract' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
