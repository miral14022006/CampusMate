import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../../services/api';

function makeSessionId() {
  return (
    window.crypto?.randomUUID?.() ||
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
}

function mapStoredMessage(message) {
  return {
    id: String(message._id || `${message.sender}_${message.createdAt || Date.now()}`),
    messageId: message._id ? String(message._id) : null,
    role: message.sender === 'assistant' ? 'assistant' : 'user',
    text: message.text || '',
    language: message.language,
    intent: message.intent,
    confidence: message.confidence,
    sourceDoc: message.sourceDoc,
    calendarEvents: Array.isArray(message.calendarEvents) ? message.calendarEvents : [],
    createdAt: message.createdAt,
    citations: [],
    fromHistory: true,
    feedback: null
  };
}

export function useChat({ sessionId, onConversationActivity }) {
  const sessionRef = useRef(sessionId || makeSessionId());
  const [messages, setMessages] = useState([]);
  const [initialLoading, setInitialLoading] = useState(Boolean(sessionId && messages.length === 0));
  const [loadError, setLoadError] = useState(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const lastQueryRef = useRef('');

  useEffect(() => {
    if (!sessionId) {
      setInitialLoading(false);
      return undefined;
    }
    let cancelled = false;
    setInitialLoading(true);
    setLoadError(null);

    api.conversations
      .messages(sessionId)
      .then((data) => {
        if (cancelled) return;
        const list = (data?.messages || []).map(mapStoredMessage);
        setMessages(list);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.code !== 'ABORTED') setLoadError(err);
      })
      .finally(() => {
        if (!cancelled) setInitialLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // A ChatPage remounts per conversation id; load once.
  }, [sessionId]);

  const requestAnswer = useCallback(
    async (query) => {
      lastQueryRef.current = query;
      setSending(true);
      setError(null);
      try {
        const response = await api.chat.send({ query, sessionId: sessionRef.current });
        const assistant = {
          id: response.messageId || `assistant_${Date.now()}`,
          messageId: response.messageId,
          role: 'assistant',
          text: response.answer || response.reply || '',
          language: response.language || response.detected_language,
          intent: response.intent,
          confidence: response.confidence,
          citations: Array.isArray(response.citations) ? response.citations : [],
          quickReplies: Array.isArray(response.quick_replies) ? response.quick_replies : [],
          clarificationQuestion: response.clarification_question,
          decision: response.decision,
          grounded: response.grounded,
          generationMode: response.generation_mode,
          sourceDoc: response.source_doc,
          contactInfo: response.contact_info,
          calendarEvents: Array.isArray(response.calendar_events) ? response.calendar_events : [],
          createdAt: new Date().toISOString(),
          isNew: true,
          feedback: null
        };
        setMessages((items) => [...items, assistant]);
        onConversationActivity?.();
        return assistant;
      } catch (err) {
        setError({
          message:
            err?.code === 'NETWORK_ERROR'
              ? 'CampusMate is offline. Check your connection and try again.'
              : err?.message || 'Something went wrong. Please try again.',
          code: err?.code,
          query
        });
        return null;
      } finally {
        setSending(false);
      }
    },
    [onConversationActivity]
  );

  const send = useCallback(
    (rawText) => {
      const text = String(rawText || '').trim();
      if (!text || sending) return;
      setError(null);
      const userMessage = {
        id: `local_${Date.now()}`,
        role: 'user',
        text,
        language: null,
        createdAt: new Date().toISOString()
      };
      setMessages((items) => [...items, userMessage]);
      return requestAnswer(text);
    },
    [requestAnswer, sending]
  );

  const retry = useCallback(() => {
    if (!lastQueryRef.current || sending) return;
    return requestAnswer(lastQueryRef.current);
  }, [requestAnswer, sending]);

  const giveFeedback = useCallback(
    async (message, rating, { reason, comment } = {}) => {
      if (!message?.messageId) throw new Error('This answer cannot be rated yet.');
      let query = '';
      setMessages((items) => {
        const index = items.findIndex((item) => item.id === message.id);
        for (let i = index - 1; i >= 0; i -= 1) {
          if (items[i].role === 'user') {
            query = items[i].text;
            break;
          }
        }
        return items.map((item) => (item.id === message.id ? { ...item, feedback: rating } : item));
      });
      try {
        await api.feedback.create({
          messageId: message.messageId,
          sessionId: sessionRef.current,
          query: query || lastQueryRef.current || 'unknown',
          rating,
          reason,
          comment,
          pipelineSnapshot: {
            language: message.language,
            intent: message.intent,
            confidence: message.confidence,
            retrievedDocs: (message.citations || [])
              .map((citation) => citation.doc_name || citation.docName)
              .filter(Boolean),
            answer: message.text,
            mode: message.generationMode,
            decision: message.decision
          }
        });
      } catch (err) {
        setMessages((items) =>
          items.map((item) => (item.id === message.id ? { ...item, feedback: null } : item))
        );
        throw err;
      }
    },
    []
  );

  return {
    sessionId: sessionRef.current,
    messages,
    initialLoading,
    loadError,
    sending,
    error,
    send,
    retry,
    clearError: () => setError(null),
    giveFeedback
  };
}

export default useChat;
