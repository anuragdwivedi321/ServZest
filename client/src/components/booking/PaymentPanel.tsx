'use client';
import { useState } from 'react';
import { api } from '../../lib/api';
import { useFeedback } from '../../context/FeedbackContext';
export function PaymentPanel({ booking, refresh }: { booking: any; refresh: () => void }) {
  const { confirmAction, notify } = useFeedback();
  const [qr, setQr] = useState<any>(null);
  const [reference, setReference] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const run = async (action: () => Promise<any>) => {
    setBusy(true); setMessage('');
    try { const result = await action(); if (!result.success) throw new Error(result.message); refresh(); return result; }
    catch (error: any) { setMessage(error.message || 'Please retry.'); }
    finally { setBusy(false); }
  };
  if (booking.payment?.status === 'COMPLETED') return <p className="p-4 rounded-xl bg-emerald-50 text-emerald-800">₹{booking.payment.amount} paid via {booking.payment.method}. Receipt confirmed by professional.</p>;
  if (booking.payment?.reportedAt) return <div className="p-4 bg-amber-50 rounded-xl text-amber-900"><b>Awaiting receipt confirmation</b><p className="text-sm mt-1">You reported ₹{booking.payment.amount} via {booking.payment.method}. The professional must confirm receiving it. Do not pay again.</p>{booking.payment.transactionRef && <p className="text-xs mt-2">Reference: {booking.payment.transactionRef}</p>}</div>;
  return <section className="space-y-4 border-t pt-4">
    <h3 className="font-bold">Pay your final bill</h3>
    {booking.payment?.status === 'FAILED' && <p className="text-red-700 text-sm">Professional could not confirm receipt. Check with them before paying again.</p>}
    <div className="flex flex-wrap gap-3"><button disabled={busy} onClick={async () => { const result = await run(() => api.paymentQr(booking.id)); if (result) setQr(result); }} className="bg-brand-600 text-white px-5 py-3 rounded-xl disabled:opacity-50">Show UPI QR</button><button disabled={busy} onClick={async () => { const approved = await confirmAction({ title: 'Confirm cash payment', message: `Confirm only after handing ₹${booking.totalAmount} to the professional. They will verify receipt next.`, confirmLabel: 'Yes, cash paid' }); if (approved) { const result = await run(() => api.payBill(booking.id, 'CASH')); if (result) notify('Cash payment reported. Waiting for professional confirmation.', 'success'); } }} className="bg-slate-800 text-white px-5 py-3 rounded-xl disabled:opacity-50">I paid cash</button></div>
    {qr && <div className="p-4 bg-slate-50 border rounded-xl space-y-3 text-center"><p className="font-bold">₹{qr.amount} · {qr.payeeName}</p><p className="text-sm break-all">{qr.payeeUpiId}</p><img src={qr.qrDataUrl} width={260} height={260} alt={`UPI payment QR for ${qr.payeeName}`} className="mx-auto rounded-xl" /><a href={qr.uri} className="inline-block text-brand-700 font-bold underline">Open UPI app</a><p className="text-xs text-slate-600">Verify the recipient in your UPI app before paying. This QR does not automatically verify payment.</p><input aria-label="UPI transaction reference" placeholder="UPI transaction reference / UTR" value={reference} onChange={e => setReference(e.target.value)} maxLength={64} className="border rounded-lg w-full p-3" /><button disabled={busy || !/^[a-zA-Z0-9-]{6,64}$/.test(reference.trim())} onClick={() => run(() => api.payBill(booking.id, 'UPI', reference.trim()))} className="bg-brand-600 text-white rounded-xl p-3 w-full disabled:opacity-40">I have paid — request confirmation</button></div>}
    {message && <p role="alert" className="text-red-700 text-sm">{message}</p>}
  </section>;
}

export function BookingComplaint({ id }: { id: string }) {
  const [issue, setIssue] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  return <form className="p-5 bg-white border rounded-2xl space-y-3" onSubmit={async e => { e.preventDefault(); setBusy(true); try { const res = await api.reportComplaint(id, issue); if (!res.success) throw new Error(res.message); setMessage('Complaint saved. Your support reference: ' + res.complaint.id); setIssue(''); } catch (error: any) { setMessage(error.message); } finally { setBusy(false); } }}><h3 className="font-bold">Need help with this booking?</h3><textarea aria-label="Booking complaint" value={issue} onChange={e => setIssue(e.target.value)} required minLength={5} maxLength={3000} placeholder="Describe your issue" className="border p-3 rounded-xl w-full" /><button disabled={busy} className="bg-slate-800 text-white rounded-xl px-4 py-2">{busy ? 'Saving…' : 'Send to support'}</button>{message && <p role="status" className="text-sm">{message}</p>}</form>;
}
