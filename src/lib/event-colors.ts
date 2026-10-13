import type {CSSProperties} from 'react';
export function normalizeEventColor(value:string){return /^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():'#4f7cff';}
export function eventForeground(value:string){const color=normalizeEventColor(value),rgb=[1,3,5].map(index=>parseInt(color.slice(index,index+2),16)/255).map(channel=>channel<=.03928?channel/12.92:((channel+.055)/1.055)**2.4),luminance=.2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];return luminance>.45?'#071722':'#ffffff';}
export function eventChipStyle(value:string){const color=normalizeEventColor(value);return {'--event-color':color,'--event-foreground':eventForeground(color)} as CSSProperties;}
