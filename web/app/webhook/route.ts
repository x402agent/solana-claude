import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /webhook/
 * General Honcho webhook — receives memory events, conclusions, dreams, trade records.
 */

export async function POST(req: NextRequest) {
  let body: string
  let event: { type?: string; peer_id?: string; session_id?: string; data?: Record<string, unknown> }
  try {
    body = await req.text()
    event = JSON.parse(body)
  } catch {
    event = { type: 'raw' }
    body = ''
  }

  console.log(
    `[WEBHOOK] general type=${event.type ?? 'unknown'} peer=${event.peer_id ?? '-'} session=${event.session_id ?? '-'} (${body.length} bytes)`
  )
  console.log(`[WEBHOOK] payload: ${body.slice(0, 500)}`)

  return NextResponse.json({
    status: 'ok',
    received: event.type ?? 'unknown',
    path: '/webhook/',
    timestamp: new Date().toISOString(),
  })
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Webhook-Secret',
    },
  })
}
