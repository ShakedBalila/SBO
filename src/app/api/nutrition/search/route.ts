import {NextResponse} from 'next/server';
import {currentUser} from '@/lib/auth';
import {lookupFoods} from '@/lib/food-lookup';
export async function GET(request:Request){const user=await currentUser();if(!user)return NextResponse.json({error:'נדרשת התחברות.'},{status:401});return NextResponse.json(await lookupFoods(user.id,new URL(request.url).searchParams.get('q')??''));}
