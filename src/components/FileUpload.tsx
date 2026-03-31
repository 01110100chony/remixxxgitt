import { Upload, X, FileText } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFilesLoad: (files: { name: string; content: string }[]) => void;
  loadedFiles: string[];
}

const FileUpload = ({ onFilesLoad, loadedFiles }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFiles = useCallback(
    async (fileList: FileList) => {
      const xmlFiles = Array.from(fileList).filter((f) => f.name.endsWith(".xml"));
      if (xmlFiles.length === 0) return;

      const results = await Promise.all(
        xmlFiles.map(async (file) => {
          const buffer = await file.arrayBuffer();
          const text = new TextDecoder("iso-8859-1").decode(buffer);
          return { name: file.name, content: text };
        })
      );
      onFilesLoad(results);
    },
    [onFilesLoad]
  );

  return (
    <div className="space-y-3">
      <div
        className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-border hover:border-accent/60"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          processFiles(e.dataTransfer.files);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xml"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload className="h-9 w-9 text-muted-foreground mb-3" />
        <p className="text-lg font-medium text-foreground">
          Arraste arquivos XML ou clique para selecionar
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Múltiplos currículos Lattes em formato XML
        </p>
      </div>

      {loadedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {loadedFiles.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1.5 rounded-md bg-accent/10 border border-accent/20 px-3 py-1.5 text-sm text-foreground"
            >
              <FileText className="h-3.5 w-3.5 text-accent" />
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
