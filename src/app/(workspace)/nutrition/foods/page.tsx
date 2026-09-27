import {requireUser} from '@/lib/auth';
import {db} from '@/lib/db';
import {PersonalFoodsWorkspace} from '@/components/personal-foods-workspace';
export default async function PersonalFoodsPage(){const user=await requireUser();const foods=await db.userFood.findMany({where:{userId:user.id},orderBy:{updatedAt:'desc'},take:500});return <PersonalFoodsWorkspace foods={foods.map(food=>({id:food.id,name:food.name,brand:food.brand,barcode:food.barcode,servingName:food.servingName,servingGrams:Number(food.servingGrams),calories:Number(food.caloriesPer100),proteinG:Number(food.proteinPer100G),carbsG:Number(food.carbsPer100G),fatG:Number(food.fatPer100G)}))}/>;}
