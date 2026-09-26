// Instagram-like separate search history manager for Home, Messages, and Colleges

export type SearchHistoryContext = 'home' | 'messages' | 'colleges';

const STORAGE_KEYS: Record<SearchHistoryContext, string> = {
  home: 'eventhub_search_history_home',
  messages: 'eventhub_search_history_messages',
  colleges: 'eventhub_search_history_colleges',
};

const DEFAULT_SEEDS: Record<SearchHistoryContext, string[]> = {
  home: ['Nexora Hackathon', 'AI Workshop', 'Inter-College Symposium'],
  messages: ['@sureshm2006', 'Erode Sengunthar Engineering College'],
  colleges: ['Kongu Engineering College', 'Erode Sengunthar Engineering College'],
};

export const getSearchHistory = (context: SearchHistoryContext): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS[context]);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
    // Return initial clean defaults if not yet modified
    return DEFAULT_SEEDS[context] || [];
  } catch (e) {
    return DEFAULT_SEEDS[context] || [];
  }
};

export const saveSearchTerm = (context: SearchHistoryContext, query: string): string[] => {
  const trimmed = query.trim();
  if (!trimmed) return getSearchHistory(context);
  try {
    const current = getSearchHistory(context);
    // Remove if exists, then prepend to top (most recent first)
    const filtered = current.filter((item) => item.toLowerCase() !== trimmed.toLowerCase());
    const updated = [trimmed, ...filtered].slice(0, 10);
    localStorage.setItem(STORAGE_KEYS[context], JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const removeSearchTerm = (context: SearchHistoryContext, termToRemove: string): string[] => {
  try {
    const current = getSearchHistory(context);
    const updated = current.filter((item) => item.toLowerCase() !== termToRemove.toLowerCase());
    localStorage.setItem(STORAGE_KEYS[context], JSON.stringify(updated));
    return updated;
  } catch (e) {
    return [];
  }
};

export const clearSearchHistory = (context: SearchHistoryContext): void => {
  try {
    localStorage.setItem(STORAGE_KEYS[context], JSON.stringify([]));
  } catch (e) {}
};
