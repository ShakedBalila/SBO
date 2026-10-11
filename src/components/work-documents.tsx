'use client';
import {useState,type ReactNode} from 'react';
const limit=10*1024*1024,chunkSize=1024*1024;
type Metadata={category:string;tripId?:string|null;entryId?:string|null;documentDate?:string|null;payslipMonth?:string|null};
async function json(response:Response){const value=await response.json();if(!response.ok)throw new Error(value.error??'לא ניתן לשמור מסמך.');return value;}
async function compress(file:File){
  if(file.size<2*chunkSize||!/^image\/(jpeg|png|webp)$/.test(file.type))return file;
  try{const bitmap=await createImageBitmap(file),scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
    const context=canvas.getContext('2d');if(!context){bitmap.close();return file;}context.fillStyle='white';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',0.88));
    return blob&&blob.size<file.size?new File([blob],file.name.replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'}):file;
  }catch{return file;}
}
export async function uploadWorkDocument(original:File,metadata:Metadata){
  if(!original.size||original.size>limit)throw new Error('יש לבחור PDF או תמונה עד 10 MB.');
  const file=await compress(original),result=await json(await fetch('/api/work/documents/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...metadata,name:file.name,size:file.size,mimeType:file.type})}));
  try{for(let offset=0;offset<file.size;offset+=chunkSize){const form=new FormData();form.set('chunk',file.slice(offset,offset+chunkSize));form.set('offset',String(offset));await json(await fetch(`/api/work/documents/${result.id}`,{method:'PATCH',body:form}));}return result.id as string;}
  catch(error){await fetch(`/api/work/documents/${result.id}`,{method:'DELETE'}).catch(()=>{});throw error;}
}
export function PrivateDocumentLink({id,children,download=false,name='מסמך',label,className}:{id:string;children:ReactNode;download?:boolean;name?:string;label?:string;className?:string}){
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  return <><a href={`/api/work/documents/${id}`} className={className} aria-label={label} aria-disabled={busy} onClick={async event=>{
    event.preventDefault();if(busy)return;setBusy(true);setError('');const preview=download?null:window.open('about:blank','_blank');if(preview)preview.opener=null;
    try{const parts:Blob[]=[];let offset=0,total=Infinity,mime='application/octet-stream';
      while(offset<total){const response=await fetch(`/api/work/documents/${id}`,{headers:{Range:`bytes=${offset}-${offset+chunkSize-1}`}});if(!response.ok)throw new Error('לא ניתן לטעון את המסמך.');mime=response.headers.get('Content-Type')??mime;const part=await response.blob();parts.push(part);const match=response.headers.get('Content-Range')?.match(/\/(\d+)$/);total=match?Number(match[1]):part.size;offset+=part.size;if(!part.size)throw new Error('המסמך ריק.');}
      const url=URL.createObjectURL(new Blob(parts,{type:mime}));if(download){const anchor=document.createElement('a');anchor.href=url;anchor.download=name;anchor.click();}else if(preview)preview.location.href=url;else window.location.assign(url);window.setTimeout(()=>URL.revokeObjectURL(url),300000);
    }catch(error){preview?.close();setError(error instanceof Error?error.message:'לא ניתן לפתוח מסמך.');}finally{setBusy(false);}
  }}>{busy?'טוען…':children}</a>{error&&<small role="alert">{error}</small>}</>;
}
