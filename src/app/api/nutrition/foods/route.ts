import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { apiError, checkOrigin, HttpError, jsonBody } from '@/lib/http';

const foodInput = z.object({
  name: z.string().trim().min(1, 'יש להזין שם מזון.').max(200),
  brand: z.string().trim().max(120).default(''),
  caloriesPer100: z.number().int().min(0).max(10000),
  proteinPer100G: z.number().min(0).max(1000),
  carbsPer100G: z.number().min(0).max(1000),
  fatPer100G: z.number().min(0).max(1000),
  barcode: z.string().trim().regex(/^$|^\d{8,14}$/, 'הברקוד אינו תקין.').default('')
}).strict();

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const user = await currentUser();
    if (!user) throw new HttpError(401, 'יש להתחבר מחדש.');
    const data = foodInput.parse(await jsonBody(request));
    const food = await db.userFood.create({ data: { ...data, userId: user.id } });
    return NextResponse.json({ food: { id: `user:${food.id}`, name: food.name, brand: food.brand, calories: food.caloriesPer100, proteinG: Number(food.proteinPer100G), carbsG: Number(food.carbsPer100G), fatG: Number(food.fatPer100G), barcode: food.barcode, source: 'המאגר האישי שלי' } }, { status: 201 });
  } catch (error) { return apiError(error); }
}
