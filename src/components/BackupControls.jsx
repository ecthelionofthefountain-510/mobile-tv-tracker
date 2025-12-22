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

      setStatus("Backup exported ✅");
    } catch (e) {
      console.error(e);
      setStatus("Export failed ❌");
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
          setStatus("Invalid file: expected an array ❌");
          return;
        }

        await saveWatchedAll(parsed);

        if (onRestore) {
          await onRestore();
        }

        setStatus("Backup imported ✅");
      } catch (err) {
        console.error(err);
        setStatus("Import failed ❌");
      } finally {
        e.target.value = "";
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="p-3 mt-8 space-y-2 text-sm text-gray-300 border border-gray-800 rounded-lg bg-gray-900/80">
      <div className="font-semibold text-yellow-400">Backup & restore</div>
      <p className="text-xs text-gray-400">
        Exporterar / importerar hela din "watched"-lista som en JSON-fil.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleExport}
          className="px-3 py-1 text-xs font-semibold text-gray-900 transition bg-yellow-500 rounded hover:bg-yellow-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
        >
          Export backup
        </button>
        <button
          type="button"
          onClick={handleImportClick}
          className="px-3 py-1 text-xs text-gray-100 transition bg-gray-700 rounded hover:bg-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
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
