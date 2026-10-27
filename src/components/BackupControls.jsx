// src/components/BackupControls.jsx
import React, { useRef, useState } from "react";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";
import { loadFavorites, saveFavorites } from "../utils/favoritesStorage";

export default function BackupControls({ onRestore, compact = false }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState("");

  const handleExport = async () => {
    try {
      const [watched, favorites] = await Promise.all([
        loadWatchedAll(),
        loadFavorites(),
      ]);
      const payload = {
        version: 2,
        exportedAt: new Date().toISOString(),
        watched: Array.isArray(watched) ? watched : [],
        favorites: Array.isArray(favorites) ? favorites : [],
      };
      const json = JSON.stringify(payload, null, 2);

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `tv-tracker-backup-${new Date()
        .toISOString()
        .slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("Backup exported ✓");
    } catch (e) {
      console.error(e);
      setStatus("Export failed ×");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target.result;
        const parsed = JSON.parse(text);

        // v2 format: { watched, favorites }. Legacy format: a bare watched array.
        let watched;
        let favorites;
        if (Array.isArray(parsed)) {
          watched = parsed;
          favorites = null;
        } else if (parsed && typeof parsed === "object") {
          watched = Array.isArray(parsed.watched) ? parsed.watched : null;
          favorites = Array.isArray(parsed.favorites) ? parsed.favorites : null;
        } else {
          setStatus("Invalid file: unrecognized backup format ×");
          return;
        }

        if (!watched && !favorites) {
          setStatus("Invalid file: no watched or favorites data ×");
          return;
        }

        if (watched) await saveWatchedAll(watched);
        if (favorites) await saveFavorites(favorites);

        if (onRestore) {
          await onRestore();
        }

        setStatus("Backup imported ✓");
      } catch (err) {
        console.error(err);
        setStatus("Import failed ×");
      } finally {
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div
      className={
        (compact
          ? "app-panel space-y-3 px-4 py-4 text-sm text-gray-300"
          : "app-panel p-4 space-y-2 text-sm text-gray-300") +
        (compact ? "" : " mt-8")
      }
    >
      <div className="font-semibold text-yellow-400">Backup & restore</div>
      <p className="text-xs text-gray-400">
        Exports / imports your entire watched list and favorites as a JSON file.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className={
            compact
              ? "app-button-primary rounded-xl px-3 py-2 text-xs"
              : "app-button-primary px-3 py-1 text-xs"
          }
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className={
            compact
              ? "app-button-ghost rounded-xl px-3 py-2 text-xs"
              : "app-button-ghost px-3 py-1 text-xs"
          }
        >
          Import backup
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImportFile}
        />
      </div>
      {status && <div className="text-xs text-gray-400">{status}</div>}
    </div>
  );
}
