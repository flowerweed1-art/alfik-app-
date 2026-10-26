// ALFIK test push sender.
// Sends only to the authenticated caller's own saved subscriptions.
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://alfik.co.uk",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Sign-in required." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !publicKey || !privateKey) {
    return new Response(JSON.stringify({ error: "Push function secrets are not configured." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } }, auth: { persistSession: false } });
  const { data: { user }, error: userError } = await userClient.auth.getUser();
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Your session could not be verified. Please sign in again." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    webpush.setVapidDetails("mailto:notifications@alfik.co.uk", publicKey, privateKey);
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: subscriptions, error } = await admin
      .from("alfik_push_subscriptions")
      .select("id, subscription")
      .eq("user_id", user.id);

    if (error) throw error;
    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ error: "No phone subscription found yet. Enable notifications in ALFIK first." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let sent = 0;
    let failed = 0;
    for (const row of subscriptions) {
      try {
        await webpush.sendNotification(row.subscription, JSON.stringify({
          title: "ALFIK test notification 🐾",
          body: "Great news! ALFIK push notifications are connected to your phone.",
          url: "/"
        }));
        sent++;
        console.log("Push service accepted notification for subscription", row.id);
      } catch (err) {
        failed++;
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await admin.from("alfik_push_subscriptions").delete().eq("id", row.id).eq("user_id", user.id);
        }
        const detail = (err as { message?: string; body?: string }).body || (err as { message?: string }).message || "Unknown push error";
        console.error("Push delivery failed:", statusCode || "unknown", detail);
      }
    }

    return new Response(JSON.stringify({ sent, failed, message: sent ? "Push service accepted the request; this does not confirm the phone displayed it." : "Push delivery failed. Check results and function logs." }), { status: sent ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("Push function error:", err);
    return new Response(JSON.stringify({ error: "Push sending failed. Check the function logs." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
