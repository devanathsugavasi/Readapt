import crypto from 'crypto';

type RazorpayOrderRequest = {
  amount: number;
  currency: 'INR' | 'USD';
  receipt: string;
  notes?: Record<string, string>;
};

type RazorpayOrderResponse = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getRazorpayKeyId() {
  return getRequiredEnv('RAZORPAY_KEY_ID');
}

function getRazorpaySecret() {
  return getRequiredEnv('RAZORPAY_KEY_SECRET');
}

function getRazorpayAuthHeader() {
  const keyId = getRazorpayKeyId();
  const keySecret = getRazorpaySecret();
  const basicAuth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  return `Basic ${basicAuth}`;
}

export async function createRazorpayOrder(payload: RazorpayOrderRequest): Promise<RazorpayOrderResponse> {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    cache: 'no-store',
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Razorpay order creation failed: ${errorBody}`);
  }

  return (await response.json()) as RazorpayOrderResponse;
}

function getRazorpayWebhookSecret() {
  return getRequiredEnv('RAZORPAY_WEBHOOK_SECRET');
}

export function verifyRazorpayPaymentSignature(params: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const payload = `${params.orderId}|${params.paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', getRazorpaySecret())
    .update(payload)
    .digest('hex');

  return expectedSignature === params.signature;
}

export function verifyRazorpayWebhookSignature(payload: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', getRazorpayWebhookSecret())
    .update(payload)
    .digest('hex');

  return expectedSignature === signature;
}
