import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/server/supabaseAdmin';
import { verifyRazorpayWebhookSignature } from '@/lib/server/razorpay';

export const dynamic = 'force-dynamic';

type RazorpayEvent = {
  event?: string;
  payload?: Record<string, unknown>;
};

function getObjectEntity(payload: Record<string, unknown> | undefined, key: string) {
  const item = payload?.[key];
  if (!item || typeof item !== 'object') return null;
  const entity = (item as Record<string, unknown>).entity;
  if (!entity || typeof entity !== 'object') return null;
  return entity as Record<string, unknown>;
}

function resolveUserId(event: RazorpayEvent): string | null {
  const payload = event.payload;
  const orderEntity = getObjectEntity(payload, 'order');
  const paymentEntity = getObjectEntity(payload, 'payment');
  const subscriptionEntity = getObjectEntity(payload, 'subscription');

  const noteCandidates = [
    orderEntity?.notes,
    paymentEntity?.notes,
    subscriptionEntity?.notes,
  ];

  for (const notes of noteCandidates) {
    if (!notes || typeof notes !== 'object') continue;
    const userId = (notes as Record<string, unknown>).userId;
    if (typeof userId === 'string' && userId.trim()) {
      return userId.trim();
    }
  }

  return null;
}

function mapEventToStatus(eventName: string): string {
  if (
    eventName === 'payment.captured'
    || eventName === 'order.paid'
    || eventName === 'subscription.charged'
  ) {
    return 'active';
  }

  if (
    eventName === 'subscription.cancelled'
    || eventName === 'subscription.halted'
    || eventName === 'subscription.completed'
  ) {
    return 'cancelled';
  }

  if (eventName === 'payment.failed') {
    return 'past_due';
  }

  return 'active';
}

export async function POST(req: NextRequest) {
  try {
    const signature = req.headers.get('x-razorpay-signature') || '';
    const rawBody = await req.text();

    if (!signature) {
      return NextResponse.json({ error: 'Missing Razorpay signature header.' }, { status: 400 });
    }

    const signatureOk = verifyRazorpayWebhookSignature(rawBody, signature);
    if (!signatureOk) {
      return NextResponse.json({ error: 'Invalid Razorpay webhook signature.' }, { status: 400 });
    }

    const event = JSON.parse(rawBody) as RazorpayEvent;
    const eventName = typeof event.event === 'string' ? event.event : 'unknown';

    const userId = resolveUserId(event);
    if (!userId) {
      return NextResponse.json({ ok: true, ignored: true, reason: 'No userId in webhook notes.' });
    }

    const subscriptionEntity = getObjectEntity(event.payload, 'subscription');
    const subscriptionId =
      subscriptionEntity && typeof subscriptionEntity.id === 'string'
        ? subscriptionEntity.id
        : null;

    const currentEnd =
      subscriptionEntity && typeof subscriptionEntity.current_end === 'number'
        ? new Date(subscriptionEntity.current_end * 1000).toISOString()
        : null;

    const nextStatus = mapEventToStatus(eventName);

    const supabase = getSupabaseAdmin();
    const { data: existingProfile } = await supabase
      .from('user_profiles')
      .select('preset')
      .eq('user_id', userId)
      .maybeSingle();

    const currentPreset = existingProfile?.preset && typeof existingProfile.preset === 'object'
      ? existingProfile.preset
      : {};

    const existingSubscription =
      currentPreset
      && typeof currentPreset === 'object'
      && typeof (currentPreset as Record<string, unknown>).subscription === 'object'
        ? ((currentPreset as Record<string, unknown>).subscription as Record<string, unknown>)
        : {};

    const mergedPreset = {
      ...currentPreset,
      subscription: {
        ...existingSubscription,
        provider: 'razorpay',
        status: nextStatus,
        subscriptionId: subscriptionId ?? existingSubscription.subscriptionId ?? null,
        renewalDate: currentEnd ?? existingSubscription.renewalDate ?? null,
        lastWebhookEvent: eventName,
        lastWebhookAt: new Date().toISOString(),
      },
    };

    const { error: updateError } = await supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: userId,
          subscription_status: nextStatus,
          payment_provider: 'razorpay',
          subscription_renewal_date: currentEnd,
          razorpay_subscription_id: subscriptionId,
          preset: mergedPreset,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Razorpay webhook error.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
