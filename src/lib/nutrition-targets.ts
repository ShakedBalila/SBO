export type NutritionProfile = { age?: number | null; sex?: string | null; heightCm?: number | null; weightKg?: unknown; activityLevel?: string | null; weightGoal?: string | null };
const factors: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
/** Mifflin–St Jeor estimate; shared by persisted goals and dashboard reads. */
export function nutritionTargets(profile: NutritionProfile | null) {
  const weight = Number(profile?.weightKg);
  if (!profile?.age || !profile.heightCm || !weight || !['male', 'female'].includes(profile.sex ?? '') || !factors[profile.activityLevel ?? ''] || !['lose','maintain','gain'].includes(profile.weightGoal ?? '')) return null;
  const bmr = Math.round(10 * weight + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161));
  const tdee = Math.round(bmr * factors[profile.activityLevel!]);
  return { bmr, tdee, calorieGoal: Math.max(1, tdee + (profile.weightGoal === 'lose' ? -500 : profile.weightGoal === 'gain' ? 300 : 0)), proteinGoalG: Math.round(weight * (profile.weightGoal === 'gain' ? 1.8 : 1.6)) };
}
