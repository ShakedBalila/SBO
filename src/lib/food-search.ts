import swissFoods from '@/data/swiss-foods.json';
import { normalizeFoodText, type NutritionFood } from './nutrition-foods';

const swissTerms: Record<string, string> = {
  banana: 'banane', apple: 'apfel', rice: 'reis', chicken: 'poulet',
  'chicken breast': 'poulet brust', egg: 'ei', tuna: 'thunfisch', salmon: 'lachs',
  potato: 'kartoffel', bread: 'brot', cheese: 'käse', yogurt: 'joghurt',
  avocado: 'avocado', beef: 'rind', pasta: 'teigwaren', milk: 'milch',
};

export function searchSwissFoods(query: string, limit = 12): NutritionFood[] {
  const normalized = normalizeFoodText(query);
  const terms = normalizeFoodText(swissTerms[normalized] ?? normalized).split(' ');
  if (normalized.length < 2) return [];
  return swissFoods.filter(food => terms.every(term => normalizeFoodText(food.name).includes(term)))
    .slice(0, limit).map(food => ({ ...food, source: 'Swiss FSVO · 7.1' }));
}

export function mergeFoodResults(foods: NutritionFood[], limit = 48): NutritionFood[] {
  const priority = (food: NutritionFood) => food.source === 'המאגר האישי שלי' ? 0
    : food.source === 'משרד הבריאות' ? 1
    : food.source.startsWith('Open Food Facts') && (food.source.endsWith(' IL') || /[\u0590-\u05ff]/.test(food.name)) ? 2 : 3;
  const seen = new Set<string>();
  return [...foods].sort((a, b) => priority(a) - priority(b)
    || Number(Boolean(b.favorite)) - Number(Boolean(a.favorite))
    || (b.useCount ?? 0) - (a.useCount ?? 0)).filter(food => {
      const keys = [`name:${normalizeFoodText(food.name)}|${food.calories}|${food.proteinG}|${food.carbsG}|${food.fatG}`];
      if (food.barcode) keys.push(`barcode:${food.barcode}`);
      if (keys.some(key => seen.has(key))) return false;
      keys.forEach(key => seen.add(key));
      return true;
    }).slice(0, limit);
}
