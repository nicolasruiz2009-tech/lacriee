"use client";

import { useState, useRef } from "react";
import FishTable from "@/components/FishTable";
import type { LotEntry, DocInfo } from "@/lib/parser";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<LotEntry[]>([]);
  const [info, setInfo] = useState<DocInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      setData([]);
      setError(null);
      setInfo(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.type === "application/pdf") {
      setFile(f);
      setData([]);
      setError(null);
      setInfo(null);
    }
  };

  const handleParse = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    try {
      // Extraction et parsing entièrement côté client
      const { extractTextFromPDF } = await import("@/lib/pdfExtract");
      const { parseText, extractDocInfo } = await import("@/lib/parser");

      const rawText = await extractTextFromPDF(file);
      const lots = parseText(rawText);
      const docInfo = extractDocInfo(rawText);

      setData(lots);
      setInfo(docInfo);

      if (lots.length === 0) {
        // Debug : afficher le texte brut dans la console pour ajuster le parser
        console.log("=== TEXTE BRUT EXTRAIT ===\n", rawText);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Zone upload */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 flex flex-col items-center gap-5">
        <div
          className="w-full max-w-xl border-2 border-dashed border-blue-300 rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <svg className="w-14 h-14 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>

          {file ? (
            <div className="text-center">
              <p className="font-semibold text-slate-700">{file.name}</p>
              <p className="text-xs text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} Ko · Cliquez pour changer</p>
            </div>
          ) : (
            <div className="text-center">
              <p className="font-medium text-slate-600">Cliquez ou déposez un PDF ici</p>
              <p className="text-xs text-slate-400 mt-1">Relevé d&apos;achats de criée</p>
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFile}
          />
        </div>

        <button
          onClick={handleParse}
          disabled={!file || loading}
          className="px-10 py-3 bg-blue-800 text-white rounded-xl font-bold text-lg hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyse…
            </span>
          ) : "GO"}
        </button>
      </div>

      {/* Erreur */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* Infos document */}
      {info && (info.date || info.numero || info.acheteur) && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-3 flex flex-wrap gap-6 text-sm text-slate-600">
          {info.date && <span><span className="font-semibold text-slate-800">Date :</span> {info.date}</span>}
          {info.numero && <span><span className="font-semibold text-slate-800">N° pièce :</span> {info.numero}</span>}
          {info.acheteur && <span><span className="font-semibold text-slate-800">Acheteur :</span> {info.acheteur}</span>}
        </div>
      )}

      {/* Tableau */}
      {data.length > 0 && <FishTable data={data} info={info} />}

      {/* Message si 0 lots trouvés après parsing */}
      {!loading && data.length === 0 && info && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-xl p-4 text-sm">
          Aucun lot extrait. Ouvre la console (F12) pour voir le texte brut extrait et ajuster le parser.
        </div>
      )}
    </div>
  );
}
