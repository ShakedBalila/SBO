"use client";
import Link,{useLinkStatus} from 'next/link';
import type {ComponentProps} from 'react';
import {createPortal} from 'react-dom';
import ModuleLoading from './module-loading';
function PendingScene(){const {pending}=useLinkStatus();return pending?createPortal(<ModuleLoading/>,document.body):null;}
export function TransitionLink({children,...props}:ComponentProps<typeof Link>){
 return <Link {...props}>{children}<PendingScene/></Link>;
}
