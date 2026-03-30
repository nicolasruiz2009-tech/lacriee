"use client";

import { useMemo } from "react";
import type { LotEntry, DocInfo } from "@/lib/parser";

interface FishTableProps {
  data: LotEntry[];
  info: DocInfo | null;
}

function parseKg(s: string): number {
  return parseFloat(s.replace(",", ".")) || 0;
}

export default function FishTable({ data, info }: FishTableProps) {
  const grouped = useMemo(() => {
    const map = new Map<string, LotEntry[]>();
    for (const entry of data) {
      const list = map.get(entry.espece) ?? [];
      list.push(entry);
      map.set(entry.espece, list);
    }
    return map;
  }, [data]);

  const totalValeur = data.reduce((sum, e) => sum + e.valeur, 0);

  const handleExport = async () => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("La Criée de tonton", doc.internal.pageSize.width / 2, 16, { align: "center" });

    let y = 26;
    for (const [espece, lots] of grouped) {
      if (y > 180) { doc.addPage(); y = 16; }
      const sommeKg = lots.reduce((s, l) => s + parseKg(l.qteKg), 0);
      const sousTotal = lots.reduce((s, l) => s + l.valeur, 0);
      const prixMoyen = sommeKg > 0 ? sousTotal / sommeKg : 0;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(`${espece}  —  ${sommeKg.toFixed(2)} kg  |  moy. ${prixMoyen.toFixed(2)} €/kg  |  ${sousTotal.toFixed(2)} €`, 14, y);
      doc.setFont("helvetica", "normal");

      autoTable(doc, {
        startY: y + 2,
        head: [["N°lot", "T", "Q", "Qte/Kg", "Prix/Kg", "Valeur (€)", "Bateau"]],
        body: lots.map((l) => [l.lot, l.T, l.Q, l.qteKg, l.prixKg, l.valeur.toFixed(2), l.bateau]),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [30, 58, 138], fontSize: 8 },
        alternateRowStyles: { fillColor: [241, 245, 249] },
        margin: { left: 14, right: 14 },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      y = (doc as any).lastAutoTable.finalY + 10;
    }
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(`Total général : ${totalValeur.toFixed(2)} €`, 14, y);
    doc.save("criee-export.pdf");
  };

  return (
    <div className="space-y-4">
      {/* Barre résumé financier + export */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-5 py-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex flex-col">
              <span className="text-xs text-slate-400 uppercase tracking-wide">Lots</span>
              <span className="font-semibold text-slate-800">
                {data.length} · {(info?.totalBrut ?? totalValeur).toFixed(2)} €
              </span>
            </div>
            {info?.taxesPrestations !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Taxes & Prestations</span>
                <span className="font-semibold text-slate-800">{info.taxesPrestations.toFixed(2)} €</span>
              </div>
            )}
            {info?.tva !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide">TVA</span>
                <span className="font-semibold text-slate-800">{info.tva.toFixed(2)} €</span>
              </div>
            )}
            {info?.montantNet !== undefined && (
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 uppercase tracking-wide">Montant net</span>
                <span className="text-lg font-bold text-blue-900">{info.montantNet.toFixed(2)} €</span>
              </div>
            )}
          </div>
          <button
            onClick={handleExport}
            className="px-5 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-sm whitespace-nowrap"
          >
            Exporter PDF
          </button>
        </div>
      </div>

      {/* Tableaux par espèce */}
      {Array.from(grouped.entries()).map(([espece, lots]) => {
        const coef      = 2.00;
        const sommeKg   = lots.reduce((s, l) => s + parseKg(l.qteKg), 0);
        const sousTotal = lots.reduce((s, l) => s + l.valeur, 0);
        const prixMoyen = sommeKg > 0 ? sousTotal / sommeKg : 0;
        const totalVenteTTC = sousTotal * coef;

        return (
          <div key={espece} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {/* En-tête espèce avec stats */}
            <div className="bg-blue-900 text-white px-4 py-2 flex flex-wrap justify-between items-center gap-2">
              <span className="font-semibold tracking-wide">{espece}</span>
              <div className="flex flex-wrap gap-4 text-sm text-blue-100">
                <span>{lots.length} lot{lots.length > 1 ? "s" : ""}</span>
                <span>·</span>
                <span>{sommeKg.toFixed(2)} kg</span>
                <span>·</span>
                <span>moy. {prixMoyen.toFixed(2)} €/kg</span>
                <span>·</span>
                <span className="font-semibold text-white">{sousTotal.toFixed(2)} €</span>
                <span>·</span>
                <span>x{coef.toFixed(2)}</span>
                <span>·</span>
                <span className="font-semibold text-green-300">{totalVenteTTC.toFixed(2)} €</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <colgroup>
                  <col className="w-20" />  {/* N°lot */}
                  <col className="w-12" />  {/* T */}
                  <col className="w-12" />  {/* Q */}
                  <col className="w-24" />  {/* Qte/Kg */}
                  <col className="w-24" />  {/* Prix/Kg */}
                  <col className="w-28" />  {/* Valeur */}
                  <col className="w-16" />  {/* Coef */}
                  <col className="w-32" />  {/* Prix Vente TTC */}
                  <col className="w-32" />  {/* Bateau */}
                </colgroup>
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">N°lot</th>
                    <th className="px-3 py-2 text-center font-medium">T</th>
                    <th className="px-3 py-2 text-center font-medium">Q</th>
                    <th className="px-3 py-2 text-right font-medium">Qte/Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Prix/Kg</th>
                    <th className="px-3 py-2 text-right font-medium">Valeur</th>
                    <th className="px-3 py-2 text-center font-medium">Coef</th>
                    <th className="px-3 py-2 text-right font-medium">Prix Vente TTC</th>
                    <th className="px-3 py-2 text-left font-medium">Bateau</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot, i) => {
                    const coef = 2.00;
                    const prixVenteTTC = lot.valeur * coef;
                    return (
                    <tr key={lot.lot} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                      <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{lot.lot}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{lot.T}</td>
                      <td className="px-3 py-2 text-center text-slate-600">{lot.Q}</td>
                      <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{lot.qteKg} kg</td>
                      <td className="px-3 py-2 text-right text-slate-700 whitespace-nowrap">{lot.prixKg} €</td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-800 whitespace-nowrap">{lot.valeur.toFixed(2)} €</td>
                      <td className="px-3 py-2 text-center text-slate-500">x{coef.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right font-semibold text-green-700 whitespace-nowrap">{prixVenteTTC.toFixed(2)} €</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{lot.bateau}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
