// src/components/BackupControls.jsx
import React, { useRef, useState } from "react";
import { loadWatchedAll, saveWatchedAll } from "../utils/watchedStorage";

export default function BackupControls({ onRestore }) {
  const fileInputRef = useRef(null);
  const [status, setStatus] = useState("");

  const handleExport = async () => {
    try {
      const data = await loadWatchedAll();
      const json = JSON.stringify(data, null, 2);

      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = `watched-backup-${new Date()
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

        if (!Array.isArray(parsed)) {
          setStatus("Invalid file: expected an array ×");
          return;
        }

        await saveWatchedAll(parsed);

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
    <div className="app-panel p-4 mt-8 space-y-2 text-sm text-gray-300">
      <div className="font-semibold text-yellow-400">Backup & restore</div>
      <p className="text-xs text-gray-400">
        Exporterar / importerar hela din "watched"-lista som en JSON-fil.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="app-button-primary px-3 py-1 text-xs"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="app-button-ghost px-3 py-1 text-xs"
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
