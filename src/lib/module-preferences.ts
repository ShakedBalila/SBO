export const MODULES=[{id:'tasks',name:'זמן ומשימות',href:'/tasks'},{id:'work',name:'עבודה',href:'/work'},{id:'water',name:'מים',href:'/water'},{id:'nutrition',name:'תזונה',href:'/nutrition'},{id:'car',name:'רכב',href:'/car'},{id:'workouts',name:'אימונים',href:'/workouts'}] as const;
export type ModuleId=typeof MODULES[number]['id'];
export const moduleIds=MODULES.map(m=>m.id);
export function orderedModules(order:readonly string[]=[]){return [...new Set([...order,...moduleIds])].filter((id):id is ModuleId=>moduleIds.includes(id as ModuleId));}
export function visibleModules(settings:{modulePreferencesInitialized?:boolean;enabledModules?:string[]}|null|undefined):string[]{return settings?.modulePreferencesInitialized?settings.enabledModules??[]:[...moduleIds];}
export function navigationCapacity(width:number,labelWidth=60){return Math.max(0,Math.min(6,Math.floor(width/Math.max(44,labelWidth))-2));}
