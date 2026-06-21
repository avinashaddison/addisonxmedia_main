// Compute the next subscription renewal date from an activation date and the
// upgrade request's billing cycle. Annual cycles renew in 1 year, everything
// else (monthly / unknown) renews in 1 month. This is the authoritative write
// behind the admin Renewals module (user.planRenewsAt).
export function computeRenewsAt(billingCycle: string | null | undefined, from: Date = new Date()): Date {
  const next = new Date(from);
  if ((billingCycle ?? "monthly").toLowerCase() === "annual") {
    next.setFullYear(next.getFullYear() + 1);
  } else {
    next.setMonth(next.getMonth() + 1);
  }
  return next;
}
