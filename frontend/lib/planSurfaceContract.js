export function normalizePlanStatus(value) {
  return String(value || "").trim().toLowerCase();
}

export function hasEnteredPlanFlow({
  checkoutStarted,
  checkoutSessionId,
  paymentStatus,
  subscriptionStatus,
  localPlanFlowEntered,
} = {}) {
  const normalizedPaymentStatus = normalizePlanStatus(paymentStatus);

  return Boolean(
    checkoutStarted === true ||
      checkoutSessionId ||
      ["checkout_created", "checkout_started", "pending"].includes(
        normalizedPaymentStatus
      ) ||
      normalizePlanStatus(subscriptionStatus) ||
      localPlanFlowEntered === true
  );
}

export function isSubscriptionActive({
  subscriptionStatus,
  subscriptionActive,
  planActive,
} = {}) {
  const normalizedSubscriptionStatus = normalizePlanStatus(subscriptionStatus);

  return Boolean(
    subscriptionActive === true ||
      planActive === true ||
      ["active", "trialing"].includes(normalizedSubscriptionStatus)
  );
}

export function getPlanSurfaceContract({
  checkoutStarted,
  checkoutSessionId,
  paymentStatus,
  subscriptionStatus,
  subscriptionActive,
  planActive,
  localPlanFlowEntered,
} = {}) {
  const enteredPlanFlow = hasEnteredPlanFlow({
    checkoutStarted,
    checkoutSessionId,
    paymentStatus,
    subscriptionStatus,
    localPlanFlowEntered,
  });
  const activeSubscription = isSubscriptionActive({
    subscriptionStatus,
    subscriptionActive,
    planActive,
  });

  if (activeSubscription) {
    return {
      outerCtaLabel: "Manage Plan",
      outerCtaMode: "manage_plan",
      showCancelPlan: true,
      cancelPlanPlacement: "manage_plan_modal_only",
      showCustomerCheckoutState: false,
      modalPrimaryLabel: "Manage Billing",
      modalMode: "active_subscription",
    };
  }

  if (enteredPlanFlow) {
    return {
      outerCtaLabel: "Manage Plan",
      outerCtaMode: "manage_plan",
      showCancelPlan: false,
      cancelPlanPlacement: "hidden",
      showCustomerCheckoutState: false,
      modalPrimaryLabel: "Continue Plan",
      modalMode: "resume_plan",
    };
  }

  return {
    outerCtaLabel: "Continue Plan",
    outerCtaMode: "continue_plan",
    showCancelPlan: false,
    cancelPlanPlacement: "hidden",
    showCustomerCheckoutState: false,
    modalPrimaryLabel: "Continue Plan",
    modalMode: "plan_intro",
  };
}
