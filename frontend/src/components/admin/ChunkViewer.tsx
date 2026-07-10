import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import * as documentService from '@/services/document.service';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

interface ChunkViewerProps {
  documentId: string | null;
  documentTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Dialog listing a document's stored chunks and their token counts. */
export function ChunkViewer({
  documentId,
  documentTitle,
  open,
  onOpenChange,
}: ChunkViewerProps) {
  const { data: chunks = [], isLoading } = useQuery({
    queryKey: ['chunks', documentId],
    queryFn: () => documentService.fetchDocumentChunks(documentId as string),
    enabled: open && Boolean(documentId),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chunks — {documentTitle}</DialogTitle>
          <DialogDescription>
            {isLoading
              ? 'Loading chunks…'
              : `${chunks.length} chunk${chunks.length === 1 ? '' : 's'} stored`}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {chunks.map((chunk) => (
              <div
                key={chunk.id}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <Badge variant="secondary">#{chunk.chunkIndex}</Badge>
                  <span className="text-xs text-muted-foreground">
                    ~{chunk.tokenCount} tokens
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm text-foreground/90">
                  {chunk.text}
                </p>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
