export interface LotEntry {
  lot: string;
  espece: string;
  T: string;
  Q: string;
  qteKg: string;
  prixKg: string;
  valeur: number;
  bateau: string;
}

export interface DocInfo {
  date?: string;
  numero?: string;
  acheteur?: string;
  totalBrut?: number;
  taxesPrestations?: number;
  tva?: number;
  montantNet?: number;
}

// Lettres majuscules françaises
const CAPS = "A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ";

export function extractDocInfo(text: string): DocInfo {
  const info: DocInfo = {};

  const dateMatch = text.match(/Date\s*:?\s*(\d{2}\/\d{2}\/\d{4})/);
  if (dateMatch) info.date = dateMatch[1];

  const numMatch = text.match(/N°\s*pièce\s*:?\s*(\d+)/);
  if (numMatch) info.numero = numMatch[1];

  const acheteurMatch = text.match(/Acheteur\s*:?\s*\d+\s+([A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ\s]+?)(?:\n|$)/);
  if (acheteurMatch) info.acheteur = acheteurMatch[1].trim();

  // Totaux financiers — on cherche la ligne "X,XX Y,XX Z,XX MONTANT NET W,XX €"
  // ou les valeurs réparties sur plusieurs lignes selon l'extraction PDF
  const netMatch = text.match(/MONTANT\s+NET\s+([\d\s]+,\d{2})\s*€/);
  if (netMatch) info.montantNet = parseNum(netMatch[1]);

  // Les 3 valeurs avant MONTANT NET : brut, taxes, tva
  const totauxMatch = text.match(
    /([\d\s]+,\d{2})\s+([\d\s]+,\d{2})\s+([\d\s]+,\d{2})\s+MONTANT\s+NET/
  );
  if (totauxMatch) {
    info.totalBrut        = parseNum(totauxMatch[1]);
    info.taxesPrestations = parseNum(totauxMatch[2]);
    info.tva              = parseNum(totauxMatch[3]);
  } else {
    // Fallback : extraction indépendante
    const brutMatch = text.match(/Totaux\s+Brut[\s\S]{0,200}?([\d]{3,}[,\d]+)/);
    if (brutMatch) info.totalBrut = parseNum(brutMatch[1]);

    const taxesMatch = text.match(/Total\s+Concession\s+([\d\s]+,\d{2})/);
    if (taxesMatch) info.taxesPrestations = parseNum(taxesMatch[1]);

    const tvaLineMatch = text.match(/T\.V\.A\.\s+20[^\n]*?([\d,]+)\s*$/m);
    if (tvaLineMatch) info.tva = parseNum(tvaLineMatch[1]);
  }

  return info;
}

function parseNum(s: string): number {
  return parseFloat(s.replace(/\s/g, "").replace(",", ".")) || 0;
}

export function parseText(rawText: string): LotEntry[] {
  const lines = rawText.split("\n").map((l) => l.trim()).filter(Boolean);

  // Détection stratégie : si on trouve des lignes commençant par lot + espèce → line-based
  const LOT_LINE_RE = new RegExp(`^\\d{4,5}\\s+[${CAPS}]`);
  const lineBasedCount = lines.filter((l) => LOT_LINE_RE.test(l)).length;

  if (lineBasedCount >= 3) {
    return parseLineBased(lines);
  }

  return parseColumnBased(lines);
}

function parseLineBased(lines: string[]): LotEntry[] {
  const entries: LotEntry[] = [];

  for (const line of lines) {
    const entry = parseSingleLine(line);
    if (entry) entries.push(entry);
  }

  return entries;
}

function parseSingleLine(line: string): LotEntry | null {
  // Numéro de lot : 4-5 chiffres en début de ligne
  const lotMatch = line.match(/^(\d{4,5})\s+/);
  if (!lotMatch) return null;

  const afterLot = line.slice(lotMatch[0].length);

  // Espèce : mots en majuscules jusqu'au premier chiffre isolé
  const especeMatch = afterLot.match(
    new RegExp(`^([${CAPS}][${CAPS}\\s]+?)\\s+(?=\\d)`)
  );
  if (!especeMatch) return null;

  const espece = especeMatch[1].trim();
  const afterEspece = afterLot.slice(especeMatch[0].length);

  // Structure après espèce :
  // {T(num)} {entiers...} {E|A} {qte,xx} {prix,xx} {valeur,xx} {nb} {G|C|V|X} {BATEAU} {commentaire}
  const mainMatch = afterEspece.match(
    new RegExp(
      `^(\\d+)` +                               // T (calibre)
      `(?:\\s+\\d+)*` +                         // colonnes P, extra... (ignorées)
      `\\s+([EA])` +                            // Q = présentation (E ou A)
      `\\s+([\\d,]+)` +                         // Qte/Kg
      `\\s+([\\d,]+)` +                         // Prix/Kg
      `\\s+([\\d,]+)` +                         // Valeur
      `\\s+\\d+` +                              // Nb.cdt (ignoré)
      `\\s+[GCVX]` +                            // T.cdt type (ignoré)
      `\\s+([${CAPS}][${CAPS}\\sI]*?)` +        // Bateau (majuscules, sans chiffres)
      `(?=\\s*[.\\d-]|\\s*$)`                   // stop avant chiffre ou point
    )
  );

  if (!mainMatch) return null;

  return {
    lot: lotMatch[1],
    espece,
    T: mainMatch[1],
    Q: mainMatch[2],
    qteKg: mainMatch[3],
    prixKg: mainMatch[4],
    valeur: parseFloat(mainMatch[5].replace(",", ".")),
    bateau: mainMatch[6].trim(),
  };
}

function parseColumnBased(lines: string[]): LotEntry[] {
  // Les headers connus délimitent les colonnes dans le texte extrait
  const HEADERS = [
    "N° lot", "Espèce", "T", "P", "Q",
    "Qte Kg", "Prix/Kg", "Valeur", "Nb.cdt", "T.cdt", "Bateau", "Commentaire",
  ];

  // Trouver l'index de chaque header
  const positions: Record<string, number> = {};
  for (let i = 0; i < lines.length; i++) {
    if (HEADERS.includes(lines[i]) && !(lines[i] in positions)) {
      positions[lines[i]] = i;
    }
  }

  if (!("N° lot" in positions) || !("Espèce" in positions)) return [];

  function extractCol(from: string, to: string): string[] {
    const start = positions[from];
    const end = positions[to];
    if (start === undefined || end === undefined || end <= start) return [];
    return lines.slice(start + 1, end).filter((l) => l.length > 0);
  }

  const lots = extractCol("N° lot", "Espèce");
  const especes = extractCol("Espèce", "T");
  const tVals = extractCol("T", "P");
  const qVals = extractCol("Q", "Qte Kg");
  const qteKgs = extractCol("Qte Kg", "Prix/Kg");
  const prixKgs = extractCol("Prix/Kg", "Valeur");
  const valeurs = extractCol("Valeur", "Nb.cdt");
  const bateaux = extractCol("Bateau", "Commentaire");

  const count = Math.min(lots.length, especes.length, valeurs.length);
  const entries: LotEntry[] = [];

  for (let i = 0; i < count; i++) {
    const valStr = (valeurs[i] ?? "0").replace(",", ".");
    entries.push({
      lot: lots[i] ?? "",
      espece: especes[i] ?? "",
      T: tVals[i] ?? "",
      Q: qVals[i] ?? "",
      qteKg: qteKgs[i] ?? "",
      prixKg: prixKgs[i] ?? "",
      valeur: parseFloat(valStr) || 0,
      bateau: (bateaux[i] ?? "").trim(),
    });
  }

  return entries.filter((e) => e.lot && e.espece);
}
