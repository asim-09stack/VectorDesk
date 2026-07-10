import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FileText,
  Layers,
  Loader2,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import * as documentService from '@/services/document.service';
import type { AdminDocument } from '@/services/document.service';
import type { DocumentStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChunkViewer } from '@/components/admin/ChunkViewer';

/** Human-readable file size. */
const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

/** Map a document status to a badge. */
function StatusBadge({ status }: { status: DocumentStatus }) {
  switch (status) {
    case 'INDEXED':
      return <Badge variant="success">Indexed</Badge>;
    case 'PROCESSING':
      return (
        <Badge variant="default" className="gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Processing
        </Badge>
      );
    case 'PENDING':
      return <Badge variant="warning">Pending</Badge>;
    case 'FAILED':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

/** Table of uploaded documents with status, chunk counts, and row actions. */
export function DocumentTable() {
  const queryClient = useQueryClient();
  const [viewer, setViewer] = useState<{ id: string; title: string } | null>(
    null,
  );

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: documentService.fetchDocuments,
    // Poll while anything is still processing so status updates live.
    refetchInterval: (query) => {
      const docs = query.state.data as AdminDocument[] | undefined;
      const busy = docs?.some(
        (d) => d.status === 'PENDING' || d.status === 'PROCESSING',
      );
      return busy ? 2000 : false;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: documentService.deleteDocument,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  const reindexMutation = useMutation({
    mutationFn: documentService.reindexDocument,
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['documents'] }),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-12 text-center text-muted-foreground">
        No documents yet. Upload one to build your knowledge base.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Chunks</th>
              <th className="px-4 py-3 font-medium">Size</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents.map((doc) => (
              <tr
                key={doc.id}
                className="border-b border-border last:border-0 hover:bg-muted/20"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0 text-primary" />
                    <div className="min-w-0">
                      <p className="truncate font-medium">{doc.title}</p>
                      {doc.status === 'FAILED' && doc.error && (
                        <p className="truncate text-xs text-destructive">
                          {doc.error}
                        </p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={doc.status} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {doc.chunkCount}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatSize(doc.sizeBytes)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title="View chunks"
                      disabled={doc.chunkCount === 0}
                      onClick={() =>
                        setViewer({ id: doc.id, title: doc.title })
                      }
                    >
                      <Layers className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Re-index"
                      disabled={
                        reindexMutation.isPending ||
                        doc.status === 'PROCESSING'
                      }
                      onClick={() => reindexMutation.mutate(doc.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                      disabled={deleteMutation.isPending}
                      onClick={() => deleteMutation.mutate(doc.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ChunkViewer
        documentId={viewer?.id ?? null}
        documentTitle={viewer?.title ?? ''}
        open={Boolean(viewer)}
        onOpenChange={(open) => !open && setViewer(null)}
      />
    </>
  );
}
