"use client";
import { useEffect, useRef, useState } from 'react';
import { Camera, Search, X } from 'lucide-react';

type Product = { code:string; name:string; brand:string; servingSize:string; per100g:{calories:number;proteinG:number;carbsG:number;fatG:number} };
type Draft = Record<string, string | number | null>;

export function NutritionScanner({ today, onProduct }: { today:string; onProduct:(draft:Draft)=>void }) {
  const dialog=useRef<HTMLDialogElement>(null), video=useRef<HTMLVideoElement>(null), stream=useRef<MediaStream|null>(null);
  const [code,setCode]=useState(''), [quantity,setQuantity]=useState(100), [busy,setBusy]=useState(false), [error,setError]=useState(''), [camera,setCamera]=useState(false);
  function stop(){stream.current?.getTracks().forEach(track=>track.stop());stream.current=null;setCamera(false);}
  useEffect(()=>()=>stop(),[]);
  async function lookup(raw=code){
    setBusy(true);setError('');
    try{
      const response=await fetch(`/api/nutrition/barcode/${encodeURIComponent(raw)}`);const body=await response.json();
      if(!response.ok) throw new Error(body.error??'לא ניתן לזהות את המוצר.');
      const product=body as Product, factor=quantity/100;
      onProduct({name:product.name,meal:'Other',date:today,quantity,unit:'גרם',barcode:product.code,calories:Math.round(product.per100g.calories*factor),proteinG:Number((product.per100g.proteinG*factor).toFixed(1)),carbsG:Number((product.per100g.carbsG*factor).toFixed(1)),fatG:Number((product.per100g.fatG*factor).toFixed(1))});
      stop();dialog.current?.close();
    }catch(e){setError(e instanceof Error?e.message:'לא ניתן לזהות את המוצר.');}finally{setBusy(false);}
  }
  async function startCamera(){
    setError('');
    try{
      const Detector=(window as unknown as {BarcodeDetector?:new(opts:{formats:string[]})=>{detect:(source:HTMLVideoElement)=>Promise<{rawValue:string}[]>}}).BarcodeDetector;
      if(!Detector) throw new Error('הדפדפן הזה לא תומך בזיהוי ברקוד חי. אפשר להקליד את המספר.');
      setCamera(true); await new Promise(resolve=>setTimeout(resolve,0));
      stream.current=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}}});
      if(video.current){video.current.srcObject=stream.current;await video.current.play();}
      setCamera(true);const detector=new Detector({formats:['ean_13','ean_8','upc_a','upc_e']});
      const scan=async()=>{if(!stream.current||!video.current)return;try{const hits=await detector.detect(video.current);if(hits[0]){setCode(hits[0].rawValue);await lookup(hits[0].rawValue);return;}}catch{}requestAnimationFrame(scan);};requestAnimationFrame(scan);
    }catch(e){stop();setError(e instanceof Error?e.message:'לא ניתן לפתוח את המצלמה.');}
  }
  return <section className="scanner-panel"><div><Camera size={24}/><div><h2>סריקת מוצר</h2><p>סריקת ברקוד ומשיכת ערכים תזונתיים מ־Open Food Facts.</p></div></div><button className="button secondary" onClick={()=>dialog.current?.showModal()}><Camera size={17}/>פתיחת סורק</button>
    <dialog className="modal scanner-modal" ref={dialog} onClose={stop}><div className="modal-heading"><h2>סריקת ברקוד</h2><button className="icon-button" aria-label="סגירה" onClick={()=>dialog.current?.close()}><X size={20}/></button></div>
      <p className="module-hint">יש לאפשר גישה למצלמה. אפשר גם להקליד את המספר שמתחת לברקוד.</p>
      <video ref={video} className={`barcode-video ${camera?'':'hidden'}`} playsInline muted/><button className="button secondary full-button" type="button" onClick={startCamera} disabled={busy}><Camera size={17}/>סריקה באמצעות המצלמה</button>
      <label>מספר ברקוד<input inputMode="numeric" pattern="[0-9]{8,14}" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,''))}/></label>
      <label>כמות שאכלת (גרם)<input type="number" min="1" max="10000" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label>
      {error&&<p className="error-text" role="alert">{error}</p>}<button className="button primary full-button" disabled={busy||!/^[0-9]{8,14}$/.test(code)} onClick={()=>lookup()}><Search size={17}/>{busy?'מחפש…':'זיהוי והמשך'}</button>
    </dialog>
  </section>;
}
