// Admin user actions: password reset, force signout, email update, broadcast email
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const RESEND_KEY = Deno.env.get("RESEND_API_KEY");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    // Verify caller is admin
    const caller = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await caller.auth.getUser();
    if (!userData?.user) return json({ error: "Unauthorized" }, 401);
    const { data: roles } = await caller.from("user_roles").select("role").eq("user_id", userData.user.id);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const body = await req.json();
    const action = body.action as string;

    const logAction = async (a: string, details: any, targetUserId?: string) => {
      await admin.from("admin_audit_log").insert({
        actor_id: userData.user.id,
        actor_email: userData.user.email,
        action: a,
        target_type: "user",
        target_user_id: targetUserId,
        details,
      });
    };

    if (action === "reset_password") {
      const { data: u } = await admin.auth.admin.getUserById(body.user_id);
      if (!u?.user?.email) return json({ error: "User has no email" }, 400);
      const { error } = await admin.auth.resetPasswordForEmail(u.user.email, {
        redirectTo: body.redirect_to ?? `${new URL(req.url).origin}/reset-password`,
      });
      if (error) return json({ error: error.message }, 400);
      await logAction("password_reset_sent", { email: u.user.email }, body.user_id);
      return json({ ok: true });
    }

    if (action === "force_signout") {
      const { error } = await admin.auth.admin.signOut(body.user_id, "global");
      if (error) return json({ error: error.message }, 400);
      await logAction("force_signout", {}, body.user_id);
      return json({ ok: true });
    }

    if (action === "update_email") {
      const { error } = await admin.auth.admin.updateUserById(body.user_id, { email: body.email, email_confirm: true });
      if (error) return json({ error: error.message }, 400);
      await logAction("email_updated", { new_email: body.email }, body.user_id);
      return json({ ok: true });
    }

    if (action === "delete_user") {
      if (!body.user_id) return json({ error: "user_id required" }, 400);
      if (body.user_id === userData.user.id) return json({ error: "You cannot delete your own account" }, 400);
      const { data: u } = await admin.auth.admin.getUserById(body.user_id);
      if (!u?.user) return json({ error: "User not found" }, 404);
      // Block deleting other admins
      const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", body.user_id);
      if ((targetRoles ?? []).some((r: any) => r.role === "admin" || r.role === "super_admin")) {
        return json({ error: "Cannot delete an admin account" }, 403);
      }
      await logAction("user_deleted", { email: u.user.email }, body.user_id);
      const { error } = await admin.auth.admin.deleteUser(body.user_id);
      if (error) return json({ error: error.message }, 400);
      return json({ ok: true });
    }

    if (action === "broadcast_email") {
      if (!RESEND_KEY) return json({ error: "RESEND_API_KEY not configured" }, 500);
      const segment = body.segment ?? "all"; // all | not_banned | kyc_approved
      let q = admin.from("profiles").select("id, is_banned");
      if (segment === "not_banned") q = q.eq("is_banned", false);
      const { data: profiles } = await q;
      let ids = (profiles ?? []).map((p: any) => p.id);
      if (segment === "kyc_approved") {
        const { data: kyc } = await admin.from("user_kyc").select("user_id").eq("status", "approved");
        const approved = new Set((kyc ?? []).map((k: any) => k.user_id));
        ids = ids.filter((id) => approved.has(id));
      }
      // pull emails
      const emails: string[] = [];
      for (const id of ids) {
        const { data: au } = await admin.auth.admin.getUserById(id);
        if (au?.user?.email) emails.push(au.user.email);
      }
      let sent = 0;
      const from = body.from ?? "BlackPAL <noreply@blackpal.lovable.app>";
      // Resend supports up to 50 recipients per batch in `to`; we use BCC chunks
      for (let i = 0; i < emails.length; i += 50) {
        const chunk = emails.slice(i, i + 50);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from, to: from, bcc: chunk, subject: body.subject, html: body.html }),
        });
        if (res.ok) sent += chunk.length;
      }
      await logAction("broadcast_email", { subject: body.subject, segment, sent });
      return json({ ok: true, sent, total: emails.length });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});
