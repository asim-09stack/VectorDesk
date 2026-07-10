import { useState } from 'react';
import { FileText, ChevronDown } from 'lucide-react';
import type { Citation } from '@/types';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

/**
 * Displays the source chunks that grounded an assistant answer. Each citation
 * is a chip; clicking one opens a dialog with the retrieved passage.
 */
export function Citations({ citations }: { citations: Citation[] }) {
  const [expanded, setExpanded] = useState(false);
  if (citations.length === 0) return null;

  return (
    <div className="mt-3 border-t border-border/60 pt-2">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 transition-transform',
            expanded && 'rotate-180',
          )}
        />
        {citations.length} source{citations.length > 1 ? 's' : ''}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-wrap gap-2">
          {citations.map((c, i) => (
            <Dialog key={`${c.documentId}-${c.chunkIndex}-${i}`}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="group flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-left text-xs transition-colors hover:border-primary/50 hover:bg-muted"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="truncate">
                    [{i + 1}] {c.documentTitle}
                  </span>
                  <Badge variant="secondary" className="ml-1 shrink-0">
                    {(c.score * 100).toFixed(0)}%
                  </Badge>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    {c.documentTitle}
                  </DialogTitle>
                  <DialogDescription>
                    Chunk #{c.chunkIndex} · relevance {(c.score * 100).toFixed(0)}%
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm text-foreground/90">
                  {c.text}
                </div>
              </DialogContent>
            </Dialog>
          ))}
        </div>
      )}
    </div>
  );
}
