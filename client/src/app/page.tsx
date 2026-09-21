'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, ArrowRight, Search, ShieldCheck, RefreshCw, MapPin, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { api } from '../lib/api';
const descriptions: Record<string,string> = { ac:'Cooling, servicing & repairs',plumber:'Leaks, taps & everyday fixes',electrician:'Safe repairs, thoughtfully handled',majdoor:'An extra pair of capable hands',mechanic:'Get things moving again' };
export default function HomePage(){
 const {language}=useLanguage(); const text=(en:string,hi:string)=>language==='hi'?hi:en;
 const [services,setServices]=useState<any[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[query,setQuery]=useState('');
 const load=useCallback(async()=>{setLoading(true);setError('');try{const result=await api.getServices();if(!result.success)throw Error();setServices(result.services);}catch{setError('Services could not load. Please try again.');}finally{setLoading(false);}},[]);
 useEffect(()=>{void load()},[load]);
 const filtered=services.filter(s=>`${s.nameEn} ${s.nameHi} ${s.slug} ${(s.items||[]).map((i:any)=>i.nameEn).join(' ')}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <div className="concierge-home">
  <section className="concierge-intro"><div><span className="concierge-eyebrow">{text('A LITTLE LESS TO WORRY ABOUT','घर की देखभाल, आसानी से')}</span><h1>{text('Love your home.','अपने घर से प्यार।')}<br/><em>{text('We’ll care for it.','देखभाल हम करेंगे।')}</em></h1><p>{text('For the things your home needs.','आपके घर की ज़रूरतों के लिए।')}<br/>{text('And the time you’d rather keep.','ताकि आपका समय आपका रहे।')}</p><a href="#services-grid" className="concierge-text-link">{text('Find your helping hand','अपनी सेवा चुनें')}<ArrowRight size={18}/></a></div><aside className="home-showcase" aria-label="A thoughtfully cared-for home">
 <span className="showcase-caption">THE ART OF EVERYDAY CARE</span>
 <svg viewBox="0 0 520 480" role="img" aria-label="Sunlit interior with an arched window, lounge chair and houseplant">
  <defs><linearGradient id="wall" x2="1" y2="1"><stop stopColor="#e9e0d0"/><stop offset="1" stopColor="#d3c4a8"/></linearGradient><linearGradient id="window" x2="0" y2="1"><stop stopColor="#bacab9"/><stop offset="1" stopColor="#f6f0d9"/></linearGradient><linearGradient id="seat" x2="1" y2="1"><stop stopColor="#6b7858"/><stop offset="1" stopColor="#354b35"/></linearGradient></defs>
  <rect width="520" height="480" fill="url(#wall)"/><path d="M0 365H520V480H0Z" fill="#c5b699"/>
  <path d="M61 346V152A98 98 0 0 1 257 152V346Z" fill="#a79c82"/><path d="M73 345V153A86 86 0 0 1 245 153V345Z" fill="url(#window)"/>
  <path d="M159 67V345M75 196H244" stroke="#ece5d5" strokeWidth="8"/><path d="M73 286Q110 250 159 279T245 271V345H73Z" fill="#a8b29a"/><path d="M73 319Q140 286 245 310V345H73Z" fill="#879777"/>
  <path d="M83 347L283 480H477L226 347Z" fill="#e8dec1" opacity=".65"/><path d="M159 347L341 480M73 396H330" stroke="#b7a787" strokeWidth="6" opacity=".45"/>
  <ellipse cx="304" cy="425" rx="149" ry="27" fill="#9a937b" opacity=".4"/>
  <path d="M229 376L217 436M364 371L380 431" stroke="#594d39" strokeWidth="9"/>
  <rect x="211" y="236" width="160" height="151" rx="48" fill="url(#seat)"/><path d="M229 337Q282 316 350 337V389H225Z" fill="#7a8968"/><rect x="194" y="320" width="38" height="82" rx="17" fill="#485e40"/><rect x="353" y="319" width="36" height="83" rx="17" fill="#40563b"/>
  <rect x="259" y="266" width="68" height="64" rx="13" fill="#e5d4ae" transform="rotate(12 293 298)"/><path d="M268 280L309 289M265 292L307 301" stroke="#c6ae83" strokeWidth="2"/>
  <path d="M395 354V168" stroke="#78684b" strokeWidth="5"/><path d="M349 174L365 126H425L442 174Z" fill="#f6eacd"/><ellipse cx="395" cy="174" rx="47" ry="7" fill="#bbaa84"/><ellipse cx="395" cy="358" rx="31" ry="6" fill="#78684b"/>
  <path d="M453 400V292" stroke="#62714b" strokeWidth="4"/><ellipse cx="437" cy="309" rx="13" ry="35" fill="#7b8a58" transform="rotate(-39 437 309)"/><ellipse cx="470" cy="283" rx="15" ry="38" fill="#536d43" transform="rotate(31 470 283)"/><ellipse cx="469" cy="329" rx="12" ry="30" fill="#8b9965" transform="rotate(40 469 329)"/><path d="M430 371H479L470 427H440Z" fill="#aa7758"/>
  <ellipse cx="128" cy="405" rx="53" ry="14" fill="#ecd9b7"/><path d="M100 414L92 450M157 414L165 450" stroke="#957757" strokeWidth="5"/><rect x="117" y="378" width="19" height="23" rx="5" fill="#f8f3e6"/><path d="M136 382Q150 382 143 393H136" fill="none" stroke="#f8f3e6" strokeWidth="4"/>
 </svg>
 <div className="showcase-badge"><ShieldCheck size={21}/><div><strong>{text('Home feels better, cared for.','देखभाल से घर बने बेहतर।')}</strong><span>{text('Leave the little fixes to us.','छोटी परेशानियाँ हम पर छोड़ें।')}</span></div></div>
 </aside></section>
  <section id="services-grid" className="concierge-catalog"><div className="concierge-catalog-head"><div><span className="concierge-eyebrow">{text('THE EVERYDAY ESSENTIALS','घर की ज़रूरी सेवाएँ')}</span><h2>{text('What needs attention?','किस काम में मदद चाहिए?')}</h2></div><label className="concierge-search"><Search size={18}/><input aria-label="Search services" placeholder={text('Find a service','सेवा खोजें')} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button type="button" aria-label="Clear search" onClick={()=>setQuery('')}>×</button>}</label></div>
  {loading&&<p role="status" className="concierge-empty">{text('Finding your home essentials…','सेवाएँ लोड हो रही हैं…')}</p>}
  {error&&<div role="alert" className="concierge-empty">{error}<button onClick={load} className="secondary-action"><RefreshCw size={16}/>Retry</button></div>}
  {!loading&&!error&&<div className="concierge-services">{filtered.map((s,i)=><Link href={`/book/${s.slug}`} key={s.id} className="concierge-service"><span className="concierge-number">{String(i+1).padStart(2,'0')}</span><div><h3>{language==='hi'?s.nameHi:s.nameEn}</h3><p>{language==='hi'?'कीमत देखें और सेवा बुक करें।':descriptions[s.slug]||'A helping hand for your home'}</p></div><span className="concierge-price"><small>{text('Visit from','विज़िट शुल्क')}</small>₹{Number(s.visitCharge).toLocaleString('en-IN')}</span><ArrowUpRight size={22}/></Link>)}</div>}
  {!loading&&!error&&!filtered.length&&<p role="status" className="concierge-empty">{text('No match. Try AC, plumber or electrician.','सेवा नहीं मिली। एसी या प्लंबर खोजें।')}</p>}
  </section>
  <div className="concierge-promise"><ShieldCheck size={22}/><div><strong>{text('Your approval. Before extra work.','अतिरिक्त काम से पहले आपकी मंज़ूरी।')}</strong><p>{text('Clear estimates. Cash or UPI after service.','स्पष्ट अनुमान। सेवा के बाद कैश या UPI भुगतान।')}</p></div></div>
  <section className="concierge-process"><div><span className="concierge-eyebrow">{text('THOUGHTFULLY SIMPLE','आसान और स्पष्ट')}</span><h2>{text('Less to manage.','कम परेशानी।')}<br/><em>{text('More peace of mind.','ज़्यादा सुकून।')}</em></h2></div><div>{[{Icon:Check,title:text('Choose what you need','अपनी सेवा चुनें'),body:text('See the visit price and tell us what needs fixing.','विज़िट शुल्क देखें और अपनी समस्या बताएँ।')},{Icon:MapPin,title:text('Follow their arrival','कारीगर की लोकेशन देखें'),body:text('After acceptance, follow the available live location and estimated arrival.','स्वीकृति के बाद उपलब्ध लाइव लोकेशन और आने का अनुमान देखें।')},{Icon:ShieldCheck,title:text('Stay in control','हर कदम पर आपकी मंज़ूरी'),body:text('Approve extra repairs, review the bill and pay after service.','अतिरिक्त मरम्मत मंज़ूर करें, बिल देखें और फिर भुगतान करें।')}].map(({Icon,title,body})=><article key={title}><Icon size={20}/><div><h3>{title}</h3><p>{body}</p></div></article>)}</div></section>
  <section className="concierge-partner"><div><span className="concierge-eyebrow">{text('FOR PEOPLE WHO KNOW THEIR CRAFT','हुनरमंद लोगों के लिए')}</span><h2>{text('Good at what you do?','अपने काम में माहिर हैं?')}</h2><p>{text('Bring your expertise. We’ll help you manage the work.','अपना हुनर लाएँ। काम मैनेज करने में हम मदद करेंगे।')}</p></div><Link href="/login" className="primary-action">{text('Join as a professional','कारीगर के रूप में जुड़ें')}<ArrowUpRight size={18}/></Link></section>
  <p className="concierge-disclaimer">{text('Arrival depends on nearby availability and traffic. Final repairs and parts require your approval.','आगमन उपलब्धता और ट्रैफिक पर निर्भर है। अतिरिक्त काम के लिए आपकी मंज़ूरी ज़रूरी है।')}</p>
 </div>;
}
