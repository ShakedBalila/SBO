import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { apiError, HttpError } from '@/lib/http';

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    if (!await currentUser()) throw new HttpError(401, 'יש להתחבר מחדש.');
    const code = (await params).code.trim();
    if (!/^\d{8,14}$/.test(code)) throw new HttpError(400, 'הברקוד אינו תקין.');
    const fields = 'code,product_name,product_name_he,brands,serving_size,nutriments';
    const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=${fields}`, {
      headers: { 'User-Agent': 'SBO/1.0 (https://sbo-pi.vercel.app)' }, next: { revalidate: 86400 }
    });
    if (!response.ok) throw new HttpError(502, 'מאגר המוצרים אינו זמין כרגע.');
    const result = await response.json();
    if (result.status !== 1 || !result.product) throw new HttpError(404, 'המוצר לא נמצא. אפשר להזין אותו ידנית.');
    const product = result.product;
    const nutrient = (key: string) => Number(product.nutriments?.[key] ?? 0) || 0;
    return NextResponse.json({
      code,
      name: product.product_name_he || product.product_name || product.brands || `מוצר ${code}`,
      brand: product.brands || '', servingSize: product.serving_size || '',
      per100g: { calories: nutrient('energy-kcal_100g'), proteinG: nutrient('proteins_100g'), carbsG: nutrient('carbohydrates_100g'), fatG: nutrient('fat_100g') }
    });
  } catch (error) { return apiError(error); }
}
