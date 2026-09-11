// This is a stable price-list page, so the same URL continues to work after the
// monthly regulated price changes. The dashboard caches a successful lookup for
// six hours and keeps the last verified price as an explicit offline fallback.
const SOURCE_URL = 'https://www.doralon.co.il/fuels-price/';
const FALLBACK_PRICE = 7.75;
export async function getIsraelFuelPrice() {
  try {
    const response = await fetch(SOURCE_URL, { next: { revalidate: 21600 }, headers: { 'User-Agent': 'SBO/0.1 local dashboard' }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('price source unavailable');
    const html = await response.text();
    const normalized = html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;|&quot;/g, ' ').replace(/\s+/g, ' ');
    const match = normalized.match(/בנזין\s*95[\s\S]{0,80}?שירות\s*עצמי[\s\S]{0,120}?(\d+[.,]\d{2})/);
    const price = Number(match?.[1]?.replace(',', '.'));
    if (!Number.isFinite(price) || price < 4 || price > 15) throw new Error('invalid fuel price');
    return { price, sourceUrl: SOURCE_URL, checkedAt: new Date().toISOString(), online: true };
  } catch {
    return { price: FALLBACK_PRICE, sourceUrl: SOURCE_URL, checkedAt: '2026-09-07T00:00:00.000Z', online: false };
  }
}
