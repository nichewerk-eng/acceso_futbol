import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google';
import { gaMeasurementId } from '@/lib/analytics/ga';

/** GA4 via gtag.js. Reads GA_MEASUREMENT_ID on the server (Vercel). */
export function GoogleAnalytics() {
  const gaId = gaMeasurementId();
  if (!gaId) return null;
  return (
    <NextGoogleAnalytics
      gaId={gaId}
      debugMode={process.env.NEXT_PUBLIC_GA_DEBUG === '1'}
    />
  );
}
