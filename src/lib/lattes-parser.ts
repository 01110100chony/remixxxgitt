export interface Article {
  title: string;
  year: string;
  authors: string;
}

export function parseLattesXML(xmlString: string): Article[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  const articles: Article[] = [];

  // Lattes XML uses ARTIGO-PUBLICADO elements
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
    });
  });

  // Sort by year descending
  articles.sort((a, b) => (b.year > a.year ? 1 : -1));

  return articles;
}
