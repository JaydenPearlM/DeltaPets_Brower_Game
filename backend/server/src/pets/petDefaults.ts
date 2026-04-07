// backend/server/src/lib/petDefaults.ts
import { nowIsoFromMs } from "../lib/time";

export function defaultFeedFields(serverNowMs: number) {
  const nowIso = nowIsoFromMs(serverNowMs);
  return {
    last_fed_at: nowIso,
    // you can also initialize other "last_*" here if you want:
    // last_cleaned_at: nowIso,
    // last_played_at: nowIso,
  };
}
