'use client';
import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ArrowUpRight, History, HelpCircle, ShieldCheck, LogOut, Wrench, Languages, UserRound } from 'lucide-react';
import { InstallApp } from '../../components/common/InstallApp';
import { api } from '../../lib/api';
import { useFeedback } from '../../context/FeedbackContext';
export default function AccountPage() {
 const {user,logout,isLoading}=useAuth(); const {language,toggleLanguage}=useLanguage();
 const { notify, confirmAction } = useFeedback();
 if(isLoading)return <p className="py-12" role="status">Loading your account…</p>;
 const roleLink = user?.role === 'WORKER'
   ? {href:'/worker/dashboard',title:'Professional workspace',detail:'Jobs, verification and earnings',Icon:Wrench}
   : user?.role === 'ADMIN'
   ? {href:'/admin',title:'Admin workspace',detail:'Manage service operations and support',Icon:ShieldCheck}
   : {href:'/history',title:'Your bookings',detail:'Track visits and view past services',Icon:History};
 const links=[roleLink,{href:'/contact',title:'Help & support',detail:'Questions, payments or a recent service',Icon:HelpCircle},{href:'/privacy',title:'Privacy',detail:'How your information is handled',Icon:ShieldCheck}];
 const exportData = async () => { const response = await api.exportMyData(); if (!response.ok) { notify('Could not export your data.', 'danger'); return; } const blob = await response.blob(); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'servzest-my-data.json'; anchor.click(); URL.revokeObjectURL(url); };
 const deleteAccount = async () => { const approved = await confirmAction({ title: 'Delete account?', message: 'Your sign-in and personal profile data will be removed. Completed financial and service records may be retained in anonymized form.', confirmLabel: 'Delete my account', tone: 'danger' }); if (!approved) return; const result = await api.deleteMyAccount(); if (!result.success) { notify(result.message || 'Account could not be deleted.', 'danger'); return; } await logout(); window.location.href = '/'; };
 return <div className="account-page"><p className="eyebrow">YOUR SERVZEST</p><h1>Your space.</h1><p className="account-intro">Everything you need, in one place.</p><section className="account-identity"><span className="account-avatar"><UserRound size={26}/></span><div><h2>{user?.name||'Welcome to ServZest'}</h2><p>{user ? `+91 ${user.phone} · ${user.role.toLowerCase()}` : 'Sign in to keep track of your home services.'}</p></div>{!user&&<Link href="/login" className="primary-action">Sign in</Link>}</section><div className="account-menu">{links.map(({href,title,detail,Icon})=><Link key={href} href={href}><Icon/><div><strong>{title}</strong><small>{detail}</small></div><ArrowUpRight/></Link>)}<button onClick={toggleLanguage}><Languages/><div><strong>Language · {language==='hi'?'हिन्दी':'English'}</strong><small>Switch to {language==='hi'?'English':'हिन्दी'}</small></div><ArrowUpRight/></button>{user&&<button onClick={exportData}><ShieldCheck/><div><strong>Download my data</strong><small>Export a copy of your account and booking data</small></div><ArrowUpRight/></button>}</div><InstallApp/>{user&&<><button className="account-logout" onClick={logout}><LogOut size={18}/>Sign out</button><button className="account-logout text-red-700" onClick={deleteAccount}>Delete account</button></>}</div>;
}
