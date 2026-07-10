import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, UploadCloud } from 'lucide-react';
import * as documentService from '@/services/document.service';
import { getErrorMessage } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

/** Drag-and-drop / click-to-browse uploader for PDF, DOCX, and TXT files. */
export function DocumentUpload() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (file: File) => documentService.uploadDocument(file),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => setError(getErrorMessage(err)),
  });

  const handleFiles = (files: FileList | null): void => {
    if (!files || files.length === 0) return;
    // Upload sequentially so status is easy to follow.
    Array.from(files).forEach((file) => mutation.mutate(file));
  };

  return (
    <Card
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-8 text-center transition-colors',
        dragActive
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50',
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx,.txt"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {mutation.isPending ? (
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      ) : (
        <UploadCloud className="h-8 w-8 text-primary" />
      )}
      <div>
        <p className="font-medium">
          {mutation.isPending ? 'Uploading…' : 'Drop files or click to upload'}
        </p>
        <p className="text-sm text-muted-foreground">
          PDF, DOCX, or TXT — processed and embedded automatically
        </p>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </Card>
  );
}
