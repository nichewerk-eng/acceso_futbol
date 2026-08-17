import { permanentRedirect } from 'next/navigation';

/** Goleo lives on /liga-mx?tab=goleo. Keep this URL for old links + SEO. */
export default function GoleoRedirect() {
  permanentRedirect('/liga-mx?tab=goleo');
}
