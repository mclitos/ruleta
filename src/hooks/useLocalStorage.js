import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage(key, initialValue, sanitize) {
  const [value, setValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (!raw) return initialValue;
      const parsed = JSON.parse(raw);
      return sanitize ? sanitize(parsed) : parsed;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [key, value]);

  const update = useCallback((next) => {
    setValue((current) => (typeof next === 'function' ? next(current) : next));
  }, []);

  return [value, update];
}
