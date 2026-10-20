import { mediaKit } from '@/config/mediaKit';

export type SponsorInquiry = { brand: string; goal: string; dates: string; budget: string; packageName: string };

export function inquiryBody(inquiry: SponsorInquiry, locale: 'es' | 'en'): string {
  const labels = locale === 'en'
    ? ['Brand / company', 'Campaign goal', 'Desired dates', 'Budget / currency (optional)', 'Campaign']
    : ['Marca / empresa', 'Objetivo', 'Fechas deseadas', 'Presupuesto / moneda (opcional)', 'Campaña'];
  return [inquiry.brand, inquiry.goal, inquiry.dates, inquiry.budget, inquiry.packageName]
    .map((value, index) => `${labels[index]}: ${value.trim() || '—'}`).join('\n\n');
}

export function buildInquiryMailto(inquiry: SponsorInquiry, locale: 'es' | 'en'): string {
  const subject = locale === 'en' ? 'AF sponsorship proposal' : mediaKit.contact.subject;
  return `mailto:${mediaKit.contact.email}?subject=${encodeURIComponent(`${subject}: ${inquiry.packageName}`)}&body=${encodeURIComponent(inquiryBody(inquiry, locale))}`;
}
