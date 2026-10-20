'use client';

import { useState, type FormEvent } from 'react';
import { mediaKit } from '@/config/mediaKit';
import { buildInquiryMailto, inquiryBody } from '@/lib/mediakit/inquiry';

type Props = { locale: 'es' | 'en'; packageId: string; onPackageChange: (id: string) => void; packages: readonly { id: string; name: string }[] };
const field = 'mt-2 block w-full rounded-sm border border-slate-400 bg-white p-3 text-base text-brand-blue focus:outline-2 focus:outline-[#157c72]';

export default function SponsorInquiry({ locale, packageId, onPackageChange, packages }: Props) {
  const t = (es: string, en: string) => locale === 'en' ? en : es;
  const [status, setStatus] = useState('');
  const [brand, setBrand] = useState('');
  const [goal, setGoal] = useState('');
  const [dates, setDates] = useState('');
  const [budget, setBudget] = useState('');
  const inquiry = { brand, goal, dates, budget, packageName: packages.find(p => p.id === packageId)?.name ?? t('Por definir', 'To be defined') };

  function compose(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.location.href = buildInquiryMailto(inquiry, locale);
    setStatus(t('Se solicitó abrir tu aplicación de correo. Revisa y envía el mensaje allí; este sitio no lo envía.', 'Your email app was requested. Review and send the message there; this site does not send it.'));
  }

  async function copy(text: string, success: string) {
    try { await navigator.clipboard.writeText(text); setStatus(success); }
    catch { setStatus(t('No se pudo copiar. Selecciona el correo o el resumen manualmente.', 'Copy failed. Select the email or brief manually.')); }
  }

  return <>
    <p className="mt-4 text-sm leading-6 text-slate-600">{t('Prepara un correo con tu brief. No se envía ni guarda en este sitio; debes enviarlo desde tu correo.', 'Prepare an email with your brief. It is not sent or stored by this site; you send it from your email app.')}</p>
    <form onSubmit={compose} onChange={() => setStatus('')} className="mt-6 grid gap-5 sm:grid-cols-2 print:hidden">
      <label className="text-sm font-bold">{t('Marca / empresa', 'Brand / company')}<input required maxLength={150} autoComplete="organization" name="brand" value={brand} onChange={e => setBrand(e.target.value)} className={field} /></label>
      <label className="text-sm font-bold">{t('Campaña', 'Campaign')}<select name="package" value={packageId} onChange={e => onPackageChange(e.target.value)} className={field}><option value="">{t('Por definir', 'To be defined')}</option>{packages.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></label>
      <label className="text-sm font-bold sm:col-span-2">{t('Objetivo de la campaña', 'Campaign goal')}<textarea required maxLength={1500} name="goal" rows={3} value={goal} onChange={e => setGoal(e.target.value)} className={field} /></label>
      <label className="text-sm font-bold">{t('Fechas o ventana deseada', 'Desired dates or window')}<input required maxLength={150} name="dates" value={dates} onChange={e => setDates(e.target.value)} placeholder={t('Ej. noviembre; por confirmar', 'E.g. November; to be confirmed')} className={field} /></label>
      <label className="text-sm font-bold">{t('Presupuesto y moneda (opcional)', 'Budget and currency (optional)')}<input maxLength={100} name="budget" value={budget} onChange={e => setBudget(e.target.value)} placeholder={t('Ej. rango en MXN o USD', 'E.g. range in MXN or USD')} className={field} /></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button type="submit" className="min-h-12 rounded-sm bg-brand-orange-dark px-6 py-3 text-sm font-bold text-white">{t('Abrir borrador en mi correo', 'Open draft in my email app')}</button>
        <button type="button" onClick={() => copy(inquiryBody(inquiry, locale), t('Brief copiado; pégalo en tu correo para enviarlo.', 'Brief copied; paste it into your email to send.'))} className="min-h-12 border border-slate-400 px-5 py-3 text-sm font-bold">{t('Copiar brief', 'Copy brief')}</button>
      </div>
    </form>
    <div className="mt-5 flex flex-wrap items-center gap-4"><a href={`mailto:${mediaKit.contact.email}`} className="break-all font-bold text-brand-orange-dark underline">{mediaKit.contact.email}</a><button type="button" onClick={() => copy(mediaKit.contact.email, t('Correo copiado.', 'Email address copied.'))} className="min-h-11 px-3 text-sm font-bold underline print:hidden">{t('Copiar correo', 'Copy email address')}</button></div>
    <p role="status" className="mt-3 text-sm text-slate-700 print:hidden">{status}</p>
    <details className="mt-3 print:hidden"><summary className="cursor-pointer text-sm underline">{t('Ver resumen para copiar manualmente', 'View brief for manual copying')}</summary><pre className="mt-3 whitespace-pre-wrap break-words font-sans text-sm">{inquiryBody(inquiry, locale)}</pre></details>
  </>;
}
