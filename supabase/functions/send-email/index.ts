/**
 * Supabase Edge Function: send-email
 * Deployed at: supabase/functions/send-email/index.ts
 *
 * Sends Gmail notifications using Gmail SMTP via Resend-compatible
 * fetch approach using nodemailer-style SMTP over Deno.
 *
 * ── HOW TO DEPLOY (one time) ─────────────────────────────────
 *  1. Install Supabase CLI:
 *     npm install -g supabase
 *
 *  2. Login:
 *     supabase login
 *
 *  3. Link to your project:
 *     supabase link --project-ref YOUR_PROJECT_ID
 *     (find project ID in Supabase → Settings → General)
 *
 *  4. Set secrets (do this ONCE — never hardcode in code):
 *     supabase secrets set GMAIL_USER=velveth869@gmail.com
 *     supabase secrets set GMAIL_APP_PASSWORD=mwbzhgaldz wqdsbc
 *     supabase secrets set APP_URL=https://your-vercel-app.vercel.app
 *
 *  5. Deploy the function:
 *     supabase functions deploy send-email --no-verify-jwt
 *
 *  6. Copy the function URL from dashboard → Functions → send-email
 *     Add it to your Vercel env vars:
 *     VITE_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT.supabase.co/functions/v1
 * ─────────────────────────────────────────────────────────────
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { SmtpClient } from 'https://deno.land/x/smtp@v0.7.0/mod.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const body = await req.json()
    const { to, subject, html, text } = body

    if (!to || !subject || !html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const GMAIL_USER     = Deno.env.get('GMAIL_USER') ?? ''
    const GMAIL_PASSWORD = Deno.env.get('GMAIL_APP_PASSWORD')?.replace(/\s/g, '') ?? ''

    if (!GMAIL_USER || !GMAIL_PASSWORD) {
      return new Response(
        JSON.stringify({ error: 'Gmail credentials not configured in Supabase secrets' }),
        { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )
    }

    const client = new SmtpClient()

    await client.connectTLS({
      hostname: 'smtp.gmail.com',
      port:     465,
      username: GMAIL_USER,
      password: GMAIL_PASSWORD,
    })

    await client.send({
      from:    `Velveth Lending <${GMAIL_USER}>`,
      to:      to,
      subject: subject,
      content: text ?? subject,
      html:    html,
    })

    await client.close()

    return new Response(
      JSON.stringify({ success: true, to }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('[send-email] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})
