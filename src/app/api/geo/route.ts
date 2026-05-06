import { NextRequest, NextResponse } from 'next/server';
import { getCountryFromHeaders, getCurrencyForCountry } from '@/lib/server/geo';

export const dynamic = 'force-dynamic';

function parseCoordinate(input: string | null): number | null {
  if (!input) return null;
  const num = Number(input);
  return Number.isFinite(num) ? num : null;
}

async function resolveCountryFromCoordinates(lat: number, lon: number): Promise<string | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'readapt-app/1.0 (geo-detection)',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    address?: {
      country_code?: string;
    };
  };

  const country = payload.address?.country_code;
  if (!country || country.length !== 2) {
    return null;
  }

  return country.toUpperCase();
}

export async function GET(req: NextRequest) {
  const lat = parseCoordinate(req.nextUrl.searchParams.get('lat'));
  const lon = parseCoordinate(req.nextUrl.searchParams.get('lon'));

  let countryCode: string | null = null;
  let source: 'geolocation' | 'headers' = 'headers';

  if (lat !== null && lon !== null) {
    countryCode = await resolveCountryFromCoordinates(lat, lon);
    if (countryCode) {
      source = 'geolocation';
    }
  }

  if (!countryCode) {
    countryCode = getCountryFromHeaders(req);
  }

  return NextResponse.json({
    countryCode,
    currency: getCurrencyForCountry(countryCode),
    source,
  });
}
