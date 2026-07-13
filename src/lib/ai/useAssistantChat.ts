import { useState, useCallback, useRef } from "react";
import { sendMessage, AssistantClientError } from "./assistantClient";
import type { AIMessage, ConversationState } from "./types";

export function useAssistantChat() {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const conversationStateRef = useRef<ConversationState | undefined>(undefined);
  const loadingRef = useRef(false);

  const send = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loadingRef.current) return;

    const userMessage: AIMessage = { role: "user", content: trimmed };
    const updatedHistory = [...messagesRef.current, userMessage];
    setMessages(updatedHistory);

    setIsLoading(true);
    loadingRef.current = true;
    setError(null);

    try {
      const response = await sendMessage({
        message: trimmed,
        conversationHistory: updatedHistory,
        conversationState: conversationStateRef.current,
      });

      const assistantMessage: AIMessage = { role: "assistant", content: response.reply };
      setMessages((prev) => [...prev, assistantMessage]);
      conversationStateRef.current = response.conversationState;
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בלתי צפויה. נסו שוב.");
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { messages, isLoading, error, send, clearError };
}
