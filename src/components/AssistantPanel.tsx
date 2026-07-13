import { useState, useRef, useEffect } from "react";
import { Send, Loader2, X, AlertCircle, MessageCircle, Lightbulb } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "./ui/sheet";
import { Button } from "./ui/button";
import { useAssistantChat } from "../lib/ai/useAssistantChat";
import { AI_ENABLED } from "../lib/ai/config";
import type { AIMessage } from "../lib/ai/types";

const ONBOARDING_KEY = "shopping-pal-onboarded";

const SUGGESTION_CHIPS = [
  "\u{1F6D2} תוסיף מוצרים",
  "\u{2795} עדכן כמויות",
  "\u{1F4A1} הצע השלמות לרשימה",
  "\u{1F5D1}\u{FE0F} הסר מוצרים",
] as const;

function MessageBubble({ message }: { message: AIMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-end">
      <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex gap-1.5">
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
          <span className="h-2 w-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}

function Onboarding({ onChipClick }: { onChipClick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-2">
      <div className="text-center">
        <span className="mb-3 block text-4xl">{"👋"}</span>
        <p className="text-lg font-semibold">{"היי!"}</p>
        <p className="mt-2 text-sm text-muted-foreground">{"מה נוסיף לרשימה היום?"}</p>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {
            "אני יכול לעזור להוסיף מוצרים, לעדכן כמויות, להציע השלמות ולזכור את הרגלי הקנייה של הבית."
          }
        </p>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground/80">
          <Lightbulb className="h-3.5 w-3.5" />
          <span>{"שום שינוי לא יתבצע בלי האישור שלך."}</span>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {SUGGESTION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChipClick(chip)}
            className="rounded-full border border-primary/30 bg-primary/5 px-3.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
          >
            {chip}
          </button>
        ))}
      </div>
    </div>
  );
}

function useOnboarding() {
  const [seen, setSeen] = useState(() => {
    try {
      return localStorage.getItem(ONBOARDING_KEY) === "true";
    } catch {
      return false;
    }
  });

  const markSeen = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      /* storage unavailable */
    }
    setSeen(true);
  };

  return { showOnboarding: !seen, markSeen };
}

export function AssistantPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!AI_ENABLED) return null;
  return <AssistantPanelInner open={open} onOpenChange={onOpenChange} />;
}

function AssistantPanelInner({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { messages, isLoading, error, send, clearError } = useAssistantChat();
  const { showOnboarding, markSeen } = useOnboarding();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const handleSend = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (showOnboarding) markSeen();
    send(trimmed);
    setInput("");
  };

  const handleSubmit = () => handleSend(input);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const showEmpty = messages.length === 0 && !isLoading;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="flex w-full flex-col p-0 sm:max-w-md">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">{"ליסטו"}</SheetTitle>
          <SheetDescription className="text-xs">{"העוזר שלך בקניות"}</SheetDescription>
        </SheetHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {showEmpty && showOnboarding && <Onboarding onChipClick={handleSend} />}

          {showEmpty && !showOnboarding && (
            <div className="flex h-full items-center justify-center">
              <div className="text-center text-muted-foreground">
                <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-sm">{"מה נוסיף לרשימה היום?"}</p>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {isLoading && <TypingIndicator />}
        </div>

        {error && (
          <div className="mx-4 mb-2 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="flex-1">{error}</span>
            <button type="button" onClick={clearError} className="shrink-0">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="border-t px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={"כתבו הודעה..."}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button
              size="icon"
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              aria-label={"שליחה"}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AssistantFab({ onClick }: { onClick: () => void }) {
  if (!AI_ENABLED) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 left-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95"
      aria-label="פתיחת ליסטו"
    >
      <MessageCircle className="h-6 w-6" />
    </button>
  );
}
