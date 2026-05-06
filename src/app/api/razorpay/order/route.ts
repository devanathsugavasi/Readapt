import { NextRequest, NextResponse } from 'next/server';
import { getCountryFromHeaders, getCurrencyForCountry, type CurrencyCode } from '@/lib/server/geo';
import { createRazorpayOrder, getRazorpayKeyId } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

type PlanType = 'monthly' | 'annual';

type OrderRequest = {
  plan?: PlanType;
  currency?: CurrencyCode;
  userId?: string;
};

const PLAN_AMOUNTS: Record<CurrencyCode, Record<PlanType, number>> = {
  USD: {
    monthly: 699,
    annual: 5900,
  },
  INR: {
    monthly: 57900,
    annual: 489900,
  },
};

function resolvePlan(input: string | undefined): PlanType {
  return input === 'monthly' ? 'monthly' : 'annual';
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as OrderRequest;
    const plan = resolvePlan(body.plan);
    const detectedCurrency = getCurrencyForCountry(getCountryFromHeaders(req));
    const currency = body.currency === 'INR' || body.currency === 'USD' ? body.currency : detectedCurrency;

    const amount = PLAN_AMOUNTS[currency][plan];
    const receipt = `readapt_${plan}_${Date.now()}`;

    const order = await createRazorpayOrder({
      amount,
      currency,
      receipt,
      notes: {
        app: 'readapt',
        plan,
        userId: body.userId || 'anonymous',
      },
    });

    return NextResponse.json({
      keyId: getRazorpayKeyId(),
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create Razorpay order';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
