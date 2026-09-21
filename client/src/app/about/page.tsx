'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { Zap, Clock, ShieldCheck, HeartHandshake, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AboutPage() {
  const { language } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 text-white rounded-3xl p-6 shadow-md relative overflow-hidden">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-xs font-semibold tracking-wide backdrop-blur">
            <Zap className="w-3.5 h-3.5 text-brand-100 fill-brand-100" />
            <span>{language === 'hi' ? 'हमारा मिशन' : 'Our Mission'}</span>
          </div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">
            {language === 'hi' ? 'घर की हर समस्या का त्वरित और भरोसेमंद समाधान' : 'Fast, Fair & Transparent Home Services for India'}
          </h1>
          <p className="text-brand-100 text-xs font-medium leading-relaxed">
            {language === 'hi'
              ? 'सर्वज़ेस्ट ग्राहकों को उपलब्ध स्थानीय कारीगरों, स्पष्ट कीमत और बुकिंग अपडेट से जोड़ने के लिए बनाया गया है।'
              : 'ServZest is designed to connect households with available local professionals, clear pricing and booking updates.'}
          </p>
        </div>
      </div>

      {/* Story & Problem */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-3 text-xs leading-relaxed text-slate-700">
        <h2 className="text-base font-black text-slate-900">
          {language === 'hi' ? 'सर्वज़ेस्ट की शुरुआत क्यों हुई?' : 'Why We Built ServZest'}
        </h2>
        <p>
          {language === 'hi'
            ? 'अक्सर जब घर में बिजली का फॉल्ट होता है या पानी की पाइप लीक होती है, तो किसी कारीगर को ढूंढना, मोलभाव करना और घंटों इंतज़ार करना बेहद तनावपूर्ण होता है। कारीगरों के पास भी नियमित काम और पारदर्शी आमदनी की कमी थी।'
            : 'When a pipe bursts or an electrical short happens, finding a reliable technician often means endless phone calls, uncertain arrival times, and arbitrary pricing. Meanwhile, skilled local workers struggle with inconsistent daily jobs.'}
        </p>
        <p>
          {language === 'hi'
            ? 'सर्वज़ेस्ट इस असंगठित व्यवस्था को बदलता है। जैसे आप 10-15 मिनट में कैब या खाना मंगाते हैं, वैसे ही अब आप एक क्लिक में इलेक्ट्रीशियन, प्लंबर या मैकेनिक अपने दरवाजे पर बुला सकते हैं।'
            : 'Inspired by India’s on-demand mobility platforms, ServZest brings hyperlocal dispatch to home services. The app shows an estimate based on the available professional’s location; actual arrival depends on traffic and availability.'}
        </p>
      </div>

      {/* Core Pillars */}
      <div className="space-y-3">
        <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
          {language === 'hi' ? 'हमारे 4 मुख्य स्तंभ' : 'Our Core Pillars'}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'hi' ? 'लाइव अनुमानित समय' : 'Live arrival estimate'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {language === 'hi'
                ? 'स्मार्ट हाइपरलोकल डिस्पैच तकनीक से निकटतम उपलब्ध कारीगर तुरंत आपके पास पहुंचता है।'
                : 'Automated proximity dispatch matches you with the nearest active worker instantly.'}
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'hi' ? 'एडमिन समीक्षा' : 'Admin-reviewed profiles'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {language === 'hi'
                ? 'केवल एडमिन द्वारा स्वीकृत प्रोफाइल काम स्वीकार कर सकती हैं। स्वीकृति अपने आप सरकारी पहचान या पृष्ठभूमि जांच नहीं है।'
                : 'Only admin-approved profiles can accept work. Approval alone is not automated government-ID or background verification.'}
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'hi' ? 'पारदर्शी रेट कार्ड' : 'Transparent Rate Card'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {language === 'hi'
                ? 'कोई छुपा शुल्क नहीं। बुकिंग से पहले विज़िट चार्ज और सर्विस रेट स्पष्ट दिखाई देते हैं।'
                : 'Clear upfront pricing with pre-fixed service items. Extra parts require customer approval.'}
            </p>
          </div>

          <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-1.5">
            <div className="w-8 h-8 rounded-xl bg-brand-50 border border-brand-200 flex items-center justify-center text-brand-600">
              <HeartHandshake className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === 'hi' ? 'कारीगरों का सम्मान' : 'Worker Dignity'}
            </h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              {language === 'hi'
                ? 'हम कारीगरों को सम्मानजनक आमदनी और सुरक्षा प्रदान करते हैं, केवल 15% न्यूनतम कमीशन के साथ।'
                : 'The app separates customer totals, professional earnings and company commission for transparent settlement.'}
            </p>
          </div>
        </div>
      </div>

      {/* CTA Card */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl text-center space-y-3 shadow-sm">
        <h3 className="text-base font-black text-slate-900">
          {language === 'hi' ? 'घर की मरम्मत की ज़रूरत है?' : 'Ready to Experience Fast Home Services?'}
        </h3>
        <p className="text-xs text-slate-500">
          {language === 'hi'
            ? 'इलेक्ट्रीशियन, प्लंबर, मैकेनिक और एसी तकनीशियन बस एक क्लिक की दूरी पर हैं।'
            : 'Choose an available electrician, plumber, laborer or mechanic service.'}
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs rounded-2xl shadow-sm transition"
        >
          <span>{language === 'hi' ? 'अभी सेवा बुक करें' : 'Book a Service Now'}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
