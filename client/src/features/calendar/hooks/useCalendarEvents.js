import { useState, useEffect, useCallback } from 'react';
import { api } from '../../../services/api';

export function useCalendarEvents({ category, semester, from, to } = {}) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.calendar.getEvents({ category, semester, from, to });
      setEvents(data.events || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [category, semester, from, to]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, error, refetch: fetchEvents };
}

export default useCalendarEvents;
