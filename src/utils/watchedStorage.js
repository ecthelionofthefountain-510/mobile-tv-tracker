// src/utils/watchedStorage.js
import { get, set } from "idb-keyval";

const WATCHED_KEY = "watched";

// Valfritt, men kan få browsern att hålla datan längre
export async function ensurePersistentStorage() {
  if (navigator.storage?.persist) {
    try {
      await navigator.storage.persist();
    } catch (e) {
      console.warn("Could not request persistent storage", e);
    }
  }
}

// Läs ALL watched-lista (filmer + serier)
export async function loadWatchedAll() {
  // 1) ALWAYS försök läsa från localStorage först (din gamla logik)
  try {
    const lsValue = localStorage.getItem(WATCHED_KEY);
    if (lsValue) {
      const parsed = JSON.parse(lsValue);
      if (Array.isArray(parsed)) {
        // Spegla till IndexedDB som backup
        try {
          await set(WATCHED_KEY, parsed);
        } catch (e) {
          console.warn("Could not mirror to IndexedDB", e);
        }
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Error reading from localStorage", e);
  }

  // 2) Fallback: om localStorage är tomt → kolla om det finns en backup i IndexedDB
  try {
    const fromIdb = await get(WATCHED_KEY);
    if (Array.isArray(fromIdb)) {
      // Spegla tillbaka till localStorage
      localStorage.setItem(WATCHED_KEY, JSON.stringify(fromIdb));
      return fromIdb;
    }
  } catch (e) {
    console.warn("Error reading from IndexedDB", e);
  }

  // 3) Inget hittat någonstans
  return [];
}

// Spara hela watched-listan
export async function saveWatchedAll(items) {
  try {
    // Skriv som innan (så din Add to watched-kod fortfarande "passar in")
    localStorage.setItem(WATCHED_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Could not save to localStorage", e);
  }

  try {
    // Spegla till IndexedDB som backup
    await set(WATCHED_KEY, items);
  } catch (e) {
    console.warn("Could not save to IndexedDB", e);
  }
}