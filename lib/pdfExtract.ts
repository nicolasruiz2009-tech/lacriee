// Extraction PDF côté client avec pdfjs-dist
// Groupe les items par position Y pour reconstituer les lignes

export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");

  // Worker servi localement (évite les problèmes CDN sur mobile)
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

  let fullText = "";

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    // Grouper les items par position Y (même ligne = même Y arrondi)
    const lineMap = new Map<number, { x: number; str: string }[]>();

    for (const item of textContent.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      // transform[5] = Y, transform[4] = X
      const y = Math.round((item as { transform: number[] }).transform[5]);
      const x = Math.round((item as { transform: number[] }).transform[4]);
      if (!lineMap.has(y)) lineMap.set(y, []);
      lineMap.get(y)!.push({ x, str: item.str });
    }

    // Trier les lignes de haut en bas (Y décroissant en coordonnées PDF)
    const sortedYs = Array.from(lineMap.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      // Trier les items de gauche à droite sur chaque ligne
      const items = lineMap.get(y)!.sort((a, b) => a.x - b.x);
      fullText += items.map((i) => i.str).join(" ").trim() + "\n";
    }

    fullText += "\n"; // Séparateur entre pages
  }

  return fullText;
}
