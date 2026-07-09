"use client";

import { useRef, useState } from "react";
import type {
  ChatMessage,
  DashboardSpec,
  DatasetMeta,
  Row,
} from "@/lib/types";
import { chatEditDashboard } from "@/lib/ai";

const SUGGESTIONS = [
  "Change the main chart to a line chart",
  "Break revenue down by region",
  "Which category performs best?",
  "Add a table of the top 10 rows",
];

export default function ChatPanel({
  dashboard,
  meta,
  rows,
  onDashboardUpdate,
}: {
  dashboard: DashboardSpec;
  meta: DatasetMeta;
  rows: Row[];
  onDashboardUpdate: (d: DashboardSpec) => void;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const message = text.trim();
    if (!message || busy) return;
    setInput("");
    setBusy(true);
    setMessages((m) => [...m, { role: "user", text: message }]);
    try {
      const result = await chatEditDashboard(meta, rows, dashboard, message);
      setMessages((m) => [...m, { role: "assistant", text: result.reply }]);
      onDashboardUpdate({
        ...dashboard,
        name: result.name,
        widgets: result.widgets,
        insights: result.insights,
      });
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          text: err instanceof Error ? err.message : "Something went wrong.",
        },
      ]);
    } finally {
      setBusy(false);
      setTimeout(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }, 50);
    }
  }

  return (
    <aside className="chat-panel">
      <div className="chat-header">Copilot</div>
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="chat-empty">
            <p>Edit this dashboard or ask questions about your data.</p>
            <div className="chat-suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => send(s)} disabled={busy}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg chat-msg-${m.role}`}>
            {m.text}
          </div>
        ))}
        {busy && <div className="chat-msg chat-msg-assistant">Thinking…</div>}
      </div>
      <form
        className="chat-input-row"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask or edit with AI…"
          disabled={busy}
        />
        <button type="submit" disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </aside>
  );
}
