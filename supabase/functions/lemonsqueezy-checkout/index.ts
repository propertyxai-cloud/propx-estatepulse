// lemonsqueezy-checkout
//
// Creates a Lemon Squeezy checkout for a PropertyX plan.
//
// The browser sends a plan code and nothing else. Price, currency, billing
// interval and the provider variant are all read from the catalogue in the
// database, so a tampered request cannot change what is being sold or what it
// costs. This is the correction for the Safepay function it replaces, which
// accepted amount_minor and currency from the request body and would therefore
// have sold a listing boost for any price the caller chose.
//
// The account the purchase belongs to is attached as provider custom data, so
// the webhook can attribute it without trusting anything the browser sends
// afterwards.
//
// Single-file with no imports, so it deploys as-is.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const LS_API = "https://api.lemonsqueezy.com/v1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function serviceHeaders(): HeadersInit {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

/**
 * The caller, verified against the auth server.
 *
 * Never taken from the body: an id supplied by the client would let anyone
 * attribute a purchase to somebody else.
 */
async function callerId(req: Request): Promise<string | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Which mode this deployment is in.
 *
 * Read from the server environment, never inferred from the store's dashboard
 * toggle, which reflects only what is being viewed.
 */
function billingMode(): "test" | "live" | null {
  const configured = (Deno.env.get("LEMONSQUEEZY_MODE") ?? "").trim().toLowerCase();
  if (configured === "test" || configured === "live") return configured;
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  const apiKey = Deno.env.get("LEMONSQUEEZY_API_KEY");
  const storeId = Deno.env.get("LEMONSQUEEZY_STORE_ID");
  const siteUrl = Deno.env.get("SITE_URL");

  if (!SUPABASE_URL || !SERVICE_KEY) return reply({ error: "not_configured" }, 503);
  if (!apiKey || !storeId || !siteUrl) return reply({ error: "billing_not_configured" }, 503);

  const userId = await callerId(req);
  if (!userId) return reply({ error: "authentication_required" }, 401);

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return reply({ error: "invalid_json" }, 400);
  }

  // A plan code, and only a plan code.
  const planCode = String(payload.planCode ?? "").trim();
  if (!planCode) return reply({ error: "missing_plan_code" }, 400);

  try {
    const planRes = await fetch(
      `${SUPABASE_URL}/rest/v1/checkout_products?code=eq.${encodeURIComponent(planCode)}` +
        `&provider=eq.lemonsqueezy&select=id,code,name,amount_minor,currency,active,provider_variant_id,billing_interval`,
      { headers: serviceHeaders() },
    );
    if (!planRes.ok) throw new Error(`plan lookup failed (${planRes.status})`);
    const plans = await planRes.json();
    const plan = Array.isArray(plans) ? plans[0] : null;

    if (!plan) return reply({ error: "unknown_plan", planCode }, 404);

    // A plan whose provider variant is still awaiting review cannot be bought,
    // so it is refused here rather than failing at the provider with a
    // confusing error.
    if (!plan.active) {
      return reply(
        {
          error: "plan_not_available",
          planCode,
          reason: "This plan is not open for purchase yet.",
        },
        409,
      );
    }
    if (!plan.provider_variant_id || !/^\d+$/.test(String(plan.provider_variant_id))) {
      return reply({ error: "plan_misconfigured", planCode }, 500);
    }
    if (!Number.isSafeInteger(Number(plan.amount_minor)) || Number(plan.amount_minor) < 1
      || !/^[A-Z]{3}$/.test(String(plan.currency ?? "").toUpperCase())) {
      return reply({ error: "plan_price_misconfigured", planCode }, 500);
    }

    const mode = billingMode();
    if (!mode) {
      return reply({ error: "billing_mode_not_configured" }, 503);
    }

    // Recorded before the provider call so a failure still leaves a trace, and
    // so the webhook has an order row to attach the purchase to.
    const reference = `px_${crypto.randomUUID()}`;
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/payment_orders`, {
      method: "POST",
      headers: { ...serviceHeaders(), Prefer: "return=representation" },
      body: JSON.stringify({
        owner_id: userId,
        app_user_id: userId,
        product_id: plan.id,
        provider: "lemonsqueezy",
        merchant_reference: reference,
        amount_minor: plan.amount_minor,
        currency: plan.currency,
        status: "created",
        mode,
        provider_variant_id: plan.provider_variant_id,
      }),
    });
    if (!orderRes.ok) throw new Error(`order insert failed (${orderRes.status}): ${await orderRes.text()}`);
    const orders = await orderRes.json();
    const order = Array.isArray(orders) ? orders[0] : null;
    if (!order?.id) throw new Error("order insert returned no row");

    const checkoutRes = await fetch(`${LS_API}/checkouts`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.api+json",
        "Content-Type": "application/vnd.api+json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        data: {
          type: "checkouts",
          attributes: {
            // custom is echoed back on every webhook for this purchase, which
            // is how the webhook knows which account it belongs to.
            checkout_data: {
              custom: { user_id: userId, order_id: order.id, reference },
            },
            product_options: {
              redirect_url: `${siteUrl}/billing/return?order=${order.id}`,
              enabled_variants: [Number(plan.provider_variant_id)],
            },
            checkout_options: {
              // The variant decides the price; nothing here can change it.
              embed: false,
              media: true,
              logo: true,
            },
            expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          },
          relationships: {
            store: { data: { type: "stores", id: String(storeId) } },
            variant: { data: { type: "variants", id: String(plan.provider_variant_id) } },
          },
        },
      }),
    });

    if (!checkoutRes.ok) {
      const detail = await checkoutRes.text();
      console.error("Lemon Squeezy checkout failed", checkoutRes.status, detail);
      await fetch(`${SUPABASE_URL}/rest/v1/payment_orders?id=eq.${order.id}`, {
        method: "PATCH",
        headers: serviceHeaders(),
        body: JSON.stringify({ status: "failed" }),
      });
      return reply({ error: "checkout_unavailable" }, 502);
    }

    const checkout = await checkoutRes.json();
    const url = checkout?.data?.attributes?.url;
    if (!url) throw new Error("provider returned no checkout url");

    await fetch(`${SUPABASE_URL}/rest/v1/payment_orders?id=eq.${order.id}`, {
      method: "PATCH",
      headers: serviceHeaders(),
      body: JSON.stringify({ status: "pending", checkout_url: url }),
    });

    return reply({ orderId: order.id, checkoutUrl: url, mode });
  } catch (error) {
    console.error("Checkout error:", error);
    return reply({ error: "checkout_unavailable" }, 502);
  }
});
