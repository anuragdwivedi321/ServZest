'use client';

import { api } from '../../lib/api';
import React, { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { Mail, Phone, MapPin, Clock, Send, CheckCircle2 } from 'lucide-react';

export default function ContactPage() {
  const { language } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [category, setCategory] = useState('Booking Query');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [ticketId, setTicketId] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !message) return;
    setBusy(true); setError('');
    try { const result = await api.createSupportTicket({ name, phone, category, message }); if (!result.success) throw new Error(result.message); setTicketId(result.ticketId); setSubmitted(true); } catch (e: any) { setError(e.message || 'Could not save message.'); } finally { setBusy(false); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'hi' ? 'हमसे संपर्क करें' : 'Get in Touch'}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {language === 'hi'
            ? 'बुकिंग, भुगतान या फीडबैक के लिए सहायता अनुरोध भेजें'
            : 'Send a request about bookings, payments, or feedback'}
        </p>
      </div>

      {/* Quick Contact Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
            <Phone className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-900 text-xs">Phone Support</p>
          <p className="text-brand-700 font-bold text-xs">Support form below</p>
          <p className="text-[10px] text-slate-400">Tracked support requests</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
            <Mail className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-900 text-xs">Email Us</p>
          <p className="text-brand-700 font-bold text-xs">Support ticket inbox</p>
          <p className="text-[10px] text-slate-400">Send a message using the form</p>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm text-center space-y-1.5">
          <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
            <MapPin className="w-5 h-5" />
          </div>
          <p className="font-bold text-slate-900 text-xs">Service region</p>
          <p className="text-slate-700 font-medium text-xs">Connaught Place, New Delhi</p>
          <p className="text-[10px] text-slate-400">Delhi NCR, India</p>
        </div>
      </div>

      {error && <p role="alert" className="text-red-700">{error}</p>}
      {/* Contact Form */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-4">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          {language === 'hi' ? 'हमें संदेश भेजें' : 'Send us a Message'}
        </h2>

        {submitted ? (
          <div className="p-6 bg-brand-50 border border-brand-200 rounded-2xl text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-brand-600 mx-auto" />
            <h3 className="text-sm font-bold text-brand-900">
              {language === 'hi' ? 'संदेश प्राप्त हुआ!' : 'Message saved: ' + ticketId}
            </h3>
            <p className="text-xs text-brand-700">
              {language === 'hi'
                ? 'धन्यवाद! हमारी सपोर्ट टीम जल्द ही आपसे +91 ' + phone + ' पर संपर्क करेगी।'
                : `Thank you, ${name}! Our support team will respond to +91 ${phone} shortly.`}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setMessage('');
              }}
              className="mt-2 text-xs font-bold text-brand-700 underline"
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'hi' ? 'आपका नाम' : 'Your Name'}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'hi' ? 'मोबाइल नंबर' : 'Phone Number'}
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400 font-bold">+91</span>
                <input
                  type="tel"
                  maxLength={10} pattern="[6-9][0-9]{9}"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  required
                  className="w-full pl-12 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'hi' ? 'विषय' : 'Topic / Category'}
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              >
                <option value="Booking Query">Booking Inquiry / Delay</option>
                <option value="Billing">Billing & Payment Issue</option>
                <option value="Worker Feedback">Worker Feedback or Complaint</option>
                <option value="Worker Joining">Join as a Partner Worker</option>
                <option value="Other">Other Query</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                {language === 'hi' ? 'संदेश' : 'Your Message'}
              </label>
              <textarea
                rows={3} minLength={10} maxLength={3000}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="How can we help you today?"
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 transition"
              />
            </div>

            <button
              type="submit" disabled={busy}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'संदेश भेजें' : 'Submit Message'}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
