export const TipeSuggestions: Record<string, string[]> = {
  Mobil: ['MPV', 'SUV', 'Sedan', 'Hatchback', 'Pickup', 'Minibus', 'Van', 'Truk'],
  Motor: ['Sport', 'Matic', 'Bebek', 'Trail'],
};

export function getTipeSuggestions(namaKategori?: string | null): string[] | null {
  if (!namaKategori) return null;
  const key = Object.keys(TipeSuggestions).find(
    (k) => k.toLowerCase() === namaKategori.trim().toLowerCase()
  );
  return key ? TipeSuggestions[key] : null;
}

export function placeholderTipe(namaKategori?: string | null): string {
  const s = getTipeSuggestions(namaKategori);
  return s ? `Contoh: ${s.slice(0, 3).join(', ')}` : 'Contoh: MPV, SUV, Matic, Bebek';
}
