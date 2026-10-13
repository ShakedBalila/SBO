import {db} from '@/lib/db';

type AuditInput={userId:string;action:string;outcome?:'SUCCESS'|'FAILURE';entityType?:string;entityId?:string;sessionId?:string;changedFields?:string[];metadata?:Record<string,string|number|boolean|null>};

export async function audit(input:AuditInput){
  try{
    await db.auditEvent.create({data:{...input,changedFields:input.changedFields??[]}});
  }catch(error){
    console.error('SBO audit write failed',error instanceof Error?error.name:'Unknown');
  }
}

