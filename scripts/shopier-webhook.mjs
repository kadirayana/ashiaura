// Manage the Shopier order.created webhook subscription.
//
//   node scripts/shopier-webhook.mjs list
//   node scripts/shopier-webhook.mjs create https://ashiaura.com/api/shopier/webhook
//   node scripts/shopier-webhook.mjs delete <webhookId>
//
// Reads SHOPIER_PAT from .env.local. On create, Shopier returns the signing token
// only once; it is written to .env.local as SHOPIER_WEBHOOK_TOKEN and never printed.
import { readFileSync, writeFileSync } from 'node:fs'

const ENV_FILE = '.env.local'
const env = readFileSync(ENV_FILE, 'utf8')
const pat = env.match(/^SHOPIER_PAT=(.+)$/m)?.[1]?.trim()
if (!pat) {
    console.error(`SHOPIER_PAT not found in ${ENV_FILE}`)
    process.exit(1)
}

async function api(path, init = {}) {
    const res = await fetch(`https://api.shopier.com/v1${path}`, {
        ...init,
        headers: { Authorization: `Bearer ${pat}`, Accept: 'application/json', 'Content-Type': 'application/json' },
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`${res.status} ${text}`)
    return text ? JSON.parse(text) : null
}

const [command, arg] = process.argv.slice(2)

if (command === 'list') {
    const hooks = await api('/webhooks')
    for (const h of hooks) console.log(`${h.id}  ${h.event}  ${h.url}`)
    if (hooks.length === 0) console.log('No webhooks.')
} else if (command === 'create' && arg) {
    const hook = await api('/webhooks', { method: 'POST', body: JSON.stringify({ event: 'order.created', url: arg }) })
    const line = `SHOPIER_WEBHOOK_TOKEN=${hook.token}`
    const updated = /^SHOPIER_WEBHOOK_TOKEN=.*$/m.test(env)
        ? env.replace(/^SHOPIER_WEBHOOK_TOKEN=.*$/m, line)
        : `${env.trimEnd()}\n${line}\n`
    writeFileSync(ENV_FILE, updated)
    console.log(`Created webhook ${hook.id} (${hook.event} -> ${hook.url}).`)
    console.log(`Token saved to ${ENV_FILE} as SHOPIER_WEBHOOK_TOKEN — copy it to Vercel too.`)
} else if (command === 'delete' && arg) {
    await api(`/webhooks/${encodeURIComponent(arg)}`, { method: 'DELETE' })
    console.log(`Deleted webhook ${arg}.`)
} else {
    console.log('Usage: node scripts/shopier-webhook.mjs list | create <url> | delete <id>')
    process.exit(1)
}
