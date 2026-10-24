import type { ZodIssue } from 'zod';

const labels: Record<string, string> = {
  name:'שם',title:'כותרת',email:'כתובת אימייל',password:'סיסמה',currentPassword:'סיסמה נוכחית',newPassword:'סיסמה חדשה',
  firstName:'שם פרטי',lastName:'שם משפחה',phone:'טלפון',age:'גיל',heightCm:'גובה',weightKg:'משקל',weeklyWorkouts:'אימונים בשבוע',
  calorieGoal:'יעד קלוריות',proteinGoalG:'יעד חלבון',amountMl:'כמות מים',quantity:'כמות',amount:'סכום',date:'תאריך',startDate:'תאריך התחלה',endDate:'תאריך סיום',
  liters:'ליטרים שתודלקו',actualDistanceKm:'קילומטר בפועל',licensePlate:'לוחית רישוי',fuelTankLiters:'נפח מכל הדלק',vehicleId:'רכב',time:'שעה',notes:'הערות'
};

export function validationMessage(issue: ZodIssue): string {
  // Keep field-specific Hebrew messages, but never surface a validator's English internals.
  if (/[\u0590-\u05ff]/.test(issue.message)) return issue.message;
  const field=labels[String(issue.path.at(-1))]??'הנתון';
  switch(issue.code){
    case 'too_small': return issue.origin==='string'?`יש למלא את השדה ״${field}״.`:`הערך בשדה ״${field}״ נמוך מהמותר.`;
    case 'too_big': return issue.origin==='string'?`הטקסט בשדה ״${field}״ ארוך מדי.`:`הערך בשדה ״${field}״ גבוה מהמותר.`;
    case 'invalid_type': return issue.expected==='number'?`יש להזין מספר תקין בשדה ״${field}״.`:`יש למלא ערך תקין בשדה ״${field}״.`;
    case 'invalid_format': return `יש לבדוק את הפורמט של ״${field}״.`;
    case 'invalid_value': return `יש לבחור ערך תקין בשדה ״${field}״.`;
    default: return 'יש לבדוק את פרטי הטופס ולנסות שוב.';
  }
}
