import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { api } from "@/src/api/client";

WebBrowser.maybeCompleteAuthSession();

export interface PaymentResult {
  status: "success" | "failure" | "dismissed";
  tx_uuid?: string;
  appointment_id?: string;
  expires_at?: string;
}

interface InitiateOpts {
  use_case: "appointment" | "subscription";
  doctor_id?: string;
  slot_id?: string;
  consultation_type?: "clinic" | "video";
  patient_details?: Record<string, unknown>;
}

/** Kicks off the eSewa checkout via the backend and awaits the redirect back to the app. */
export async function payWithEsewa(opts: InitiateOpts): Promise<PaymentResult> {
  const returnUrl = Linking.createURL("/payment-return");
  const init = await api.post<{ checkout_url: string; transaction_uuid: string; amount: number }>(
    "/payments/initiate",
    { ...opts, return_url: returnUrl },
  );

  const result = await WebBrowser.openAuthSessionAsync(init.checkout_url, returnUrl, {
    showInRecents: false,
  });

  if (result.type !== "success" || !result.url) {
    return { status: "dismissed" };
  }
  const parsed = Linking.parse(result.url);
  const q = (parsed.queryParams || {}) as Record<string, string>;
  const status = q.status === "success" ? "success" : "failure";
  return {
    status,
    tx_uuid: q.tx_uuid,
    appointment_id: q.appointment_id,
    expires_at: q.expires_at,
  };
}
