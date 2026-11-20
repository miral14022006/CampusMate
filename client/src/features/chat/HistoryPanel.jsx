import { useState } from 'react';
import { Check, MessageSquare, Pencil, Pin, PinOff, Search, Trash2, X } from 'lucide-react';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tooltip } from '../../components/ui/Tooltip';
import { cn } from '../../lib/cn';
import { formatRelativeTime, truncate } from '../../lib/format';

function HistoryRow({
  item,
  active,
  collapsed,
  onSelect,
  onRename,
  onPin,
  onDelete,
  onCloseMobile
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(item.title || 'New Conversation');

  const commit = () => {
    setEditing(false);
    if (draft.trim() && draft.trim() !== item.title) onRename(item.sessionId, draft);
  };

  if (collapsed) {
    return (
      <div className="flex justify-center w-full my-0.5">
        <Tooltip label={item.title || 'Conversation'} side="right" className="w-full justify-center">
          <button
            type="button"
            onClick={() => {
              onSelect(item.sessionId);
              onCloseMobile?.();
            }}
            className={cn(
              'flex h-10 w-10 mx-auto items-center justify-center rounded-full transition-colors',
              active ? 'bg-accent-soft text-accent' : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
            )}
            aria-label={item.title || 'Conversation'}
          >
            <MessageSquare className="h-4 w-4" aria-hidden="true" />
          </button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative flex min-h-9 items-center gap-1 rounded-md pr-1 transition-colors',
        active ? 'bg-accent-soft' : 'hover:bg-surface-2'
      )}
    >
      {editing ? (
        <div className="flex w-full items-center gap-1 py-1 pl-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') {
                setEditing(false);
                setDraft(item.title || '');
              }
            }}
            aria-label="Conversation title"
            className="h-7 min-w-0 flex-1 rounded-[6px] border border-accent bg-surface-1 px-2 text-[12px] text-ink outline-none"
          />
          <button
            type="button"
            onClick={commit}
            className="rounded p-1 text-accent hover:bg-surface-3"
            aria-label="Save title"
          >
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              setDraft(item.title || '');
            }}
            className="rounded p-1 text-ink-muted hover:bg-surface-3"
            aria-label="Cancel rename"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => {
              onSelect(item.sessionId);
              onCloseMobile?.();
            }}
            className="min-w-0 flex-1 py-2 pl-3 pr-1 text-left"
          >
            <span
              className={cn(
                'block truncate text-[12.5px] font-medium',
                active ? 'text-accent' : 'text-ink-secondary group-hover:text-ink'
              )}
            >
              {truncate(item.title || 'New Conversation', 32)}
            </span>
            <span className="mt-0.5 block text-[10.5px] text-ink-muted">
              {formatRelativeTime(item.updatedAt || item.createdAt)}
            </span>
          </button>
          <div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              onClick={() => onPin(item.sessionId, !item.pinned)}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-accent"
              aria-label={item.pinned ? 'Unpin conversation' : 'Pin conversation'}
            >
              {item.pinned ? (
                <PinOff className="h-3.5 w-3.5" aria-hidden="true" />
              ) : (
                <Pin className="h-3.5 w-3.5" aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft(item.title || '');
                setEditing(true);
              }}
              className="rounded p-1.5 text-ink-muted hover:bg-surface-3 hover:text-ink"
              aria-label="Rename conversation"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="rounded p-1.5 text-ink-muted hover:bg-negative-soft hover:text-[color:var(--negative)]"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function HistoryPanel({
  conversations = [],
  groups,
  loading,
  error,
  search,
  onSearch,
  activeId,
  collapsed = false,
  onSelect,
  onRename,
  onPin,
  onDelete,
  onRetry,
  onCloseMobile
}) {
  if (collapsed) {
    return (
      <div className="mt-1 space-y-1">
        {conversations.slice(0, 8).map((item) => (
          <HistoryRow
            key={item.sessionId}
            item={item}
            active={item.sessionId === activeId}
            collapsed
            onSelect={onSelect}
            onRename={onRename}
            onPin={onPin}
            onDelete={onDelete}
            onCloseMobile={onCloseMobile}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="mt-1">
      <div className="relative mb-2 px-1">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
          aria-hidden="true"
        />
        <input
          type="search"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search chats"
          aria-label="Search chat history"
          className="h-9 w-full rounded-pill border border-hairline bg-surface-1 pl-9 pr-3 text-[12px] text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="space-y-2 px-1 py-2" aria-busy="true" aria-label="Loading chat history">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-1.5 py-1">
              <Skeleton variant="text" className="h-3 w-[85%]" />
              <Skeleton variant="text" className="h-2.5 w-12" />
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState
          compact
          icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          title={search ? 'No matches' : 'No conversations yet'}
          description={search ? 'Try a different search term.' : 'Your chats will appear here.'}
        />
      ) : conversations.length === 0 ? (
        <EmptyState
          compact
          icon={<MessageSquare className="h-5 w-5" aria-hidden="true" />}
          title={search ? 'No matches' : 'No conversations yet'}
          description={search ? 'Try a different search term.' : 'Your chats will appear here.'}
        />
      ) : (
        <div className="space-y-3">
          {[
            ['Pinned', groups.pinned],
            ['Today', groups.today],
            ['Earlier', groups.earlier]
          ].map(([label, items]) =>
            items.length ? (
              <div key={label}>
                <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-muted">
                  {label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => (
                    <HistoryRow
                      key={item.sessionId}
                      item={item}
                      active={item.sessionId === activeId}
                      onSelect={onSelect}
                      onRename={onRename}
                      onPin={onPin}
                      onDelete={onDelete}
                      onCloseMobile={onCloseMobile}
                    />
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      )}
    </div>
  );
}

export default HistoryPanel;
