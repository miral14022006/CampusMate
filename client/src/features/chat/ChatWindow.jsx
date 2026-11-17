import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FeedbackWidget from '../feedback/FeedbackWidget';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const LANGUAGE_LABELS = {
  'en': { name: 'English', badge: 'bg-blue-100 text-blue-800 border-blue-200' },
  'hi': { name: 'Hindi (हिंदी)', badge: 'bg-orange-100 text-orange-800 border-orange-200' },
  'gu': { name: 'Gujarati (ગુજરાતી)', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  'hi-Latn': { name: 'Hinglish', badge: 'bg-purple-100 text-purple-800 border-purple-200' },
  'gu-Latn': { name: 'Gujlish', badge: 'bg-amber-100 text-amber-800 border-amber-200' }
};

export default function ChatWindow() {
  const [sessionId] = useState(() => `sess_${Math.random().toString(36).substring(2, 9)}`);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello! I am your Multilingual Campus Assistant. Ask me anything in English, हिंदी, ગુજરાતી, Hinglish, or Gujlish!',
      language: 'en',
      intent: 'greeting',
      sourceDoc: 'academic_regulations_2024.pdf'
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');
    const userMsgId = Date.now();

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, sender: 'user', text: userText }
    ]);
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE}/chat`, {
        query: userText,
        sessionId
      });

      const {
        messageId,
        answer,
        language,
        intent,
        confidence,
        source_doc,
        entities,
        citations,
        grounded,
        generation_mode,
        hallucination_score,
        decision,
        clarification_question,
        quick_replies,
        contact_info,
        standalone_query,
        is_follow_up,
        is_reset
      } = response.data;

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          messageId: messageId || `msg_${Date.now()}`,
          sender: 'assistant',
          text: answer,
          userQuery: userText,
          language,
          intent,
          confidence,
          sourceDoc: source_doc,
          citations: citations || [],
          grounded: grounded !== undefined ? grounded : true,
          generationMode: generation_mode || 'rag',
          hallucinationScore: hallucination_score || 0.0,
          entities: entities || [],
          decision: decision || 'ANSWER',
          clarificationQuestion: clarification_question,
          quickReplies: quick_replies || [],
          contactInfo: contact_info,
          standaloneQuery: standalone_query,
          isFollowUp: is_follow_up,
          isReset: is_reset
        }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'assistant',
          text: 'Sorry, I am having trouble connecting to the campus service. Please try again.',
          language: 'en',
          intent: 'error'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[700px] w-full max-w-4xl bg-white shadow-2xl rounded-2xl border border-slate-200 overflow-hidden font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-purple-700 px-6 py-4 flex items-center justify-between text-white shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight">CampusAI Assistant</h2>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-500/40 border border-indigo-300/30">
              Baseline v1.0
            </span>
          </div>
          <p className="text-xs text-indigo-100 mt-0.5">
            English • हिन्दी • ગુજરાતી • Hinglish • Gujlish
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs font-semibold text-emerald-100">Ready</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50/80">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const langMeta = m.language && LANGUAGE_LABELS[m.language];

          return (
            <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[82%] rounded-2xl px-5 py-3 text-sm shadow-sm transition-all ${
                  isUser
                    ? 'bg-indigo-600 text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                }`}
              >
                <div className="whitespace-pre-line leading-relaxed">{m.text}</div>
              </div>

              {/* Assistant Metadata Badges */}
              {!isUser && (
                <div className="flex flex-col gap-1.5 mt-2 ml-1">
                  {/* Quick-reply interactive buttons for CLARIFY or FALLBACK */}
                  {m.quickReplies && m.quickReplies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {m.quickReplies.map((qr, qIdx) => (
                        <button
                          key={qIdx}
                          onClick={() => {
                            setInput(qr.label || qr.payload);
                          }}
                          className="text-xs px-3 py-1.5 rounded-xl font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 shadow-sm transition-all transform active:scale-95 flex items-center gap-1"
                        >
                          <span>👉</span>
                          <span>{qr.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5">
                    {m.generationMode && m.generationMode === 'rag' && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                        ⚡ RAG Grounded
                      </span>
                    )}
                    {m.isFollowUp && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        🔄 Context Linked
                      </span>
                    )}
                    {m.standaloneQuery && m.isFollowUp && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600 border border-slate-200" title="Rewritten Standalone Query">
                        🔍 "{m.standaloneQuery}"
                      </span>
                    )}
                    {m.isFollowUp && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-bold bg-teal-100 text-teal-800 border border-teal-300">
                        🔄 Context Linked
                      </span>
                    )}
                    {m.standaloneQuery && m.isFollowUp && (
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-slate-100 text-slate-600 border border-slate-200" title="Rewritten Standalone Query">
                        🔍 "{m.standaloneQuery}"
                      </span>
                    )}
                    {m.decision && m.decision !== 'ANSWER' && (
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold border ${
                        m.decision === 'CLARIFY' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-rose-100 text-rose-800 border-rose-300'
                      }`}>
                        Decision: {m.decision}
                      </span>
                    )}
                    {langMeta && (
                      <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border ${langMeta.badge}`}>
                        {langMeta.name} {m.confidence ? `(${(m.confidence * 100).toFixed(0)}%)` : ''}
                      </span>
                    )}
                    {m.intent && m.intent !== 'greeting' && m.intent !== 'error' && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        Intent: <span className="font-semibold">{m.intent}</span>
                      </span>
                    )}
                    {m.sourceDoc && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        📄 {m.sourceDoc}
                      </span>
                    )}
                    {m.entities && m.entities.length > 0 && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full font-medium bg-violet-50 text-violet-700 border border-violet-200">
                        🏷️ {m.entities.map(e => `${e.label}:${e.text}`).join(', ')}
                      </span>
                    )}
                  </div>

                  {/* Feature 04: Expandable Sources Panel */}
                  {m.citations && m.citations.length > 0 && (
                    <details className="mt-1 text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-2.5">
                      <summary className="font-semibold text-indigo-700 cursor-pointer hover:underline flex items-center gap-1.5 select-none">
                        <span>📚 Verified Sources & Citations ({m.citations.length})</span>
                      </summary>
                      <div className="mt-2 space-y-2 pt-1 border-t border-slate-200/60">
                        {m.citations.map((c, cIdx) => (
                          <div key={cIdx} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                            <div className="flex justify-between items-center text-slate-700 font-medium">
                              <span>[{c.citation_id || cIdx + 1}] 📄 {c.doc_name} (Page {c.page || 1})</span>
                              {c.score !== undefined && (
                                <span className="text-[10px] text-slate-500 font-mono">Score: {c.score.toFixed(3)}</span>
                              )}
                            </div>
                            {c.snippet && (
                              <p className="text-slate-600 italic mt-1 line-clamp-2">
                                "{c.snippet}"
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {/* Feature 10: Feedback Widget (Thumbs up / down) */}
                  <FeedbackWidget
                    message={m}
                    userQuery={m.userQuery || m.standaloneQuery}
                    sessionId={sessionId}
                  />
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="flex items-center space-x-2 text-slate-400 text-xs italic ml-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]"></div>
            <span>Analyzing language & querying documents...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Queries */}
      <div className="px-4 py-2 bg-slate-100 border-t border-slate-200 flex gap-2 overflow-x-auto text-xs">
        <span className="text-slate-500 font-medium self-center text-[11px]">Try:</span>
        <button
          onClick={() => setInput("Exam form bharne ki last date kya hai?")}
          className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1 whitespace-nowrap"
        >
          Hinglish Exam Date
        </button>
        <button
          onClick={() => setInput("College ma admission mate ketli fees chhe?")}
          className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1 whitespace-nowrap"
        >
          Gujlish Fees
        </button>
        <button
          onClick={() => setInput("हॉस्टल में मेस का खाना और नियम क्या हैं?")}
          className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1 whitespace-nowrap"
        >
          Hindi Hostel
        </button>
        <button
          onClick={() => setInput("What are the working hours of the central library?")}
          className="bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg px-2.5 py-1 whitespace-nowrap"
        >
          English Library
        </button>
      </div>

      {/* Message Input Bar */}
      <form onSubmit={sendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask in English, Hindi, Gujarati, Hinglish or Gujlish..."
          className="flex-1 border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
