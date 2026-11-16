// admin-users - the only place that touches another account's sessions.
//
// Section 03 of the audit.
//
//   14. Sessions could not be revoked. Nothing could terminate another user's
//       sessions, so a compromised account stayed usable until its token
//       expired on its own.
//   15. Suspended users could still authenticate. A flag in a table is not
//       enough on its own: the account would simply obtain a fresh token and
//       keep working. Suspension here is paired with a ban in Supabase Auth, so
//       the account cannot authenticate at all.
//
// This is a single-file function with no imports, so it deploys as-is.
//
// Every action requires a verified caller holding user:manage. The caller is
// resolved from their bearer token against the auth server, never trusted from
// the request body.

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

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

/** Service-role headers for both the auth admin API and PostgREST. */
function serviceHeaders(): HeadersInit {
  return { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" };
}

/**
 * The caller's user id, verified against the auth server.
 *
 * Never derived from the request body: accepting an id from the client would
 * let anyone act as an administrator.
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
 * Whether the caller currently holds a permission.
 *
 * Resolved explicitly rather than through the has_permission() function,
 * because that reads auth.uid() from the database session and a service-role
 * request has none. A suspended caller is denied even if their role would
 * otherwise allow it.
 */
async function callerHas(userId: string, permission: string): Promise<boolean> {
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}&select=role,suspended_at`,
    { headers: serviceHeaders() },
  );
  if (!profileRes.ok) return false;
  const rows = await profileRes.json();
  const profile = rows?.[0];
  if (!profile?.role || profile.suspended_at) return false;

  const permRes = await fetch(
    `${SUPABASE_URL}/rest/v1/role_permissions?role=eq.${encodeURIComponent(profile.role)}&select=permission`,
    { headers: serviceHeaders() },
  );
  if (!permRes.ok) return false;
  const granted = await permRes.json();
  return Array.isArray(granted) && granted.some((row) => row.permission === permission);
}

/** Ban or unban an account in Supabase Auth, which is what actually blocks sign-in. */
async function setBanned(userId: string, banned: boolean, reason: string | null) {
  // A century is the documented way to express "indefinite" without a separate
  // deletion, and it is reversible by setting the duration back to none.
  const body: Record<string, unknown> = banned
    ? { ban_duration: "876000h" }
    : { ban_duration: "none" };
  if (banned && reason) body.user_metadata = { suspension_reason: reason };

  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}`, {
    method: "PUT",
    headers: serviceHeaders(),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`auth ban update failed (${res.status}): ${await res.text()}`);
  }
  return res.json();
}

/** End every session the account holds, everywhere. */
async function revokeSessions(userId: string) {
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout?scope=global`,
    { method: "POST", headers: serviceHeaders() },
  );
  if (!res.ok) {
    throw new Error(`session revocation failed (${res.status}): ${await res.text()}`);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply({ error: "method_not_allowed" }, 405);

  if (!SUPABASE_URL || !SERVICE_KEY) {
    return reply({ error: "not_configured" }, 503);
  }

  const actor = await callerId(req);
  if (!actor) return reply({ error: "unauthenticated" }, 401);

  if (!(await callerHas(actor, "user:manage"))) {
    // Deliberately one response for "not an administrator" and "suspended":
    // distinguishing them would confirm which accounts exist and are suspended.
    return reply({ error: "forbidden" }, 403);
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply({ error: "invalid_json" }, 400);
  }

  const action = String(body.action ?? "");
  const userId = String(body.userId ?? "").trim();
  const reason = body.reason ? String(body.reason) : null;

  if (!userId) return reply({ error: "missing_user_id" }, 400);

  // Removing your own access is almost always a mistake and would leave the
  // marketplace with no administrator able to undo it.
  if (userId === actor) {
    return reply({ error: "cannot_target_self" }, 400);
  }

  try {
    switch (action) {
      case "suspend": {
        await setBanned(userId, true, reason);
        // Mirrored into profiles so the application can show why, and so
        // has_permission() denies the account even if a token is still valid
        // somewhere. The auth ban is what stops a new token being issued.
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_user_suspended`, {
          method: "POST",
          // The function checks has_permission(), which needs the actor's
          // identity, so this call carries the caller's token rather than the
          // service key.
          headers: {
            apikey: SERVICE_KEY,
            Authorization: req.headers.get("authorization") ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_user_id: userId, p_suspended: true, p_reason: reason }),
        });
        if (!res.ok) {
          // Roll the ban back rather than leaving the two disagreeing.
          await setBanned(userId, false, null);
          throw new Error(`profile suspension failed: ${await res.text()}`);
        }
        return reply({ ok: true, action, userId, banned: true });
      }

      case "unsuspend": {
        await setBanned(userId, false, null);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/set_user_suspended`, {
          method: "POST",
          headers: {
            apikey: SERVICE_KEY,
            Authorization: req.headers.get("authorization") ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ p_user_id: userId, p_suspended: false, p_reason: null }),
        });
        if (!res.ok) throw new Error(`profile unsuspension failed: ${await res.text()}`);
        return reply({ ok: true, action, userId, banned: false });
      }

      case "revoke_sessions": {
        await revokeSessions(userId);
        return reply({ ok: true, action, userId });
      }

      default:
        return reply({ error: "unknown_action", action, supported: ["suspend", "unsuspend", "revoke_sessions"] }, 400);
    }
  } catch (error) {
    console.error("admin-users failed:", error);
    return reply({ error: "action_failed", detail: String((error as Error)?.message ?? error) }, 500);
  }
});
