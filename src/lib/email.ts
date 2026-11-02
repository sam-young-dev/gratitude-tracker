import nodemailer from 'nodemailer'

type Email = { to: string; subject: string; text: string }

const user = process.env.GMAIL_USER
const pass = process.env.GMAIL_APP_PASSWORD

const transporter =
  user && pass
    ? nodemailer.createTransport({ service: 'gmail', auth: { user, pass } })
    : null

/**
 * The only place email leaves the app, so moving to Resend later is a change to
 * this file. Without Gmail credentials, dev logs the email to the server console;
 * production throws so a reset link is never silently dropped.
 */
export async function sendEmail({ to, subject, text }: Email) {
  if (transporter) {
    await transporter.sendMail({ from: user, to, subject, text })
    return
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Email is not configured: set GMAIL_USER and GMAIL_APP_PASSWORD',
    )
  }
  console.log(`\n[email] to: ${to}\n[email] subject: ${subject}\n${text}\n`)
}
