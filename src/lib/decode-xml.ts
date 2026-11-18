/** Decodes a Lattes XML file honoring its declared encoding (Lattes exports ISO-8859-1; others may be UTF-8). */
export function decodeLattesXml(buffer: ArrayBuffer): string {
  const head = new TextDecoder("ascii").decode(buffer.slice(0, 200));
  const m = head.match(/encoding=["']([^"']+)["']/i);
  const enc = (m?.[1] || "iso-8859-1").toLowerCase();
  try {
    return new TextDecoder(enc).decode(buffer);
  } catch {
    return new TextDecoder("iso-8859-1").decode(buffer);
  }
}
