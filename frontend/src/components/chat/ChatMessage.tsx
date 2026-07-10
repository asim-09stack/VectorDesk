import { useState } from 'react';
import { Bot, Check, Copy, User as UserIcon } from 'lucide-react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Markdown } from '@/components/chat/Markdown';
import { Citations } from '@/components/chat/Citations';
import { TypingIndicator } from '@/components/chat/TypingIndicator';

interface ChatMessageProps {
  message: Message;
  /** True when this assistant message is still being streamed. */
  isStreaming?: boolean;
}

/** A single chat bubble (user or assistant) with copy + citations. */
export function ChatMessage({ message, isStreaming }: ChatMessageProps) {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // While streaming, show the typing indicator until the first token lands.
  const showTyping = isStreaming && message.content.length === 0;

  return (
    <div
      className={cn(
        'group flex w-full gap-3 px-4 py-5',
        isUser ? 'bg-transparent' : 'bg-muted/30',
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
          isUser ? 'bg-secondary' : 'bg-primary/15 text-primary',
        )}
      >
        {isUser ? (
          <UserIcon className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-2">
          <span className="text-sm font-semibold">
            {isUser ? 'You' : 'VectorDesk'}
          </span>
        </div>

        {showTyping ? (
          <TypingIndicator />
        ) : isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm text-foreground">
            {message.content}
          </p>
        ) : (
          <div className="min-w-0 break-words">
            <Markdown content={message.content} />
            {message.citations && message.citations.length > 0 && (
              <Citations citations={message.citations} />
            )}
          </div>
        )}

        {/* Copy button — available on completed messages. */}
        {!showTyping && !isStreaming && (
          <button
            type="button"
            onClick={handleCopy}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
            aria-label="Copy message"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
