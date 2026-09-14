import { createAdminClient } from "@/app/supabase/admin";

type LogActivityInput = {
  actorUserId?: string | null;
  actorRole?: string | null;
  actorName?: string | null;

  actionType: string;
  actionLabel: string;
  description?: string | null;

  area?: string;

  targetType?: string | null;
  targetId?: string | null;
  targetName?: string | null;

  metadata?: Record<string, unknown>;

  source?: "user" | "ai" | "system";
  aiRequestedBy?: string | null;
};

export async function logActivity(input: LogActivityInput) {
  try {
    const supabase = createAdminClient();

    const { error } = await supabase
      .from("crownlink_activity_log")
      .insert({
        actor_user_id: input.actorUserId ?? null,
        actor_role: input.actorRole ?? null,
        actor_name: input.actorName ?? null,

        action_type: input.actionType,
        action_label: input.actionLabel,
        description: input.description ?? null,

        area: input.area ?? "system",

        target_type: input.targetType ?? null,
        target_id: input.targetId ?? null,
        target_name: input.targetName ?? null,

        metadata: input.metadata ?? {},

        source: input.source ?? "user",
        ai_requested_by: input.aiRequestedBy ?? null,
      });

    if (error) {
      console.error("Activity log insert failed:", error);
    }
  } catch (error) {
    console.error("Activity log error:", error);
  }
}