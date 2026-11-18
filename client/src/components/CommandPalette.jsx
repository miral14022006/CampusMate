import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  MessageSquare,
  Calendar,
  Shield,
  FileText,
  BarChart3,
  Clock,
  Sparkles,
  ArrowRight,
  Plus
} from 'lucide-react';
import { useAdminAuth } from '../context/AuthContext';
import { popover } from '../lib/motion';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAdminAuth();

  // Listen for Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const list = [
      {
        id: 'new-chat',
        title: 'New Chat',
        subtitle: 'Start a fresh conversation with CampusMate',
        icon: Plus,
        action: () => navigate('/chat')
      },
      {
        id: 'calendar',
        title: 'Important Dates',
        subtitle: 'View upcoming exams, deadlines, and academic calendar',
        icon: Calendar,
        action: () => navigate('/calendar')
      },
      {
        id: 'chat',
        title: 'Chat Assistant',
        subtitle: 'Ask questions about circulars and college life',
        icon: MessageSquare,
        action: () => navigate('/app')
      }
    ];

    if (isAuthenticated) {
      list.push(
        {
          id: 'admin-dash',
          title: 'Admin Dashboard',
          subtitle: 'System metrics and operational analytics',
          icon: BarChart3,
          action: () => navigate('/admin')
        },
        {
          id: 'admin-docs',
          title: 'Document Management',
          subtitle: 'Upload, inspect, and version notices',
          icon: FileText,
          action: () => navigate('/admin/documents')
        },
        {
          id: 'admin-dates',
          title: 'Dates Review',
          subtitle: 'Approve or reject candidate calendar events',
          icon: Clock,
          action: () => navigate('/admin/documents?tab=dates')
        }
      );
    } else {
      list.push({
        id: 'admin-login',
        title: 'Admin Staff Login',
        subtitle: 'Sign in to management console',
        icon: Shield,
        action: () => navigate('/admin/login')
      });
    }

    if (!query.trim()) return list;

    const q = query.toLowerCase();
    return list.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [isAuthenticated, query, navigate]);

  const handleSelect = (index) => {
    const item = items[index];
    if (item) {
      setOpen(false);
      item.action();
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % items.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[color:var(--scrim)] backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette Modal */}
      <motion.div
        variants={popover}
        initial="hidden"
        animate="show"
        exit="exit"
        role="dialog"
        aria-modal="true"
        aria-label="Command search palette"
        className="relative z-10 w-full max-w-lg rounded-xl border border-hairline bg-surface-1 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4 py-3">
          <Search className="h-4 w-4 text-ink-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder="Type a command or jump to page…"
            className="flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none"
          />
          <kbd className="hidden sm:inline-block rounded border border-hairline bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
            ESC
          </kbd>
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2 space-y-1">
          {items.length === 0 ? (
            <div className="py-6 text-center text-xs text-ink-muted">
              No matching commands found.
            </div>
          ) : (
            items.map((item, index) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === index;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors outline-none ${
                    isSelected ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-surface-2'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-accent' : 'text-ink-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold leading-tight">{item.title}</div>
                    <div className="text-[11px] text-ink-muted truncate">{item.subtitle}</div>
                  </div>
                  {isSelected && <ArrowRight className="h-3.5 w-3.5 text-accent" />}
                </button>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between border-t border-hairline bg-surface-2/60 px-4 py-2 text-[10.5px] text-ink-muted">
          <span>Navigate with ↑ ↓ and Enter</span>
          <span>CampusMate Command Menu</span>
        </div>
      </motion.div>
    </div>
  );
}

export default CommandPalette;
