import ministryFoods from '@/data/moh-foods.json';

export type NutritionFood = {
  id: string;
  name: string;
  brand?: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  source: string;
  favorite?: boolean;
  useCount?: number;
  lastUsedAt?: string | null;
  barcode?: string;
  servingName?: string;
  servingGrams?: number;
  lastQuantity?: number | null;
  lastUnit?: 'grams' | 'servings' | null;
};

type MinistryFood = Omit<NutritionFood,'source'> & { aliases?: string[] };

export function normalizeFoodText(value: string) {
  return value.toLocaleLowerCase('he-IL').normalize('NFKD').replace(/[\u0591-\u05c7]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

export function searchMinistryFoods(query: string, limit = 20): NutritionFood[] {
  const needle = normalizeFoodText(query);
  if (needle.length < 2) return [];
  return (ministryFoods as MinistryFood[])
    .flatMap(food => {
      const name = normalizeFoodText(food.name);
      const aliases = (food.aliases ?? []).map(normalizeFoodText);
      const exact = name === needle ? 0 : name.startsWith(needle) ? 1 : name.includes(needle) ? 2 : aliases.some(alias => alias.startsWith(needle)) ? 3 : aliases.some(alias => alias.includes(needle)) ? 4 : -1;
      return exact < 0 ? [] : [{ food, exact }];
    })
    .sort((a, b) => a.exact - b.exact || a.food.name.length - b.food.name.length)
    .slice(0, limit)
    .map(({ food }) => ({ ...food, source: 'משרד הבריאות' }));
}
