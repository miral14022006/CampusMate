import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowDown, Menu, Plus, RefreshCw, WifiOff } from 'lucide-react';
import Logo from '../components/brand/Logo';
import { Button } from '../components/ui/Button';
import { Chip } from '../components/ui/Chip';
import { Skeleton } from '../components/ui/Skeleton';
import { MessageBubble, TypingBubble } from '../features/chat/ChatMessage';
import { ChatEmpty } from '../features/chat/ChatEmpty';
import { Composer } from '../features/chat/Composer';
import { useChat } from '../features/chat/useChat';
import { useToast } from '../components/ui/Toast';
import { StudentMenu } from '../features/auth/StudentMenu';
import { useDocumentTitle, useOnlineStatus, usePrefersReducedMotion } from '../lib/hooks';
import { EASE, fadeUp } from '../lib/motion';

const DEFAULT_SUGGESTIONS = ['Fee details?', 'Exam schedule?', 'Hostel rules?'];

export default function Chat() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const chatContext = useOutletContext();
  const { toast } = useToast();
  const online = useOnlineStatus();
  const reducedMotion = usePrefersReducedMotion();
  const composerRef = useRef(null);
  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const atBottomRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const initialQueryHandledRef = useRef(false);

  useDocumentTitle(id ? 'Chat' : 'New chat');

  const chat = useChat({
    sessionId: id || null,
    onConversationActivity: chatContext?.refresh
  });

  // Handle ?q= query param: sends once on initial load, then clears the param from URL
  useEffect(() => {
    if (chat.initialLoading || initialQueryHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    const q = params.get('q');
    if (q && q.trim()) {
      initialQueryHandledRef.current = true;
      // Clear param from URL without page reload
      navigate(location.pathname, { replace: true });
      chat.send(q.trim());
    }
  }, [chat.initialLoading, location.search, location.pathname, navigate, chat]);

  const scrollToBottom = (behavior = 'smooth') => {
    const node = scrollRef.current;
    if (!node) return;
    node.scrollTo({ top: node.scrollHeight, behavior });
    atBottomRef.current = true;
    setShowJump(false);
  };

  const onScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    atBottomRef.current = distance < 120;
    setShowJump(distance > 180);
  };

  useEffect(() => {
    if (!chat.initialLoading) {
      requestAnimationFrame(() => scrollToBottom('auto'));
    }
  }, [chat.initialLoading]);

  useEffect(() => {
    if (atBottomRef.current) {
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }
  }, [chat.messages.length, chat.sending]);

  // Keep pinned to the bottom while an answer types itself out.
  useEffect(() => {
    const node = contentRef.current;
    if (!node || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => {
      if (atBottomRef.current) {
        const scroller = scrollRef.current;
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      }
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event) => {
      const tag = document.activeElement?.tagName;
      const typing = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        composerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const onToast = (title, variant) => toast({ title, variant });
  const send = (text) => chat.send(text);

  const lastAssistant = [...chat.messages].reverse().find((message) => message.role === 'assistant');
  const suggestions =
    lastAssistant?.quickReplies?.length > 0
      ? lastAssistant.quickReplies.map((reply) => reply.label).filter(Boolean)
      : DEFAULT_SUGGESTIONS;

  if (chat.loadError) {
    return (
      <div className="flex h-full flex-col">
        <ChatHeader onOpenMobile={chatContext?.openMobile} onNewChat={chatContext?.startNewChat} />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-sm text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-negative-soft text-[color:var(--negative)]">
              <RefreshCw className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-[17px] font-semibold text-ink">
              {chat.loadError.status === 404 ? 'Conversation not found' : 'Could not load this conversation'}
            </h1>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">
              {chat.loadError.status === 404
                ? 'It may have been deleted, or it belongs to another browser.'
                : chat.loadError.message}
            </p>
            <div className="mt-5 flex justify-center gap-2">
              <Button variant="secondary" onClick={() => window.location.reload()}>
                Try again
              </Button>
              <Button onClick={() => chatContext?.startNewChat()}>New chat</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader onOpenMobile={chatContext?.openMobile} onNewChat={chatContext?.startNewChat} />

      {!online ? (
        <div className="flex items-center justify-center gap-2 border-b border-[color:var(--warning)] bg-warn-soft px-4 py-2 text-[11.5px] font-medium text-[color:var(--warning)]" role="status">
          <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
          You are offline. Messages will fail until the connection returns.
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={onScroll}
          className="h-full overflow-y-auto overscroll-contain"
          aria-label="Conversation"
        >
          <div ref={contentRef} className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
            {chat.initialLoading ? (
              <div className="space-y-5" aria-busy="true" aria-label="Loading conversation">
                <div className="flex justify-end gap-2">
                  <Skeleton variant="pill" className="h-11 w-52" />
                  <Skeleton variant="circle" className="h-8 w-8" />
                </div>
                <div className="flex items-start gap-2.5">
                  <Skeleton variant="circle" className="h-7 w-7" />
                  <Skeleton className="h-24 w-[70%]" />
                </div>
                <div className="flex justify-end gap-2">
                  <Skeleton variant="pill" className="h-10 w-40" />
                  <Skeleton variant="circle" className="h-8 w-8" />
                </div>
              </div>
            ) : chat.messages.length === 0 ? (
              <ChatEmpty onPick={send} />
            ) : (
              <div role="log" aria-live="polite" aria-relevant="additions" className="space-y-5">
                {chat.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onFeedback={chat.giveFeedback}
                    onToast={onToast}
                    reducedMotion={reducedMotion}
                  />
                ))}

                <AnimatePresence>
                  {chat.sending ? <TypingBubble key="typing" /> : null}
                </AnimatePresence>

                {chat.error ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2.5"
                    role="alert"
                  >
                    <Logo variant="mark" size="sm" className="mt-0.5 shrink-0" showTassel={false} />
                    <div className="rounded-[18px] rounded-tl-md border border-[color:var(--negative)] bg-negative-soft px-4 py-3">
                      <p className="text-[12.5px] leading-relaxed text-[color:var(--negative)]">{chat.error.message}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button size="sm" variant="secondary" loading={chat.sending} onClick={chat.retry}>
                          Retry
                        </Button>
                        <button
                          type="button"
                          onClick={chat.clearError}
                          className="text-[11px] font-medium text-ink-muted hover:text-ink"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {!chat.sending && lastAssistant && suggestions.length > 0 ? (
                  <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="show"
                    className="flex flex-wrap gap-2 pl-10"
                  >
                    {suggestions.slice(0, 4).map((suggestion) => (
                      <Chip key={suggestion} onClick={() => send(suggestion)}>
                        {suggestion}
                      </Chip>
                    ))}
                  </motion.div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showJump ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15, ease: EASE }}
              onClick={() => scrollToBottom('smooth')}
              className="absolute bottom-3 left-1/2 z-20 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-pill border border-hairline bg-surface-2 px-3 py-1.5 text-[11px] font-semibold text-ink shadow-lift hover:bg-surface-3"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
              Jump to latest
            </motion.button>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="border-t border-hairline bg-app backdrop-blur">
        <div className="mx-auto w-full max-w-3xl px-4 pb-3 pt-3 sm:px-6 sm:pb-4">
          <Composer ref={composerRef} onSend={send} disabled={chat.sending} offline={!online} />
          <p className="mt-2 text-center text-[10px] text-ink-muted">
            CampusMate can make mistakes. Always verify official notices.
          </p>
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ onOpenMobile, onNewChat }) {
  return (
    <header className="relative z-30 flex h-16 shrink-0 items-center gap-3 border-b border-hairline bg-app px-4 backdrop-blur sm:px-6">
      <button
        type="button"
        onClick={onOpenMobile}
        className="rounded-full p-2 text-ink-secondary hover:bg-surface-2 hover:text-ink lg:hidden"
        aria-label="Open chat menu"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </button>

      <a
        href="/"
        className="flex items-center gap-2.5 rounded-md outline-none focus-visible:outline-2 focus-visible:outline-accent hover:opacity-85 transition-opacity"
        aria-label="Go to CampusMate landing page"
      >
        <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-hairline bg-surface-1">
          <Logo variant="mark" size={26} showTassel={false} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[13.5px] font-semibold tracking-[-0.01em] text-ink">CampusMate</p>
          <p className="truncate text-[10.5px] text-ink-muted">Your AI campus assistant</p>
        </div>
      </a>

      <button
        type="button"
        onClick={onNewChat}
        className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-pill border border-hairline px-3 text-[11.5px] font-semibold text-ink-secondary hover:border-accent hover:text-accent lg:hidden"
      >
        <Plus className="h-3.5 w-3.5" aria-hidden="true" />
        New
      </button>
      <div className="lg:ml-auto">
        <StudentMenu />
      </div>
    </header>
  );
}
