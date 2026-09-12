import type { MetadataRoute } from 'next';
export default function manifest():MetadataRoute.Manifest{return {name:'SBO',short_name:'SBO',description:'סביבת העבודה האישית שלך',start_url:'/',display:'standalone',background_color:'#0d1320',theme_color:'#0d1320',lang:'he',dir:'rtl',icons:[{src:'/favicon.svg',sizes:'any',type:'image/svg+xml'}]};}
