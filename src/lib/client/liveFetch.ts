/** Score / live-board GETs must not reuse a cached HTTP body. */
export function liveFetch(input: RequestInfo | URL, init?: RequestInit) {
  return fetch(input, { ...init, cache: 'no-store' });
}
