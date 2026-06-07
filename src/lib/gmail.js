/**
 * src/lib/gmail.js
 *
 * Gmail email notification system — React equivalent of the PHP gmail_notify.php
 *
 * Mirrors every PHP function exactly:
 *   notifyCustomerRegistered()       ← notifyCustomerRegistered()
 *   notifyLoanApplicationReceived()  ← notifyLoanApplicationReceived()
 *   notifyLoanApproved()             ← notifyLoanApproved()
 *   notifyLoanRejected()             ← notifyLoanRejected()
 *   notifyPaymentReceived()          ← notifyPaymentReceived()
 *   notifyAdminNewApplication()      ← notifyAdminNewApplication()
 *
 * HOW IT WORKS:
 *   React (browser) → Supabase Edge Function (server) → Gmail SMTP
 *   The Edge Function holds the Gmail App Password securely as a secret.
 *   The browser never sees the password.
 *
 * SETUP:
 *   1. Add to .env.local:
 *      VITE_SUPABASE_FUNCTIONS_URL=https://YOUR_PROJECT_ID.supabase.co/functions/v1
 *      VITE_SUPABASE_ANON_KEY=your-anon-key
 *
 *   2. Deploy the Edge Function (see supabase/functions/send-email/index.ts)
 *
 *   3. Set secrets in Supabase:
 *      supabase secrets set GMAIL_USER=velveth869@gmail.com
 *      supabase secrets set GMAIL_APP_PASSWORD=mwbzhgaldzwqdsbc
 *      supabase secrets set APP_URL=https://your-vercel-app.vercel.app
 */

// ── Config ────────────────────────────────────────────────────────────────────
const FUNCTIONS_URL = import.meta.env.VITE_SUPABASE_FUNCTIONS_URL
const ANON_KEY      = import.meta.env.VITE_SUPABASE_ANON_KEY
const APP_URL       = import.meta.env.VITE_APP_URL ?? 'https://your-app.vercel.app'
const ACCENT        = '#7a1e2e'

// ── Core send function ────────────────────────────────────────────────────────
/**
 * Calls the Supabase Edge Function to send a Gmail.
 * Silent fail — never blocks the UI if email fails.
 */
async function sendEmail(to, subject, html) {
  if (!FUNCTIONS_URL || !to) {
    console.warn('[gmail] VITE_SUPABASE_FUNCTIONS_URL not set — skipping email')
    return false
  }
  try {
    const res = await fetch(`${FUNCTIONS_URL}/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
        'apikey':        ANON_KEY,
      },
      body: JSON.stringify({ to, subject, html }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      console.error('[gmail] Edge function error:', err)
      return false
    }
    return true
  } catch (e) {
    console.error('[gmail] Network error:', e)
    return false
  }
}

// ── Shared HTML email template (mirrors gmailTemplate() in PHP) ───────────────
function emailTemplate(title, content, accentColor = ACCENT) {
  const year = new Date().getFullYear()
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f0f0;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;overflow:hidden;">

        <!-- Header -->
        <tr>
          <td style="background:${accentColor};padding:28px 32px;text-align:center;">
            <h1 style="color:#ffffff;margin:0;font-size:24px;letter-spacing:1px;font-weight:bold;">
              Velveth Lending
            </h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 32px;color:#333333;font-size:15px;line-height:1.7;">
            <h2 style="color:${accentColor};margin-top:0;margin-bottom:16px;font-size:20px;">${title}</h2>
            ${content}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9f9f9;padding:20px 32px;text-align:center;
                     border-top:1px solid #eeeeee;color:#aaaaaa;font-size:12px;line-height:1.6;">
            &copy; ${year} Velveth Lending &nbsp;|&nbsp; All rights reserved.<br>
            This is an automated message — please do not reply.
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ── Shared table helpers (mirrors _emailRow / _emailTable in PHP) ─────────────
function emailRow(label, value, shade = false) {
  const bg = shade ? 'background:#f9f9f9;' : ''
  return `<tr style="${bg}">
    <td style="color:#777777;width:45%;padding:10px 14px;font-size:14px;">${label}</td>
    <td style="padding:10px 14px;font-size:14px;">${value}</td>
  </tr>`
}

function emailTable(rows) {
  return `<table width="100%" cellpadding="0" cellspacing="0"
           style="border-collapse:collapse;margin-top:16px;border:1px solid #eeeeee;border-radius:6px;">
    ${rows}
  </table>`
}

function btnLink(href, label, color = ACCENT) {
  return `<p style="margin-top:28px;">
    <a href="${href}"
       style="display:inline-block;background:${color};color:#ffffff;
              padding:13px 30px;border-radius:6px;text-decoration:none;
              font-size:15px;font-weight:bold;">
      ${label} →
    </a>
  </p>`
}

function fmtPHP(n) {
  return '₱' + Number(n ?? 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC NOTIFICATION FUNCTIONS — drop-in equivalent of every PHP function
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Welcome email after customer registration
 * PHP: notifyCustomerRegistered($toEmail, $fullName)
 */
export async function notifyCustomerRegistered(toEmail, fullName) {
  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Welcome to <strong>Velveth Lending</strong>! 🎉</p>
    <p>Your account has been successfully created. You can now log in and apply for a loan.</p>
    ${btnLink(`${APP_URL}/login`, 'Log In Now')}
  `
  return sendEmail(
    toEmail,
    'Welcome to Velveth Lending! 🎉',
    emailTemplate('Welcome! 🎉', content)
  )
}

/**
 * Confirmation after a loan application is submitted
 * PHP: notifyLoanApplicationReceived($toEmail, $fullName, $appId, $amount)
 */
export async function notifyLoanApplicationReceived(toEmail, fullName, appId, amount) {
  const rows =
    emailRow('Application ID', `<strong>${appId}</strong>`) +
    emailRow('Amount Requested', `<strong>${fmtPHP(amount)}</strong>`, true) +
    emailRow('Status', `<strong style="color:#e67e22;">⏳ Under Review</strong>`)

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>We have received your loan application. Our team will review it and get back to you shortly.</p>
    ${emailTable(rows)}
    <p style="margin-top:16px;color:#555555;">We will notify you by email once a decision has been made.</p>
    ${btnLink(`${APP_URL}/my-loan`, 'View My Application')}
  `
  return sendEmail(
    toEmail,
    `Loan Application ${appId} — Received`,
    emailTemplate('Loan Application Received 📋', content)
  )
}

/**
 * Notification when a loan is approved
 * PHP: notifyLoanApproved($toEmail, $fullName, $appId, $amount, $firstPaymentDate)
 */
export async function notifyLoanApproved(toEmail, fullName, appId, amount, firstPaymentDate) {
  const rows =
    emailRow('Application ID', `<strong>${appId}</strong>`) +
    emailRow('Approved Amount', `<strong>${fmtPHP(amount)}</strong>`, true) +
    emailRow('First Payment Due', `<strong>${firstPaymentDate}</strong>`) +
    emailRow('Status', `<strong style="color:#1a7a2e;">✅ Approved</strong>`, true)

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>🎉 Great news! Your loan application has been <strong style="color:#1a7a2e;">approved</strong>.</p>
    ${emailTable(rows)}
    <p style="margin-top:16px;color:#555555;">Please log in to view your repayment schedule.</p>
    ${btnLink(`${APP_URL}/my-loan`, 'View My Loan', '#1a7a2e')}
  `
  return sendEmail(
    toEmail,
    `Loan ${appId} — Approved! 🎉`,
    emailTemplate('Your Loan is Approved! 🎉', content, '#1a7a2e')
  )
}

/**
 * Notification when a loan application is rejected
 * PHP: notifyLoanRejected($toEmail, $fullName, $appId, $reason)
 */
export async function notifyLoanRejected(toEmail, fullName, appId, reason) {
  const rows =
    emailRow('Application ID', `<strong>${appId}</strong>`) +
    emailRow('Reason', reason, true) +
    emailRow('Status', `<strong style="color:#c0392b;">❌ Not Approved</strong>`)

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>We regret to inform you that your loan application has not been approved at this time.</p>
    ${emailTable(rows)}
    <p style="margin-top:16px;color:#555555;">
      You are welcome to reapply after addressing the concerns above.<br>
      Contact us if you have any questions.
    </p>
    ${btnLink(`${APP_URL}/apply`, 'Apply Again')}
  `
  return sendEmail(
    toEmail,
    `Loan Application ${appId} — Not Approved`,
    emailTemplate('Loan Application Update', content)
  )
}

/**
 * Notification when a payment is confirmed
 * PHP: notifyPaymentReceived($toEmail, $fullName, $amount, $date, $remainingBalance)
 */
export async function notifyPaymentReceived(toEmail, fullName, amount, date, remainingBalance) {
  const rows =
    emailRow('Amount Paid', `<strong style="color:#1a7a2e;">${fmtPHP(amount)}</strong>`) +
    emailRow('Payment Date', date, true) +
    emailRow('Remaining Balance', `<strong>${fmtPHP(remainingBalance)}</strong>`)

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Your payment has been successfully recorded. Thank you! 💪</p>
    ${emailTable(rows)}
    <p style="margin-top:16px;color:#555555;">
      Keep it up! Log in anytime to view your full payment history.
    </p>
    ${btnLink(`${APP_URL}/payments`, 'View Payment History', '#1a5c7a')}
  `
  return sendEmail(
    toEmail,
    'Payment Successfully Recorded ✅',
    emailTemplate('Payment Received ✅', content, '#1a5c7a')
  )
}

/**
 * Alert to admin when a new application is submitted
 * PHP: notifyAdminNewApplication($adminEmail, $customerName, $appId, $amount)
 */
export async function notifyAdminNewApplication(adminEmail, customerName, appId, amount) {
  const rows =
    emailRow('Customer', `<strong>${customerName}</strong>`) +
    emailRow('Application ID', `<strong>${appId}</strong>`, true) +
    emailRow('Amount Requested', `<strong>${fmtPHP(amount)}</strong>`)

  const content = `
    <p>A new loan application has been submitted and requires your review.</p>
    ${emailTable(rows)}
    ${btnLink(`${APP_URL}/admin/loans`, 'Review Application')}
  `
  return sendEmail(
    adminEmail,
    `New Loan Application: ${appId}`,
    emailTemplate('New Loan Application 📋', content)
  )
}

/**
 * Payment submitted notification to admin (new — for GCash/cash pending review)
 * No PHP equivalent — added for the React payment flow
 */
export async function notifyAdminPaymentSubmitted(adminEmail, customerName, appId, amount, method, gcashRef) {
  const rows =
    emailRow('Customer', `<strong>${customerName}</strong>`) +
    emailRow('Loan ID', `<strong>${appId}</strong>`, true) +
    emailRow('Amount', `<strong>${fmtPHP(amount)}</strong>`) +
    emailRow('Method', method.replace('_', ' '), true) +
    (gcashRef ? emailRow('GCash Ref', `<strong>${gcashRef}</strong>`) : '')

  const content = `
    <p>A customer has submitted a payment request that requires your confirmation.</p>
    ${emailTable(rows)}
    ${btnLink(`${APP_URL}/admin/payments`, 'Confirm Payment')}
  `
  return sendEmail(
    adminEmail,
    `💳 Payment Request — ${customerName}`,
    emailTemplate('Payment Request 💳', content)
  )
}

/**
 * Notify customer that payment was rejected/failed
 * No PHP equivalent — added for the React payment flow
 */
export async function notifyPaymentFailed(toEmail, fullName, amount) {
  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>Unfortunately, your payment of <strong>${fmtPHP(amount)}</strong> could not be verified.</p>
    <p style="color:#555555;">Please contact us or try submitting a new payment with the correct reference number.</p>
    ${btnLink(`${APP_URL}/payments`, 'Try Again')}
  `
  return sendEmail(
    toEmail,
    '❌ Payment Could Not Be Verified',
    emailTemplate('Payment Verification Failed ❌', content)
  )
}

/**
 * Notify customer that their penalty was added
 * No PHP equivalent — added for the React penalty flow
 */
export async function notifyPenaltyAdded(toEmail, fullName, amount, reason) {
  const rows =
    emailRow('Penalty Amount', `<strong style="color:#c0392b;">${fmtPHP(amount)}</strong>`) +
    emailRow('Reason', reason, true) +
    emailRow('Status', '<strong style="color:#c0392b;">⚠️ Unpaid</strong>')

  const content = `
    <p>Hi <strong>${fullName}</strong>,</p>
    <p>A penalty has been added to your account. Please settle it before your next payment date.</p>
    ${emailTable(rows)}
    <p style="margin-top:16px;color:#555555;">
      Contact us if you believe this is an error.
    </p>
    ${btnLink(`${APP_URL}/penalties`, 'View Penalties')}
  `
  return sendEmail(
    toEmail,
    '⚠️ Penalty Added to Your Account',
    emailTemplate('Penalty Notice ⚠️', content)
  )
}
