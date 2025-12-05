// src/hooks/useWatchedList.js
import { useState, useEffect, useCallback } from "react";
import {
  loadWatchedAll,
  saveWatchedAll,
  ensurePersistentStorage,
} from "../utils/watchedStorage";

/**
 * useWatchedList
 * - Läser alla watched från central storage
 * - Filtrerar på mediaType ("tv" eller "movie")
 * - Kan få en normalize-funktion som fixar data och ev. sparar tillbaka
 */
export function useWatchedList(mediaType, options = {}) {
  const { normalize } = options; // normalize(allItems) -> { normalized, changed }

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);

    await ensurePersistentStorage();

    let all = await loadWatchedAll();

    if (typeof normalize === "function") {
      const { normalized, changed } = normalize(all);
      all = normalized;
      if (changed) {
        await saveWatchedAll(normalized);
      }
    }

    const filtered = mediaType
      ? all.filter((item) => item.mediaType === mediaType)
      : all;

    setItems(filtered);
    setLoading(false);
  }, [mediaType, normalize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (id) => {
    let all = await loadWatchedAll();
    all = all.filter((item) => item.id !== id);
    await saveWatchedAll(all);

    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return {
    items,
    setItems,
    loading,
    refresh,
    remove,
  };
}