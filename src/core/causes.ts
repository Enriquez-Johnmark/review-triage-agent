import { z } from "zod"

/** What a review is about: one of an app's causes, decided per app. */
export interface Cause {
  /** Stable code, stored with each label. */
  id: string
  /** What the Owner reads. */
  label: string
  /** What the model is told the cause covers. */
  description: string
}

/** The default causes for a finance app (spec, Round 1). Other kinds of app
 *  set their own in the settings. */
export const FINANCE_CAUSES: readonly Cause[] = [
  {
    id: "crash",
    label: "Crash or won't open",
    description: "the app crashes, freezes, won't open, or forces updates",
  },
  { id: "sign_up", label: "Sign-up", description: "can't create an account or finish registering" },
  {
    id: "login",
    label: "Login, PIN or OTP",
    description: "can't log in, PIN or password problems, OTP not arriving",
  },
  { id: "id_verification", label: "ID verification", description: "ID, selfie or face verification fails" },
  {
    id: "failed_transaction",
    label: "Failed or pending transaction",
    description: "a payment, transfer or bill payment failed or is stuck, money deducted or not received",
  },
  {
    id: "cash_out",
    label: "Cash-out or transfer delay",
    description: "cash-out or bank transfer is slow or delayed",
  },
  { id: "fees", label: "Fees", description: "complaints about fees or charges" },
  {
    id: "support",
    label: "Support or no response",
    description: "customer support doesn't answer or doesn't help",
  },
  { id: "praise", label: "Praise", description: "a positive review with no complaint" },
  { id: "other", label: "Other", description: "anything else, including feature requests" },
]

/** The languages a review can be in. */
export const Language = z.enum(["taglish", "tagalog", "english"])
export type Language = z.infer<typeof Language>
