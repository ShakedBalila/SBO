import type { SVGProps } from "react";

export function WaterBottleIcon({width,height,size=24,...props}: SVGProps<SVGSVGElement> & {size?:number|string}) {
  return <svg viewBox="0 0 32 32" width={width??size} height={height??size} fill="none" aria-hidden="true" {...props}>
    <path d="M12 3.5h8v4l2.7 3.7c.85 1.17 1.3 2.58 1.3 4.03V26a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V15.23c0-1.45.45-2.86 1.3-4.03L12 7.5v-4Z" fill="currentColor" opacity=".2"/>
    <path d="M12 7.5h8m-8-4h8v4l2.7 3.7c.85 1.17 1.3 2.58 1.3 4.03V26a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3V15.23c0-1.45.45-2.86 1.3-4.03L12 7.5v-4Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M8.8 18.5c2.4-1.4 4.8 1.4 7.2 0s4.8 1.4 7.2 0V26a2.2 2.2 0 0 1-2.2 2.2H11A2.2 2.2 0 0 1 8.8 26v-7.5Z" fill="currentColor" opacity=".72"/>
    <path d="M13 3.5V2h6v1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>;
}
