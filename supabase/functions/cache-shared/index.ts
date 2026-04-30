import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

type GetBody = { op: "get"; key: string };
type SetBody = {
  op: "set";
  key: string;
  value: unknown;
  ttlSeconds: number;
  swrSeconds?: number;
};
type DelBody = { op: "del"; key?: string; prefix?: string };
type Body = GetBody | SetBody | DelBody;

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function validate(body: unknown): Body | null {
  if (!isObj(body)) return null;
  const op = body.op;
  if (op === "get" && typeof body.key === "string" && body.key.length <= 512) {
    return body as GetBody;
  }
  if (
    op === "set" &&
    typeof body.key === "string" &&
    body.key.length <= 512 &&
    typeof body.ttlSeconds === "number" &&
    body.ttlSeconds > 0 &&
    body.ttlSeconds <= 86400
  ) {
    return body as SetBody;
  }
  if (op === "del") {
    if (typeof (body as DelBody).key === "string") return body as DelBody;
    if (typeof (body as DelBody).prefix === "string") return body as DelBody;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const raw = await req.json();
    const body = validate(raw);
    if (!body) {
      return new Response(JSON.stringify({ error: "invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (body.op === "get") {
      const { data, error } = await supabase
        .from("cache_entries")
        .select("value, expires_at, stale_until")
        .eq("cache_key", body.key)
        .maybeSingle();

      if (error) throw error;

      const now = Date.now();
      if (!data) {
        return new Response(JSON.stringify({ status: "miss" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const expiresAt = new Date(data.expires_at).getTime();
      const staleUntil = new Date(data.stale_until).getTime();

      if (staleUntil < now) {
        return new Response(JSON.stringify({ status: "miss" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({
          status: expiresAt > now ? "fresh" : "stale",
          value: data.value,
          expiresAt,
          staleUntil,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (body.op === "set") {
      const ttlMs = body.ttlSeconds * 1000;
      const swrMs = (body.swrSeconds ?? 0) * 1000;
      const now = Date.now();
      const expiresAt = new Date(now + ttlMs).toISOString();
      const staleUntil = new Date(now + ttlMs + swrMs).toISOString();

      const { error } = await supabase
        .from("cache_entries")
        .upsert(
          {
            cache_key: body.key,
            value: body.value,
            expires_at: expiresAt,
            stale_until: staleUntil,
          },
          { onConflict: "cache_key" },
        );
      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // del
    if ((body as DelBody).key) {
      const { error } = await supabase
        .from("cache_entries")
        .delete()
        .eq("cache_key", (body as DelBody).key!);
      if (error) throw error;
    } else if ((body as DelBody).prefix) {
      const { error } = await supabase
        .from("cache_entries")
        .delete()
        .like("cache_key", `${(body as DelBody).prefix}%`);
      if (error) throw error;
    }
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("cache-shared error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
