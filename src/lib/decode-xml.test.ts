// @vitest-environment node
import { describe, it, expect } from "vitest";
import { decodeLattesXml } from "./decode-xml";
describe("decodeLattesXml", () => {
  it("reads UTF-8 files with accents correctly", () => {
    const buf = new TextEncoder().encode('<?xml version="1.0" encoding="UTF-8"?><A T="Gestão"/>').buffer;
    expect(decodeLattesXml(buf)).toContain("Gestão");
  });
  it("reads ISO-8859-1 Lattes files correctly", () => {
    const head = '<?xml version="1.0" encoding="ISO-8859-1"?><A T="Gest';
    const bytes = new Uint8Array([...new TextEncoder().encode(head), 0xe3, 0x6f, 0x22, 0x2f, 0x3e]);
    expect(decodeLattesXml(bytes.buffer)).toContain("Gestão");
  });
});
