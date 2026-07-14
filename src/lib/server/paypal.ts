import "server-only";

import { z } from "zod";

const PAYPAL_BASE_URL = "https://api-m.paypal.com";

function getPayPalCredentials() {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET_LIVE;
  return { clientId, clientSecret };
}

async function readPayPalErrorMessage(response: Response) {
  try {
    const payload = await response.text();
    return payload.slice(0, 500) || response.statusText;
  } catch {
    return response.statusText;
  }
}

export async function getPayPalAccessToken(): Promise<string> {
  const { clientId, clientSecret } = getPayPalCredentials();

  if (!clientId || !clientSecret) {
    throw new Error("PayPal credentials not configured. Please add NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE and PAYPAL_CLIENT_SECRET_LIVE to your environment variables.");
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });

  if (!response.ok) {
    throw new Error(`Failed to obtain PayPal access token: ${await readPayPalErrorMessage(response)}`);
  }

  const data = await response.json();
  return z.object({ access_token: z.string().min(1) }).parse(data).access_token;
}

export async function createPayPalOrder(input: {
  accessToken: string;
  userId: string;
  expectedDrops: number;
  price: string;
}) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      intent: "CAPTURE",
      application_context: {
        shipping_preference: "NO_SHIPPING",
      },
      purchase_units: [
        {
          description: `${input.expectedDrops} Gum Drops - Virtual Currency`,
          amount: {
            currency_code: "USD",
            value: input.price,
          },
          custom_id: `${input.userId}:${input.expectedDrops}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create PayPal order: ${await readPayPalErrorMessage(response)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function capturePayPalOrder(orderId: string): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "PayPal-Request-Id": `capture_${orderId}`,
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal capture failed: ${await readPayPalErrorMessage(response)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export async function getPayPalOrder(orderId: string): Promise<Record<string, unknown>> {
  const accessToken = await getPayPalAccessToken();
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`PayPal order lookup failed: ${await readPayPalErrorMessage(response)}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}
