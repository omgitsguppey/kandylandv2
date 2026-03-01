"use client";

import { PayPalScriptProvider, ReactPayPalScriptOptions } from "@paypal/react-paypal-js";
import { ReactNode } from "react";

const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE;

const normalizedClientId = clientId?.trim() ?? "";

const initialOptions: ReactPayPalScriptOptions = {
  clientId: normalizedClientId || "test", // 'test' prevents instant crash if empty, but ensures it can't run a real sb transaction
  currency: "USD",
  intent: "capture",
  disableFunding: "credit,card",
};

interface PayPalProviderProps {
  children: ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  return (
    <PayPalScriptProvider options={initialOptions} deferLoading>
      {children}
    </PayPalScriptProvider>
  );
}
