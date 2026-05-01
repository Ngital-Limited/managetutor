import { supabase } from '@/integrations/supabase/client';

/**
 * Log an admin action to the activity_logs table.
 * Fire-and-forget — does not throw on failure.
 */
export async function logAdminAction(
  actorId: string,
  action: string,
  targetType: string,
  targetId?: string,
  details?: Record<string, any>,
) {
  try {
    await supabase.from('activity_logs' as any).insert({
      actor_id: actorId,
      action,
      target_type: targetType,
      target_id: targetId || null,
      details: details || {},
    } as any);
  } catch {
    // Silently fail — audit logging should never block operations
  }
}
