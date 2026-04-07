const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { lattesId } = await req.json();
    if (!lattesId) {
      return new Response(
        JSON.stringify({ error: 'ID Lattes é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Clean the ID - extract numeric part
    const cleanId = lattesId.replace(/\D/g, '');
    if (!cleanId || cleanId.length < 10) {
      return new Response(
        JSON.stringify({ error: 'ID Lattes inválido. Use o ID numérico de 16 dígitos.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Attempting to fetch Lattes CV for ID:', cleanId);

    // Try the known Lattes XML endpoint
    const xmlUrl = `http://buscatextual.cnpq.br/buscatextual/download.do?metodo=apresentar&idcnpq=${cleanId}`;
    
    const response = await fetch(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/xml, text/xml, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      console.log('Direct fetch failed with status:', response.status);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Não foi possível baixar o currículo (HTTP ${response.status}). Faça upload manual do XML.` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const body = await response.text();

    // Check if we got XML content
    if (body.includes('<CURRICULO-VITAE') || body.includes('<?xml')) {
      console.log('Successfully fetched Lattes XML');
      return new Response(
        JSON.stringify({ 
          success: true, 
          xml: body,
          filename: `lattes_${cleanId}.xml`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try alternate endpoint
    const altUrl = `http://lattes.cnpq.br/${cleanId}`;
    console.log('Primary failed, trying to detect name from profile page:', altUrl);

    // If we got HTML instead of XML, the download endpoint may require captcha
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'O CNPq exige captcha para download automático. Faça upload manual do XML.',
        profileUrl: `https://lattes.cnpq.br/${cleanId}`,
        hint: 'Acesse o perfil Lattes, clique em "Exportar" e baixe o XML.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching Lattes:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro ao buscar currículo Lattes' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
