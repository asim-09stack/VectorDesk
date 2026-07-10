import { useEffect, useRef, useState } from 'react';
import { Menu, MessagesSquare, Sparkles, X } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { ChatInput } from '@/components/chat/ChatInput';
import { cn } from '@/lib/utils';

/** A few starter prompts shown on the empty state. */
const SUGGESTIONS = [
  'What is your refund policy?',
  'How do I reset my password?',
  'What are the business hours?',
];

export default function ChatPage() {
  const { messages, isStreaming, error, streamingId, send, stop } = useChat();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the newest content as messages/tokens arrive.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar — persistent on desktop, drawer on mobile. */}
      <aside className="hidden w-72 shrink-0 border-r border-border md:block">
        <ChatSidebar />
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 border-r border-border shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
                className="rounded-md p-2 hover:bg-secondary"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ChatSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* Main column. */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header. */}
        <header className="flex items-center gap-2 border-b border-border p-3 md:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
            className="rounded-md p-2 hover:bg-secondary"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="flex items-center gap-2 font-semibold">
            <MessagesSquare className="h-5 w-5 text-primary" /> VectorDesk
          </span>
        </header>

        {/* Messages / empty state. */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <div className="mx-auto flex h-full max-w-2xl flex-col items-center justify-center gap-6 p-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">
                  How can I help you today?
                </h1>
                <p className="mt-1 text-muted-foreground">
                  Ask anything about your knowledge base.
                </p>
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => send(s)}
                    className="rounded-lg border border-border bg-card p-3 text-left text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  message={m}
                  isStreaming={isStreaming && m.id === streamingId}
                />
              ))}
            </div>
          )}
        </div>

        {error && (
          <div
            className={cn(
              'mx-auto mb-2 w-full max-w-3xl px-4 text-sm text-destructive',
            )}
          >
            {error}
          </div>
        )}

        <ChatInput onSend={send} onStop={stop} isStreaming={isStreaming} />
      </div>
    </div>
  );
}
