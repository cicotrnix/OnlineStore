#!/usr/bin/env node
import '@/modules/events/subscribers'
import { processPendingDeliveries } from '@/modules/webhooks'

async function main() {
  const r = await processPendingDeliveries({ batchSize: 50 })
  console.log(JSON.stringify(r))
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
