import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { verifyRazorpayPaymentSignature } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

type VerifyRequest = {
  userId?: string;
  plan?: 'monthly' | 'annual';
  currency?: 'INR' | 'USD';
  amount?: number;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
};

function normalizePlan(plan: string | undefined) {
  return plan === 'monthly' ? 'monthly' : 'annual';
}

function computeRenewalDate(plan: 'monthly' | 'annual') {
  const now = new Date();
  if (plan === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as VerifyRequest;

    const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
    const razorpayOrderId = typeof body.razorpayOrderId === 'string' ? body.razorpayOrderId.trim() : '';
    const razorpayPaymentId = typeof body.razorpayPaymentId === 'string' ? body.razorpayPaymentId.trim() : '';
    const razorpaySignature = typeof body.razorpaySignature === 'string' ? body.razorpaySignature.trim() : '';

    if (!userId || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing required verification fields.' }, { status: 400 });
    }

    const signatureOk = verifyRazorpayPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    });

    if (!signatureOk) {
      return NextResponse.json({ error: 'Payment signature verification failed.' }, { status: 400 });
    }

    const plan = normalizePlan(body.plan);
    const currency = body.currency === 'USD' ? 'USD' : 'INR';
    const amount = typeof body.amount === 'number' ? body.amount : null;
    const renewalDate = computeRenewalDate(plan);

    const supabase = getSupabaseAdmin();
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('preset')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPreset = existingProfile?.preset && typeof existingProfile.preset === 'object'
      ? existingProfile.preset
      : {};

    const mergedPreset = {
      ...currentPreset,
      subscription: {
        provider: 'razorpay',
        status: 'active',
        plan,
        currency,
        amount,
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        renewalDate,
        verifiedAt: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          subscription_status: 'active',
          payment_provider: 'razorpay',
          subscription_renewal_date: renewalDate,
          preset: mergedPreset,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, status: 'active' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Razorpay verification error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
