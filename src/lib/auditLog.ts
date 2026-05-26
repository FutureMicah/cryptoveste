import { supabase } from "@/integrations/supabase/client";

export async function logAdminAction(
  action: string,
  opts: {
    targetType?: string;
    targetId?: string | null;
    targetUserId?: string | null;
    details?: Record<string, unknown>;
  } = {}
) {
  try {
    await supabase.rpc("log_admin_action", {
      _action: action,
      _target_type: opts.targetType ?? null,
      _target_id: opts.targetId ?? null,
      _target_user_id: opts.targetUserId ?? null,
      _details: (opts.details ?? {}) as any,
    });
  } catch (e) {
    // best-effort; don't block UI
    console.warn("audit log failed", e);
  }
}
