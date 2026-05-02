import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find overdue commission records (due_date passed, status not 'paid' or 'waived')
    const now = new Date().toISOString();
    const { data: overdue, error: fetchErr } = await supabase
      .from("commission_records")
      .select("id, tutor_id, commission_amount, due_date, status")
      .not("status", "in", '("paid","waived")')
      .lt("due_date", now);

    if (fetchErr) throw fetchErr;

    if (!overdue || overdue.length === 0) {
      return new Response(
        JSON.stringify({ message: "No overdue commissions found", reminders_sent: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark overdue records
    const overdueIds = overdue.filter(r => r.status !== "overdue").map(r => r.id);
    if (overdueIds.length > 0) {
      await supabase
        .from("commission_records")
        .update({ status: "overdue" })
        .in("id", overdueIds);
    }

    // Group by tutor and send one notification per tutor
    const tutorMap = new Map<string, { total: number; count: number }>();
    for (const r of overdue) {
      const curr = tutorMap.get(r.tutor_id) || { total: 0, count: 0 };
      curr.total += r.commission_amount || 0;
      curr.count += 1;
      tutorMap.set(r.tutor_id, curr);
    }

    // Get tutor user_ids
    const tutorIds = Array.from(tutorMap.keys());
    const { data: tutors } = await supabase
      .from("tutor_profiles")
      .select("id, user_id")
      .in("id", tutorIds);

    const notifications = (tutors || []).map(t => {
      const info = tutorMap.get(t.id)!;
      return {
        user_id: t.user_id,
        title: "Commission Payment Overdue",
        message: `You have ${info.count} overdue commission payment(s) totaling ৳${info.total.toLocaleString()}. Please settle your balance to avoid account suspension.`,
        type: "commission_reminder",
      };
    });

    if (notifications.length > 0) {
      await supabase.from("notifications").insert(notifications);
    }

    // Log the action
    await supabase.from("activity_logs").insert({
      actor_id: "00000000-0000-0000-0000-000000000000",
      action: "automated_commission_reminders",
      target_type: "system",
      details: { overdue_count: overdue.length, tutors_notified: notifications.length },
    });

    return new Response(
      JSON.stringify({
        message: "Commission reminders sent",
        overdue_count: overdue.length,
        reminders_sent: notifications.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
