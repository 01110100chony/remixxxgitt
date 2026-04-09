import { useState } from "react";
import { FileText, Upload, PenLine, Star } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import XmlUploadMode from "@/components/import/XmlUploadMode";
import PdfUploadMode from "@/components/import/PdfUploadMode";
import ManualEntryMode from "@/components/import/ManualEntryMode";

interface FileUploadProps {
  onFilesLoad: (files: { name: string; content: string }[]) => void;
  onManualAdd?: (researcher: { name: string; lattesId?: string; orcid?: string; formations?: string[]; areas?: string[] }) => void;
  loadedFiles: string[];
  programId?: string | null;
  researchers?: { id: string; name: string; lattes_id: string | null; lattes_xml_filename: string | null; updated_at: string }[];
}

type ImportMode = "xml" | "pdf" | "manual";

const FileUpload = ({ onFilesLoad, onManualAdd, loadedFiles, programId, researchers }: FileUploadProps) => {
  const [mode, setMode] = useState<ImportMode>("xml");

  return (
    <div className="space-y-4">
      {/* Import mode selector */}
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="font-semibold text-foreground text-sm">Como deseja importar seu currículo?</h3>
        <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)} className="flex flex-col sm:flex-row gap-3">
          <Label
            htmlFor="mode-xml"
            className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors flex-1 ${mode === "xml" ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}
          >
            <RadioGroupItem value="xml" id="mode-xml" />
            <FileText className="h-4 w-4 text-accent" />
            <div>
              <span className="font-medium text-sm">Upload XML</span>
              <div className="flex items-center gap-0.5 mt-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
            </div>
          </Label>

          <Label
            htmlFor="mode-pdf"
            className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors flex-1 ${mode === "pdf" ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}
          >
            <RadioGroupItem value="pdf" id="mode-pdf" />
            <Upload className="h-4 w-4 text-orange-500" />
            <div>
              <span className="font-medium text-sm">Upload PDF</span>
              <p className="text-xs text-muted-foreground">alternativo</p>
            </div>
          </Label>

          <Label
            htmlFor="mode-manual"
            className={`flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors flex-1 ${mode === "manual" ? "border-accent bg-accent/5" : "border-border hover:border-accent/40"}`}
          >
            <RadioGroupItem value="manual" id="mode-manual" />
            <PenLine className="h-4 w-4 text-emerald-500" />
            <div>
              <span className="font-medium text-sm">Inserção manual</span>
              <p className="text-xs text-muted-foreground">dados básicos</p>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {/* Mode-specific content */}
      {mode === "xml" && (
        <XmlUploadMode
          onFilesLoad={onFilesLoad}
          loadedFiles={loadedFiles}
          programId={programId}
          researchers={researchers}
        />
      )}
      {mode === "pdf" && (
        <PdfUploadMode programId={programId} onManualAdd={onManualAdd} />
      )}
      {mode === "manual" && (
        <ManualEntryMode onManualAdd={onManualAdd} />
      )}

      {/* Loaded files list */}
      {loadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loadedFiles.map((name) => (
            <span key={name} className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-3 py-1.5 text-sm text-foreground">
              <FileText className="h-3.5 w-3.5 text-accent" /> {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
