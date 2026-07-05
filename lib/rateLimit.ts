import { createServiceClient } from "./supabase/server";

const LIMIT_GUEST_PER_DAY = 5;
const LIMIT_USER_PER_DAY = 15;

export interface RateLimitCheck {
  allowed: boolean;
  currentCount: number;
  limit: number;
}

/**
 * owner: { type: 'guest', ref: device_id } atau { type: 'user', ref: auth.uid() }
 */
export async function checkAndIncrementRateLimit(owner: {
  type: "guest" | "user";
  ref: string;
}): Promise<RateLimitCheck> {
  const supabase = createServiceClient();
  const maxPerDay =
    owner.type === "guest" ? LIMIT_GUEST_PER_DAY : LIMIT_USER_PER_DAY;

  const { data, error } = await supabase.rpc("increment_rate_limit", {
    p_owner_type: owner.type,
    p_owner_ref: owner.ref,
    p_max_per_day: maxPerDay,
  });

  if (error) {
    // Kalau RPC error, fail-safe: jangan block user, tapi log biar ketauan
    console.error("[rateLimit] RPC error:", error.message);
    return { allowed: true, currentCount: 0, limit: maxPerDay };
  }

  return {
    allowed: data.allowed,
    currentCount: data.current_count,
    limit: data.limit,
  };
}