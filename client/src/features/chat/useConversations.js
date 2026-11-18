import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../../services/api';

const PAGE_SIZE = 20;

export function useConversations() {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 280);
    return () => clearTimeout(id);
  }, [search]);

  const requestId = useRef(0);

  const load = useCallback(
    async (query = '') => {
      const current = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const data = await api.conversations.list({ search: query || undefined, limit: PAGE_SIZE });
        if (current !== requestId.current) return;
        setConversations(data?.conversations || []);
      } catch (err) {
        if (current !== requestId.current) return;
        if (err.code !== 'ABORTED') setError(err);
        setConversations([]);
      } finally {
        if (current === requestId.current) setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(debouncedSearch);
  }, [debouncedSearch, load]);

  const refresh = useCallback(() => load(debouncedSearch), [load, debouncedSearch]);

  const rename = useCallback(
    async (id, title) => {
      const clean = title.trim();
      if (!clean) return;
      setConversations((items) => items.map((item) => (item.sessionId === id ? { ...item, title: clean } : item)));
      try {
        await api.conversations.update(id, { title: clean });
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const togglePin = useCallback(
    async (id, pinned) => {
      setConversations((items) =>
        items.map((item) => (item.sessionId === id ? { ...item, pinned } : item))
      );
      try {
        await api.conversations.update(id, { pinned });
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id) => {
      setConversations((items) => items.filter((item) => item.sessionId !== id));
      try {
        await api.conversations.remove(id);
      } catch {
        refresh();
      }
    },
    [refresh]
  );

  const clearAll = useCallback(async () => {
    setConversations([]);
    try {
      await api.conversations.clear();
    } catch {
      refresh();
    }
  }, [refresh]);

  const groups = useMemo(() => {
    const pinned = conversations.filter((item) => item.pinned);
    const unpinned = conversations.filter((item) => !item.pinned);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const today = unpinned.filter((item) => new Date(item.updatedAt || item.createdAt).getTime() >= startOfToday);
    const earlier = unpinned.filter((item) => new Date(item.updatedAt || item.createdAt).getTime() < startOfToday);
    return { pinned, today, earlier };
  }, [conversations]);

  return {
    conversations,
    groups,
    loading,
    error,
    search,
    setSearch,
    refresh,
    rename,
    togglePin,
    remove,
    clearAll
  };
}

export default useConversations;
