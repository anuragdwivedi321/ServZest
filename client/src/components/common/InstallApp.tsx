'use client';
import { useEffect, useState } from 'react';
import { Download, Smartphone } from 'lucide-react';
interface InstallPrompt extends Event { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> }
export function InstallApp() {
 const [prompt,setPrompt]=useState<InstallPrompt|null>(null),[installed,setInstalled]=useState(false),[help,setHelp]=useState(false);
 useEffect(()=>{setInstalled(window.matchMedia('(display-mode: standalone)').matches); const ready=(event:Event)=>{event.preventDefault();setPrompt(event as InstallPrompt)};const done=()=>{setInstalled(true);setPrompt(null)};window.addEventListener('beforeinstallprompt',ready);window.addEventListener('appinstalled',done);return()=>{window.removeEventListener('beforeinstallprompt',ready);window.removeEventListener('appinstalled',done)}},[]);
 if(installed)return null;
 return <section className="install-card"><Smartphone size={27}/><div><h2>A little closer to home.</h2><p>Add ServZest to your home screen for easy access.</p><button className="secondary-action" onClick={async()=>{if(!prompt){setHelp(!help);return}await prompt.prompt();await prompt.userChoice;setPrompt(null)}}><Download size={16}/>Install ServZest</button>{help&&<p role="status">On iPhone: Safari → Share → Add to Home Screen. On Android: browser menu → Install app / Add to Home screen. Installation depends on browser support and a secure HTTPS connection.</p>}</div></section>;
}
