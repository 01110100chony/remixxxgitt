import { Upload } from "lucide-react";
import { useCallback, useRef, useState } from "react";

interface FileUploadProps {
  onFileLoad: (content: string) => void;
}

const FileUpload = ({ onFileLoad }: FileUploadProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.name.endsWith(".xml")) {
        return;
      }
      setFileName(file.name);
      file.arrayBuffer().then((buffer) => {
        const text = new TextDecoder("iso-8859-1").decode(buffer);
        onFileLoad(text);
      });
    },
    [onFileLoad]
  );

  return (
    <div
      className={`relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 transition-colors cursor-pointer ${
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
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      <Upload className="h-10 w-10 text-muted-foreground mb-4" />
      <p className="text-lg font-medium text-foreground">
        {fileName ? fileName : "Arraste o arquivo XML ou clique para selecionar"}
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Currículo Lattes em formato XML
      </p>
    </div>
  );
};

export default FileUpload;
