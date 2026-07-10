import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/chat/CodeBlock';

/**
 * Custom renderers so assistant markdown matches the app theme and code blocks
 * get syntax highlighting + a copy button.
 */
const components: Components = {
  // Render fenced/code content. Block code (with a language or newlines) uses
  // the highlighted CodeBlock; short inline code gets subtle inline styling.
  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? '');
    const text = String(children).replace(/\n$/, '');
    const isBlock = Boolean(match) || text.includes('\n');

    if (!isBlock) {
      return (
        <code
          className="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-primary"
          {...props}
        >
          {children}
        </code>
      );
    }
    return <CodeBlock language={match?.[1]} value={text} />;
  },
  // The CodeBlock renders its own container, so unwrap the default <pre>.
  pre({ children }) {
    return <>{children}</>;
  },
  a({ children, ...props }) {
    return (
      <a
        className="text-primary underline underline-offset-2 hover:opacity-80"
        target="_blank"
        rel="noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  ul({ children }) {
    return <ul className="my-2 list-disc space-y-1 pl-6">{children}</ul>;
  },
  ol({ children }) {
    return <ol className="my-2 list-decimal space-y-1 pl-6">{children}</ol>;
  },
  p({ children }) {
    return <p className="mb-2 leading-relaxed last:mb-0">{children}</p>;
  },
  h1({ children }) {
    return <h1 className="mb-2 mt-3 text-xl font-semibold">{children}</h1>;
  },
  h2({ children }) {
    return <h2 className="mb-2 mt-3 text-lg font-semibold">{children}</h2>;
  },
  h3({ children }) {
    return <h3 className="mb-1 mt-2 text-base font-semibold">{children}</h3>;
  },
  blockquote({ children }) {
    return (
      <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground">
        {children}
      </blockquote>
    );
  },
  table({ children }) {
    return (
      <div className="my-2 overflow-x-auto">
        <table className="w-full border-collapse text-sm">{children}</table>
      </div>
    );
  },
  th({ children }) {
    return (
      <th className="border border-border bg-muted/50 px-2 py-1 text-left font-medium">
        {children}
      </th>
    );
  },
  td({ children }) {
    return <td className="border border-border px-2 py-1">{children}</td>;
  },
};

/** Render assistant/user markdown content with GitHub-flavored markdown. */
function MarkdownComponent({ content }: { content: string }) {
  return (
    <div className="text-sm text-foreground">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export const Markdown = memo(MarkdownComponent);
