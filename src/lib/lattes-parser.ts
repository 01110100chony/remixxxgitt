export interface Article {
  title: string;
  year: string;
  authors: string;
  researcher: string;
}

export interface ResearcherInfo {
  name: string;
  gender: string;
  researchLines: string[];
  articles: Article[];
}

export function parseLattesXML(xmlString: string): ResearcherInfo {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const dadosGerais = doc.querySelector("DADOS-GERAIS");
  const researcher = dadosGerais?.getAttribute("NOME-COMPLETO") || "Pesquisador desconhecido";

  // Gender: SEXO attribute on DADOS-GERAIS (MASCULINO / FEMININO)
  const sexoRaw = dadosGerais?.getAttribute("SEXO") || "";
  const gender = sexoRaw === "MASCULINO" ? "Masculino" : sexoRaw === "FEMININO" ? "Feminino" : "Não informado";

  // Research lines: LINHA-DE-PESQUISA elements
  const linhasElements = doc.querySelectorAll("LINHA-DE-PESQUISA");
  const researchLines: string[] = [];
  linhasElements.forEach((el) => {
    const titulo = el.getAttribute("TITULO-DA-LINHA-DE-PESQUISA") || "";
    if (titulo && !researchLines.includes(titulo)) researchLines.push(titulo);
  });

  const articles: Article[] = [];
  const artigos = doc.querySelectorAll("ARTIGO-PUBLICADO");

  artigos.forEach((artigo) => {
    const dadosBasicos = artigo.querySelector("DADOS-BASICOS-DO-ARTIGO");
    const title =
      dadosBasicos?.getAttribute("TITULO-DO-ARTIGO") ||
      dadosBasicos?.getAttribute("TITULO-DO-ARTIGO-INGLES") ||
      "Sem título";
    const year = dadosBasicos?.getAttribute("ANO-DO-ARTIGO") || "—";

    const autoresElements = artigo.querySelectorAll("AUTORES");
    const authorNames: string[] = [];
    autoresElements.forEach((autor) => {
      const name =
        autor.getAttribute("NOME-COMPLETO-DO-AUTOR") ||
        autor.getAttribute("NOME-PARA-CITACAO") ||
        "";
      if (name) authorNames.push(name);
    });

    articles.push({
      title,
      year,
      authors: authorNames.join("; ") || "—",
      researcher,
    });
  });

  articles.sort((a, b) => (b.year > a.year ? 1 : -1));

  return { name: researcher, gender, researchLines, articles };
}
