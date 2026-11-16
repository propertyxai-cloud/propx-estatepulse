import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}


async function enforceSearchQuota(req: Request): Promise<boolean> {
  const rawIp =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0];
  const ip = (rawIp ?? "unknown").trim().slice(0, 80) || "unknown";
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/consume_ai_quota`, {
      method: "POST",
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        p_identifier: `property-search:${ip}`,
        p_max: 60,
        p_window: "1 hour",
        p_global_max: 20000,
        p_global_window: "1 day",
      }),
    });
    if (response.ok) return true;
    const detail = await response.text();
    if (detail.includes("ai_rate_limit_exceeded") || detail.includes("ai_global_limit_exceeded")) return false;
    console.error("Property search quota service failed", response.status, detail.slice(0, 300));
    throw new Error("quota_service_unavailable");
  } catch (error) {
    console.error("Property search quota could not be enforced", error);
    throw error;
  }
}

function boundedText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().replace(/[\u0000-\u001f\u007f]/g, "").slice(0, max);
  return v || null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (!SUPABASE_URL || !SERVICE_KEY) return json({ error: "not_configured" }, 503);

  let quotaAllowed = false;
  try {
    quotaAllowed = await enforceSearchQuota(req);
  } catch {
    return json({ error: "search_temporarily_unavailable" }, 503);
  }
  if (!quotaAllowed) {
    return json({ error: "rate_limited", detail: "Search request limit reached. Please try again later." }, 429);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid");
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const query = boundedText(body.query, 100);
  const city = boundedText(body.city, 100);
  const countryCode = boundedText(body.country_code, 2)?.toUpperCase() ?? null;
  const listingType = boundedText(body.listing_type, 30);
  const propertyType = boundedText(body.property_type, 40);
  const currencyCode = boundedText(body.currency_code, 3)?.toUpperCase() ?? null;
  const minPrice = body.min_price === undefined || body.min_price === null || body.min_price === ""
    ? null : Number(body.min_price);
  const maxPrice = body.max_price === undefined || body.max_price === null || body.max_price === ""
    ? null : Number(body.max_price);
  const requestedLimit = Number(body.limit ?? 20);
  const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(50, Math.floor(requestedLimit))) : 20;
  const offsetRaw = Number(body.offset ?? 0);
  const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.min(10000, Math.floor(offsetRaw))) : 0;

  if (countryCode && !/^[A-Z]{2}$/.test(countryCode)) return json({ error: "invalid_country_code" }, 400);
  if (currencyCode && !/^[A-Z]{3}$/.test(currencyCode)) return json({ error: "invalid_currency_code" }, 400);
  if (minPrice !== null && (!Number.isFinite(minPrice) || minPrice < 0)) return json({ error: "invalid_min_price" }, 400);
  if (maxPrice !== null && (!Number.isFinite(maxPrice) || maxPrice < 0)) return json({ error: "invalid_max_price" }, 400);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) return json({ error: "invalid_price_range" }, 400);
  if ((minPrice !== null || maxPrice !== null) && !currencyCode) {
    return json({ error: "currency_required_for_price_filter" }, 400);
  }
  if (listingType && !/^[a-zA-Z _-]{1,30}$/.test(listingType)) return json({ error: "invalid_listing_type" }, 400);
  if (propertyType && !/^[a-zA-Z _-]{1,40}$/.test(propertyType)) return json({ error: "invalid_property_type" }, 400);

  const url = new URL(`${SUPABASE_URL}/rest/v1/properties`);
  url.searchParams.set("select", "id,title,listing_type,property_type,price,price_label,currency,currency_code,city,country,country_code,region,location,address,area,area_unit,beds,baths,description,features,images,lat,lng,featured,sponsored,verified,availability,created_at");
  url.searchParams.set("moderation_status", "eq.approved");
  url.searchParams.set("archived_at", "is.null");
  url.searchParams.set("availability", "in.(available,under_offer)");
  url.searchParams.set("order", "featured.desc,created_at.desc");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("offset", String(offset));
  if (query) url.searchParams.set("title", `ilike.*${query.replace(/[%_*]/g, "")}*`);
  if (city) url.searchParams.set("city", `ilike.*${city.replace(/[%_*]/g, "")}*`);
  if (countryCode) url.searchParams.set("country_code", `eq.${countryCode}`);
  if (currencyCode) url.searchParams.set("currency_code", `eq.${currencyCode}`);
  if (listingType) url.searchParams.set("listing_type", `ilike.${listingType}`);
  if (propertyType) url.searchParams.set("property_type", `ilike.${propertyType}`);
  if (minPrice !== null && maxPrice !== null) url.searchParams.set("and", `(price.gte.${minPrice},price.lte.${maxPrice})`);
  else if (minPrice !== null) url.searchParams.set("price", `gte.${minPrice}`);
  else if (maxPrice !== null) url.searchParams.set("price", `lte.${maxPrice}`);

  try {
    const response = await fetch(url, {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        Accept: "application/json",
        Prefer: "count=exact",
      },
    });
    if (!response.ok) {
      console.error("Property search database request failed", response.status);
      return json({ error: "search_unavailable" }, 502);
    }
    const properties = await response.json();
    const range = response.headers.get("content-range");
    const total = range && range.includes("/") ? Number(range.split("/")[1]) : null;

    const results = Array.isArray(properties) ? properties : [];
    const intents = query ? [
      ["investment", /invest|roi|yield|return|capital gain/i],
      ["family", /family|school|children|neighborhood/i],
      ["luxury", /luxury|penthouse|mansion|premium|villa/i],
      ["rental", /rent|lease|tenant|monthly/i],
      ["commercial", /office|shop|commercial|retail|warehouse/i],
      ["compare", /compare|versus|\\bvs\\b|better/i],
      ["valuation", /value|worth|price|estimate|market/i],
      ["location", /near|close to|distance|area|city/i],
    ].filter(([, pattern]) => pattern.test(query)).map(([name]) => name) : [];

    return json({
      query: query ?? "",
      intents,
      detected_city: city,
      price_limit: maxPrice === null ? null : String(maxPrice),
      confidence: null,
      summary: `Found ${results.length} live, approved listing(s) on PropertyX. Market forecasts are not inferred from listing search.`,
      recommendations: results,
      market_context: null,
      filters: { city, country_code: countryCode, listing_type: listingType, property_type: propertyType, currency_code: currencyCode, min_price: minPrice, max_price: maxPrice },
      results,
      pagination: { limit, offset, total: Number.isFinite(total) ? total : null, has_more: results.length === limit },
      source: "propertyx_live_listings",
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Property search failed", error);
    return json({ error: "search_unavailable" }, 502);
  }
});
