import { NextRequest } from 'next/server';

export type CurrencyCode = 'INR' | 'USD';

export function getCountryFromHeaders(req: NextRequest): string {
  const headerCandidates = [
    req.headers.get('x-vercel-ip-country'),
    req.headers.get('cf-ipcountry'),
    req.headers.get('cloudfront-viewer-country'),
    req.headers.get('x-country-code'),
  ];

  for (const candidate of headerCandidates) {
    if (candidate && candidate.length === 2) {
      return candidate.toUpperCase();
    }
  }

  const acceptLanguage = req.headers.get('accept-language') || '';
  if (/(^|,|-)en-IN\b|\bhi-IN\b|\bbn-IN\b|\bta-IN\b/i.test(acceptLanguage)) {
    return 'IN';
  }

  return 'US';
}

export function getCurrencyForCountry(countryCode: string): CurrencyCode {
  return countryCode === 'IN' ? 'INR' : 'USD';
}
