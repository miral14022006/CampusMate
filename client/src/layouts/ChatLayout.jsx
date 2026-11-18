import { useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from './Sidebar';
import HistoryPanel from '../features/chat/HistoryPanel';
import useConversations from '../features/chat/useConversations';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { Trash2 } from 'lucide-react';
import { MobileTabBar } from './nav/MobileTabBar';
import { EASE } from '../lib/motion';

export function ChatLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [newChatNonce, setNewChatNonce] = useState(0);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const activeId = location.pathname.startsWith('/chat/') ? location.pathname.split('/')[2] : null;

  const conversations = useConversations();

  const startNewChat = useCallback(() => {
    setMobileOpen(false);
    navigate('/chat');
    setNewChatNonce((value) => value + 1);
  }, [navigate]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        startNewChat();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [startNewChat]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    await conversations.remove(pendingDelete.sessionId);
    setDeleting(false);
    const wasActive = pendingDelete.sessionId === activeId;
    setPendingDelete(null);
    if (wasActive) {
      navigate('/chat');
      setNewChatNonce((value) => value + 1);
    }
  };

  const context = useMemo(
    () => ({
      ...conversations,
      activeId,
      newChatNonce,
      startNewChat,
      openMobile: () => setMobileOpen(true),
      closeMobile: () => setMobileOpen(false),
      collapsed
    }),
    [conversations, activeId, newChatNonce, startNewChat, collapsed]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-app">
      <Sidebar
        variant="chat"
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed((value) => !value)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        onNewChat={startNewChat}
      >
        <HistoryPanel
          conversations={conversations.conversations}
          groups={conversations.groups}
          loading={conversations.loading}
          error={conversations.error}
          search={conversations.search}
          onSearch={conversations.setSearch}
          activeId={activeId}
          collapsed={collapsed}
          onSelect={(id) => navigate(`/chat/${id}`)}
          onRename={conversations.rename}
          onPin={conversations.togglePin}
          onDelete={(item) => setPendingDelete(item)}
          onRetry={conversations.refresh}
          onCloseMobile={() => setMobileOpen(false)}
        />
      </Sidebar>

      <main className="flex min-w-0 flex-1 flex-col pb-14 md:pb-0" id="main-content">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeId || `new-${newChatNonce}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: EASE }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <Outlet context={context} />
          </motion.div>
        </AnimatePresence>
      </main>

      <MobileTabBar onToggleHistory={() => setMobileOpen((v) => !v)} />

      <Dialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        title="Delete conversation?"
        description={`“${pendingDelete?.title || 'This chat'}” and its messages will be permanently removed.`}
        icon={<Trash2 className="h-4 w-4" aria-hidden="true" />}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="danger" loading={deleting} onClick={confirmDelete}>
              Delete
            </Button>
          </>
        }
      >
        <p className="text-[13px] leading-relaxed text-ink-secondary">
          This action cannot be undone. Other conversations are not affected.
        </p>
      </Dialog>
    </div>
  );
}

export default ChatLayout;
