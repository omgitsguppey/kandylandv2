"use client";

import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import { ReactNode } from "react";

const environment = process.env.NEXT_PUBLIC_PAYPAL_ENV === "production" ? "production" : "sandbox";
const clientId = environment === "production"
  ? process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_LIVE
  : process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID_SANDBOX;

const initialOptions = {
  clientId: clientId || "",
  currency: "USD",
  intent: "capture",
  disableFunding: "credit,card",
};

interface PayPalProviderProps {
  children: ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  return <PayPalScriptProvider options={initialOptions} deferLoading>{children}</PayPalScriptProvider>;
}
