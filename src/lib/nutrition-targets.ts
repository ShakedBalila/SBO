export type NutritionProfile = { age?: number | null; sex?: string | null; heightCm?: number | null; weightKg?: unknown; weeklyWorkouts?: number | null; weightGoal?: string | null };
const factors = [1.2, 1.3, 1.4, 1.5, 1.6, 1.7] as const;
/** Mifflin–St Jeor estimate; shared by persisted goals and dashboard reads. */
export function nutritionTargets(profile: NutritionProfile | null) {
  const weight = Number(profile?.weightKg);
  if (!profile?.age || !profile.heightCm || !weight || !['male', 'female'].includes(profile.sex ?? '') || !Number.isInteger(profile.weeklyWorkouts) || profile.weeklyWorkouts! < 0 || profile.weeklyWorkouts! > 5 || !['lose','maintain','gain'].includes(profile.weightGoal ?? '')) return null;
  const bmr = Math.round(10 * weight + 6.25 * profile.heightCm - 5 * profile.age + (profile.sex === 'male' ? 5 : -161));
  const tdee = Math.round(bmr * factors[profile.weeklyWorkouts!]);
  return { bmr, tdee, calorieGoal: Math.max(1, tdee + (profile.weightGoal === 'lose' ? -500 : profile.weightGoal === 'gain' ? 300 : 0)), proteinGoalG: Math.round(weight * (profile.weightGoal === 'gain' ? 1.8 : 1.6)) };
}
