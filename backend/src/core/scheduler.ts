import { db } from "../storage/db"

const PENDING_EXPIRY_MINUTES = 60
const CLEAN_INTERVAL_MS = 5 * 60 * 1000

export function startScheduler() {
  setInterval(async () => {
    try {
      await expireStaleApiCalls()
    } catch (err) {
      // swallow errors to keep scheduler alive
      console.error("scheduler error", err)
    }
  }, CLEAN_INTERVAL_MS)
}

async function expireStaleApiCalls() {
  await db.query(
    `update api_calls
     set status = 'expired', updated_at = now()
     where status = 'pending_payment'
       and created_at < now() - interval '${PENDING_EXPIRY_MINUTES} minutes'`
  )
}
