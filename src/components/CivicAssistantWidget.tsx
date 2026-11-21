import { useEffect, useState, type FormEvent } from "react";
import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import type { AssistantChatMessage } from "../types/civic";
import { FOCUS_RING_CLASS } from "./Badges";
import { askAssistant } from "../utils/api";

const QUICK_PROMPTS = [
  "How are Critical vs High priorities decided?",
  "Which department handles broken streetlights?",
  "How do I escalate an active electrical hazard?",
];

export function CivicAssistantWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hello! Ask me about Chennai municipal departments, priority levels, emergency escalation, or tracking civic complaints.",
    },
  ]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setErrorMsg(null);
    const updatedHistory: AssistantChatMessage[] = [
      ...messages,
      { role: "user", content: trimmed },
    ];
    setMessages(updatedHistory);
    setInput("");
    setIsSending(true);

    try {
      const reply = await askAssistant(trimmed, messages);
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : "Assistant is temporarily unavailable."
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendQuestion(input);
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
      {isOpen && (
        <section
          role="dialog"
          aria-label="CivicResolve AI Assistant"
          className="w-[calc(100vw-2.5rem)] sm:w-96 bg-slate-950/60 backdrop-blur-2xl border border-white/15 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-white/15 bg-white/[0.04] px-4 py-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" aria-hidden="true" />
              <h2 className="text-sm font-semibold text-slate-100">
                CivicResolve AI Assistant
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close AI Assistant"
              className={`rounded-lg p-1 text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer ${FOCUS_RING_CLASS}`}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div
            aria-live="polite"
            className="p-4 space-y-3 max-h-72 overflow-y-auto text-xs"
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`rounded-xl px-3.5 py-2.5 leading-relaxed ${
                  msg.role === "user"
                    ? "ml-6 bg-blue-500/20 border border-blue-400/35 text-blue-50"
                    : "mr-4 bg-white/[0.05] backdrop-blur-md border border-white/10 text-slate-200"
                }`}
              >
                {msg.content}
              </div>
            ))}

            {isSending && (
              <div className="mr-4 inline-flex items-center gap-2 rounded-xl bg-white/[0.05] border border-white/10 px-3.5 py-2 text-slate-300">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-400" aria-hidden="true" />
                <span>Thinking...</span>
              </div>
            )}

            {errorMsg && (
              <div
                role="alert"
                className="rounded-xl border border-red-400/40 bg-red-500/20 px-3 py-2 text-red-100"
              >
                {errorMsg}
              </div>
            )}
          </div>

          <div className="px-4 pb-2.5 flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                disabled={isSending}
                onClick={() => void sendQuestion(q)}
                className={`rounded-lg bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-md border border-white/10 hover:border-blue-400/40 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS}`}
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="border-t border-white/15 p-3 flex items-center gap-2 bg-white/[0.04]"
          >
            <label htmlFor="assistant-chat-input" className="sr-only">
              Ask CivicResolve AI Assistant a question
            </label>
            <input
              id="assistant-chat-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about departments or priorities..."
              maxLength={400}
              className="flex-1 rounded-xl bg-slate-950/40 backdrop-blur-md border border-white/15 px-3 py-2 text-xs text-white placeholder-slate-400 focus:bg-slate-950/60 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              aria-label="Send message"
              className={`rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 p-2 text-white hover:from-blue-500 hover:to-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.4)] transition-all cursor-pointer disabled:opacity-50 ${FOCUS_RING_CLASS}`}
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close CivicResolve AI Assistant" : "Open CivicResolve AI Assistant"}
        className={`inline-flex items-center gap-2 rounded-full bg-slate-950/45 hover:bg-slate-950/65 backdrop-blur-xl border border-blue-400/45 px-4 py-3 text-xs font-semibold text-slate-100 shadow-[0_8px_32px_rgba(0,0,0,0.4)] transition-all duration-300 hover:-translate-y-0.5 cursor-pointer ${FOCUS_RING_CLASS}`}
      >
        <MessageSquare className="h-4 w-4 text-blue-400" aria-hidden="true" />
        <span>AI Assistant</span>
      </button>
    </div>
  );
}
