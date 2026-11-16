// lemonsqueezy-webhook
//
// Receives Lemon Squeezy order and subscription events and writes entitlement
// state. This is the only place a paid entitlement can be granted.
//
// Rules this function is built around:
//
//   - The signature is verified over the exact raw request body. Parsing first
//     and re-serialising would change the bytes and make the signature
//     meaningless, so the body is read as text and only parsed afterwards.
//   - It fails closed. A missing signing secret or a bad signature is a refusal,
//     never a warning.
//   - Only variants that map to a PropertyX plan in our own catalogue are
//     honoured. The provider account holds products for other applications, and
//     a variant from one of those must not create an entitlement here.
//   - Deliveries are deduplicated, and every write is an upsert keyed on the
//     provider's own identifiers, so a retry cannot grant the same entitlement
//     twice.
//   - Test-mode events are recorded but grant nothing. A dashboard toggle
//     decides only what is displayed; the payload decides what is real.
//
// Single-file with no imports, so it deploys as-is.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

function serviceHeaders(): HeadersInit {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

/** Constant-time comparison, so a wrong signature cannot be found byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

/**
 * Verify the Lemon Squeezy signature header against the raw body.
 *
 * Returns false rather than throwing, so the caller decides the response and
 * nothing is written on a doubtful signature.
 */
async function verifySignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  if (!header) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
  return timingSafeEqual(expected, header.trim().toLowerCase());
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SUBSCRIPTION_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_resumed",
  "subscription_unpaused",
  "subscription_paused",
  "subscription_cancelled",
  "subscription_expired",
  "subscription_payment_failed",
  "subscription_payment_success",
  "subscription_payment_recovered",
  "subscription_plan_changed",
]);

const ORDER_EVENTS = new Set(["order_created", "order_refunded"]);

const ALLOWED_STATUSES = new Set([
  "on_trial",
  "active",
  "paused",
  "past_due",
  "unpaid",
  "cancelled",
  "expired",
]);

type Row = Record<string, unknown>;

/** The plan row for a provider variant, or null when the variant is not ours. */
async function planForVariant(variantId: string): Promise<Row | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/checkout_products` +
      `?provider=eq.lemonsqueezy&provider_variant_id=eq.${encodeURIComponent(variantId)}` +
      `&select=id,code,currency,amount_minor,billing_interval`,
    { headers: serviceHeaders() },
  );
  if (!res.ok) throw new Error(`plan lookup failed (${res.status})`);
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

/** An existing subscription row, used to keep attribution across events. */
async function existingSubscription(subscriptionId: string): Promise<Row | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions` +
      `?provider=eq.lemonsqueezy&provider_subscription_id=eq.${encodeURIComponent(subscriptionId)}` +
      `&select=id,user_id,plan_id`,
    { headers: serviceHeaders() },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

async function paymentOrder(orderId: string): Promise<Row | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/payment_orders` +
      `?provider=eq.lemonsqueezy&provider_order_id=eq.${encodeURIComponent(orderId)}` +
      `&select=id,owner_id,app_user_id,product_id`,
    { headers: serviceHeaders() },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length ? rows[0] : null;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  // Two secrets, because Lemon Squeezy issues a separate webhook record - and
  // therefore a separate signing secret - for test mode and for live mode. A
  // single secret would force the test webhook and the live webhook to share
  // one value, which would make a test delivery indistinguishable from a live
  // one at the transport layer.
  const liveSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET");
  const testSecret = Deno.env.get("LEMONSQUEEZY_WEBHOOK_SECRET_TEST");
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  // Fail closed. Without at least one secret nothing can be verified, so
  // nothing is trusted; the endpoint refuses rather than assuming.
  if (!liveSecret && !testSecret) {
    console.error("No Lemon Squeezy webhook secret is set; refusing all deliveries");
    return json({ error: "webhook_not_configured" }, 503);
  }

  // The raw body, before any parsing, because that is what was signed.
  const rawBody = await req.text();

  const signature = req.headers.get("x-signature");
  let matchedSecret: "live" | "test" | null = null;

  if (liveSecret && (await verifySignature(rawBody, signature, liveSecret))) {
    matchedSecret = "live";
  } else if (testSecret && (await verifySignature(rawBody, signature, testSecret))) {
    matchedSecret = "test";
  }

  if (!matchedSecret) {
    // Deliberately terse: a rejected delivery should not echo anything back.
    console.error("Rejected Lemon Squeezy delivery: signature did not match");
    return json({ error: "invalid_signature" }, 401);
  }

  let payload: Row;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const meta = (payload.meta ?? {}) as Row;
  const eventName = String(meta.event_name ?? "");
  const data = (payload.data ?? {}) as Row;
  const attributes = (data.attributes ?? {}) as Row;
  const resourceId = String(data.id ?? "");
  const resourceType = String(data.type ?? "");
  const customData = (meta.custom_data ?? {}) as Row;

  if (!eventName || !resourceId || !resourceType) {
    return json({ error: "malformed_event" }, 400);
  }

  const testMode = meta.test_mode === true || attributes.test_mode === true;
  const mode = testMode ? "test" : "live";

  // The secret that signed the delivery and the mode the payload claims must
  // agree. Without this, a payload signed with the test secret could assert
  // test_mode false and be recorded as a live purchase - which is exactly the
  // confusion the two secrets exist to prevent.
  if (matchedSecret === "test" && mode === "live") {
    console.error("Rejected: test-signed delivery claims live mode");
    return json({ error: "mode_mismatch" }, 401);
  }

  // Identifies one state change. A replay of the same change produces the same
  // key and is dropped; a genuine change in state produces a new one.
  const stamp = String(attributes.updated_at ?? attributes.created_at ?? attributes.status ?? "");
  const eventKey = `${eventName}:${resourceType}:${resourceId}:${stamp}`;

  // Claim the event before doing any work. A duplicate key means another
  // delivery already handled it.
  const claimRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_events`, {
    method: "POST",
    headers: { ...serviceHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({
      provider: "lemonsqueezy",
      provider_event_id: eventKey,
      event_type: eventName,
      payload: { mode, resource_type: resourceType, resource_id: resourceId },
    }),
  });

  if (claimRes.status === 409) {
    return json({ ok: true, duplicate: true, event: eventName });
  }
  if (!claimRes.ok) {
    // Not claimed, so not processed. Ask for a retry rather than risking a
    // duplicate entitlement.
    console.error("Could not record event", claimRes.status, await claimRes.text());
    return json({ error: "event_log_unavailable" }, 500);
  }

  try {
    if (SUBSCRIPTION_EVENTS.has(eventName)) {
      const variantId = String(attributes.variant_id ?? "");
      const plan = variantId ? await planForVariant(variantId) : null;

      if (!plan) {
        // The variant is not one of ours. The store also holds products for
        // other applications, and honouring those here would grant a PropertyX
        // entitlement for something else entirely.
        console.error("Ignoring subscription for unmapped variant", variantId);
        return json({ ok: true, ignored: "variant_not_in_catalogue", event: eventName });
      }

      const status = String(attributes.status ?? "");
      if (!ALLOWED_STATUSES.has(status)) {
        console.error("Ignoring unknown subscription status", status);
        return json({ ok: true, ignored: "unknown_status", status });
      }

      const prior = await existingSubscription(resourceId);

      // Attribution: the id carried through checkout, then the existing row,
      // never anything else. An event that cannot be attributed is refused
      // rather than guessed at.
      const userId = String(
        customData.user_id ?? prior?.user_id ?? "",
      ).trim();

      if (!userId) {
        console.error("Subscription has no attributable user", resourceId);
        return json({ error: "unattributable_event" }, 422);
      }

      const currency = String(attributes.currency ?? plan.currency ?? "USD").toUpperCase().slice(0, 3);

      const row = {
        user_id: userId,
        plan_id: plan.id,
        provider: "lemonsqueezy",
        provider_subscription_id: resourceId,
        provider_customer_id: attributes.customer_id ? String(attributes.customer_id) : null,
        provider_order_id: attributes.order_id ? String(attributes.order_id) : null,
        provider_variant_id: variantId || null,
        provider_product_id: attributes.product_id ? String(attributes.product_id) : null,
        status,
        currency,
        amount_minor: plan.amount_minor,
        renews_at: attributes.renews_at ?? null,
        ends_at: attributes.ends_at ?? null,
        trial_ends_at: attributes.trial_ends_at ?? null,
        cancelled_at: attributes.cancelled_at ?? null,
        paused_at: attributes.pause ? new Date().toISOString() : null,
        mode,
        updated_at: new Date().toISOString(),
      };

      // Upsert on the provider's own subscription id, so a replayed or
      // out-of-order delivery updates the row rather than inserting a second
      // one and granting a second entitlement.
      const upsertRes = await fetch(
        `${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=provider,provider_subscription_id`,
        {
          method: "POST",
          headers: { ...serviceHeaders(), Prefer: "resolution=merge-duplicates,return=minimal" },
          body: JSON.stringify(row),
        },
      );
      if (!upsertRes.ok) {
        throw new Error(`subscription upsert failed (${upsertRes.status}): ${await upsertRes.text()}`);
      }

      return json({ ok: true, event: eventName, status, mode });
    }

    if (ORDER_EVENTS.has(eventName)) {
      const orderId = resourceId;
      const status = String(attributes.status ?? "");

      // order_created may arrive before the checkout row has been matched, so
      // the reference from custom data is used as the fallback key.
      const reference = String(customData.reference ?? "");
      const order = await paymentOrder(orderId);

      const mapped =
        status === "paid"
          ? "paid"
          : status === "refunded"
            ? "refunded"
            : status === "failed"
              ? "failed"
              : "pending";

      const patch: Row = {
        provider_order_id: orderId,
        provider_customer_id: attributes.customer_id ? String(attributes.customer_id) : null,
        status: mapped,
        mode,
        updated_at: new Date().toISOString(),
      };
      if (mapped === "paid") patch.paid_at = new Date().toISOString();
      if (mapped === "refunded") patch.refunded_at = new Date().toISOString();

      // The amount actually charged, which the provider is authoritative for.
      const total = Number(attributes.total);
      if (Number.isSafeInteger(total) && total > 0) patch.amount_minor = total;
      if (typeof attributes.currency === "string" && /^[A-Za-z]{3}$/.test(attributes.currency)) {
        patch.currency = attributes.currency.toUpperCase();
      }

      const filter = order
        ? `id=eq.${order.id}`
        : reference
          ? `merchant_reference=eq.${encodeURIComponent(reference)}`
          : `provider_order_id=eq.${encodeURIComponent(orderId)}`;

      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_orders?${filter}`, {
        method: "PATCH",
        headers: { ...serviceHeaders(), Prefer: "return=minimal" },
        body: JSON.stringify(patch),
      });
      if (!patchRes.ok) {
        throw new Error(`order update failed (${patchRes.status}): ${await patchRes.text()}`);
      }

      return json({ ok: true, event: eventName, status: mapped, mode });
    }

    // Anything else is recorded and acknowledged, so the provider does not keep
    // retrying an event this application has no use for.
    return json({ ok: true, ignored: "unhandled_event", event: eventName });
  } catch (error) {
    console.error("Webhook processing failed:", error);
    // The event was already claimed, so remove the claim to allow a genuine
    // retry to be processed rather than silently swallowed.
    await fetch(
      `${SUPABASE_URL}/rest/v1/payment_events?provider=eq.lemonsqueezy&provider_event_id=eq.${encodeURIComponent(eventKey)}`,
      { method: "DELETE", headers: serviceHeaders() },
    ).catch(() => undefined);
    return json({ error: "processing_failed" }, 500);
  }
});
