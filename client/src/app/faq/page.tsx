'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '../../context/LanguageContext';
import { ChevronDown, HelpCircle, ShieldCheck, Zap } from 'lucide-react';

interface FaqItem {
  qEn: string;
  qHi: string;
  aEn: string;
  aHi: string;
  tag: string;
}

const FAQS: FaqItem[] = [
  {
    tag: 'Booking',
    qEn: 'How quickly will the technician reach my address?',
    qHi: 'कारीगर मेरे पते पर कितनी जल्दी पहुंचेगा?',
    aEn: 'We aim for arrival in around 20 minutes, depending on nearby availability, distance and traffic. Arrival time is an estimate. After a professional accepts, the map shows their latest shared location.',
    aHi: 'हमारा लक्ष्य लगभग 20 मिनट में पहुंचना है। वास्तविक समय उपलब्ध कारीगर, दूरी और ट्रैफिक पर निर्भर है। बुकिंग स्वीकार होने के बाद मैप पर कारीगर की साझा की गई लोकेशन दिखती है।',
  },
  {
    tag: 'Pricing',
    qEn: 'How is the final bill calculated? Are there hidden charges?',
    qHi: 'अंतिम बिल कैसे तय होता है? क्या कोई छुपा शुल्क है?',
    aEn: 'There are zero hidden charges. You pay a standard visit fee (₹99 for most services, ₹199 for AC) plus the transparent rate-card price for the exact tasks performed. Any extra parts or materials require your explicit digital approval before work begins.',
    aHi: 'कोई छुपा शुल्क नहीं है। आप विज़िट चार्ज (₹99 अधिकांश सेवाओं के लिए, ₹199 एसी के लिए) और किए गए काम का रेट कार्ड मूल्य देते हैं। यदि कोई नया पुर्ज़ा या सामग्री लगती है, तो काम शुरू करने से पहले आपकी डिजिटल मंज़ूरी ली जाती है।',
  },
  {
    tag: 'Safety & OTP',
    qEn: 'What is the 4-digit Start OTP and why is it needed?',
    qHi: '4-अंकों का स्टार्ट ओटीपी क्या है और इसकी क्या आवश्यकता है?',
    aEn: 'The 4-digit Start OTP ensures that only the authorized technician assigned to your booking can initiate the job. You should only share this code once the technician physically arrives at your doorstep.',
    aHi: '4-अंकों का स्टार्ट ओटीपी यह सुनिश्चित करता है कि केवल आपके लिए नियत किया गया अधिकृत कारीगर ही काम शुरू कर सके। जब कारीगर आपके दरवाजे पर आ जाए, तभी उसे यह कोड बताएं।',
  },
  {
    tag: 'Cancellation',
    qEn: 'Can I cancel my booking? Is there a cancellation fee?',
    qHi: 'क्या मैं अपनी बुकिंग रद्द कर सकता हूं? क्या कोई कैंसिलेशन चार्ज है?',
    aEn: 'Yes, you can cancel free of charge within the 2-minute grace period after booking. If cancelled after the technician is already en route past the grace period, a nominal ₹40 cancellation fee applies to compensate the worker for their fuel and travel.',
    aHi: 'हाँ, बुकिंग के 2 मिनट के भीतर आप बिना किसी शुल्क के रद्द कर सकते हैं। यदि कारीगर रास्ते में निकल चुका है और 2 मिनट बीत चुके हैं, तो कारीगर के आने-जाने के खर्च हेतु ₹40 का मामूली शुल्क लगता है।',
  },
  {
    tag: 'Payment',
    qEn: 'What payment methods are supported?',
    qHi: 'भुगतान के कौन से तरीके उपलब्ध हैं?',
    aEn: 'We support all major payment modes: Cash on completion directly to the worker, or instant digital payment via UPI (Google Pay, PhonePe, Paytm, BHIM).',
    aHi: 'आप काम पूरा होने पर कारीगर को सीधे कैश दे सकते हैं, या UPI (Google Pay, PhonePe, Paytm आदि) के माध्यम से तुरंत डिजिटल भुगतान कर सकते हैं।',
  },
  {
    tag: 'Verification',
    qEn: 'Are ServZest workers background verified?',
    qHi: 'क्या सर्वज़ेस्ट के कारीगर पृष्ठभूमि जांचे हुए (वेरिफाइड) हैं?',
    aEn: 'Professionals submit their details and selected services for admin review. Only approved professionals can accept jobs. Approval does not represent automated government identity verification.',
    aHi: 'कारीगर अपनी जानकारी और सेवाएं एडमिन समीक्षा के लिए जमा करते हैं। केवल स्वीकृत कारीगर काम स्वीकार कर सकते हैं। यह स्वचालित सरकारी पहचान सत्यापन नहीं है।',
  },
];

export default function FaqPage() {
  const { language } = useLanguage();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Header */}
      <div className="text-center space-y-1 pt-2">
        <div className="w-10 h-10 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600 mx-auto flex items-center justify-center">
          <HelpCircle className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          {language === 'hi' ? 'अक्सर पूछे जाने वाले सवाल' : 'Frequently Asked Questions'}
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          {language === 'hi'
            ? 'सर्वज़ेस्ट बुकिंग, रेट कार्ड और सुरक्षा से संबंधित सामान्य प्रश्न'
            : 'Everything you need to know about booking, pricing, and safety on ServZest'}
        </p>
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {FAQS.map((faq, idx) => {
          const isOpen = openIndex === idx;
          const question = language === 'hi' ? faq.qHi : faq.qEn;
          const answer = language === 'hi' ? faq.aHi : faq.aEn;

          return (
            <div
              key={idx}
              className={`bg-white border rounded-2xl transition-all shadow-sm overflow-hidden ${
                isOpen ? 'border-brand-500 ring-1 ring-brand-500/20' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 focus:outline-none"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-brand-700 uppercase tracking-wider bg-brand-50 px-2 py-0.5 rounded-full border border-brand-100">
                    {faq.tag}
                  </span>
                  <h3 className="font-bold text-slate-900 text-xs sm:text-sm">{question}</h3>
                </div>
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-transform ${
                    isOpen ? 'rotate-180 bg-brand-50 text-brand-600' : 'bg-slate-50 text-slate-400'
                  }`}
                >
                  <ChevronDown className="w-4 h-4" />
                </div>
              </button>

              {isOpen && (
                <div className="px-4 pb-4 pt-1 text-xs text-slate-600 leading-relaxed border-t border-slate-100/80">
                  {answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Help Banner */}
      <div className="p-5 bg-white border border-slate-200 rounded-3xl text-center space-y-2 shadow-sm">
        <h3 className="text-xs font-bold text-slate-900">
          {language === 'hi' ? 'क्या आपका सवाल यहाँ नहीं है?' : 'Still have questions?'}
        </h3>
        <p className="text-[11px] text-slate-500">
          {language === 'hi'
            ? 'संपर्क पेज पर अपना सवाल भेजें। आपकी समस्या को ट्रैक करने के लिए टिकट नंबर मिलेगा।'
            : 'Send your question through Contact Us. You will receive a ticket reference for follow-up.'}
        </p>
        <Link href="/contact" className="inline-block font-bold text-brand-700">Contact Us →</Link>
      </div>
    </div>
  );
}
