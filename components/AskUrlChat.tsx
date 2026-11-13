'use client';

import { useRef, useState } from 'react';
import Markdown from 'react-markdown';
import { AlertCircle, Loader2, MessageSquare, Send } from 'lucide-react';
import type { ChatMessage, UrlIntelligenceReport } from '@/lib/types';

interface AskUrlChatProps {
  report: UrlIntelligenceReport;
  initialPrompt?: string | null;
}

export default function AskUrlChat({
  report,
  initialPrompt,
}: AskUrlChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState(initialPrompt ?? '');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const idCounterRef = useRef(0);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    idCounterRef.current += 1;
    const userMsg: ChatMessage = {
      id: `u-${idCounterRef.current}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setError(null);
    setIsSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report,
          messages,
          question: trimmed,
        }),
      });
      const data = (await res.json()) as { answer?: string; error?: string };
      if (!res.ok || !data.answer) {
        throw new Error(data.error || 'Unable to answer right now.');
      }

      idCounterRef.current += 1;
      const assistantMsg: ChatMessage = {
        id: `a-${idCounterRef.current}`,
        role: 'assistant',
        content: data.answer,
        timestamp: new Date().toISOString(),
      };
      setMessages([...nextHistory, assistantMsg]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to reach the analysis assistant.',
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden flex flex-col min-h-[540px]">
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <MessageSquare
            className="w-4 h-4 text-blue-600 dark:text-blue-400"
            aria-hidden="true"
          />
          <h2 className="font-display text-base font-semibold text-slate-900 dark:text-white">
            Ask This URL
          </h2>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
          Grounded in {report.domain} ({report.nodes.length} nodes)
        </span>
      </div>

      {/* Messages Area */}
      <div className="flex-1 p-5 space-y-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="py-8 max-w-xl mx-auto text-center space-y-4">
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              Interrogate the extracted architecture, routes, and detected stack
              of <span className="font-mono">{report.domain}</span>.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Answers cite observed evidence and clearly flag architectural
              inferences.
            </p>

            <div className="pt-2 flex flex-col gap-2 text-left">
              {report.suggestedQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void sendQuestion(q)}
                  className="px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-blue-500 rounded-lg transition-colors cursor-pointer"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-2xl rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-slate-900 dark:bg-blue-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  <p>{msg.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {isSending && (
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            <span>Synthesizing grounded answer...</span>
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 text-xs text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 px-3 py-2 rounded-lg"
          >
            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void sendQuestion(input);
        }}
        className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex items-center gap-2"
      >
        <label htmlFor="ask-url-input" className="sr-only">
          Ask a question about this URL
        </label>
        <input
          id="ask-url-input"
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Ask anything about ${report.domain}...`}
          disabled={isSending}
          className="flex-1 px-3.5 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ask</span>
        </button>
      </form>
    </div>
  );
}
