import {expect,type APIRequestContext} from '@playwright/test';
export async function confirmLatestFuel(request:APIRequestContext,vehicleId:string,distance:number,source='TRIP_A'){
 const data=await (await request.get('/api/data/export')).json();const rows=data.fuel.filter((row:{vehicleId:string;isFullTank:boolean})=>row.vehicleId===vehicleId&&row.isFullTank).sort((a:{date:string;createdAt:string;id:string},b:typeof a)=>a.date.localeCompare(b.date)||a.createdAt.localeCompare(b.createdAt)||a.id.localeCompare(b.id));const entry=rows.at(-1),start=rows.at(-2);
 const response=await request.patch(`/api/modules/fuel-distance/${entry.id}`,{headers:{Origin:'http://localhost:3000'},data:{startRefuelId:start.id,source,actualDistanceKm:distance,confirmed:true}});expect(response.ok(),await response.text()).toBeTruthy();
}
