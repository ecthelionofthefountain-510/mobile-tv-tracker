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
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    // Best effort: får inte blocka UI/laddning
    try {
      void ensurePersistentStorage();
    } catch {
      // ignore
    }

    try {
      let all = (await loadWatchedAll()) || [];

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
    } catch (err) {
      console.error("Failed to load watched list", err);
      setItems([]);
      setError("Could not load your watched list.");
    } finally {
      setLoading(false);
    }
  }, [mediaType, normalize]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(
    async (id) => {
      const sameId = (a, b) => String(a) === String(b);
      setError("");
      try {
        let all = (await loadWatchedAll()) || [];

        all = all.filter((item) => {
          if (!sameId(item.id, id)) return true;
          if (!mediaType) return false;
          return item.mediaType !== mediaType;
        });

        await saveWatchedAll(all);

        setItems((prev) =>
          prev.filter((item) => {
            if (!sameId(item.id, id)) return true;
            if (!mediaType) return false;
            return item.mediaType !== mediaType;
          })
        );
      } catch (err) {
        console.error("Failed to update watched list", err);
        setError("Could not update your watched list.");
      }
    },
    [mediaType]
  );

  return {
    items,
    setItems,
    loading,
    error,
    refresh,
    remove,
  };
}
