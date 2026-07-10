/** Three-dot "assistant is thinking" animation shown before tokens arrive. */
export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1" aria-label="Assistant is typing">
      <span className="h-2 w-2 animate-blink rounded-full bg-muted-foreground [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-blink rounded-full bg-muted-foreground [animation-delay:200ms]" />
      <span className="h-2 w-2 animate-blink rounded-full bg-muted-foreground [animation-delay:400ms]" />
    </div>
  );
}
