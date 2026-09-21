import Link from 'next/link';
export function BrandLogo({ compact = false, hindi = false }: { compact?: boolean; hindi?: boolean }) {
 return <Link href="/" className={`brand-lockup ${compact ? 'brand-compact' : ''}`} aria-label="ServZest home"><img src="/servzest-mark.svg" width={44} height={44} alt=""/><span><strong>serv<span>zest</span><b>.</b></strong>{!compact&&<small>{hindi ? 'घर की देखभाल' : 'HOME, TAKEN CARE OF'}</small>}</span></Link>;
}
