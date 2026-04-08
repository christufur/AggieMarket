import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendVerificationEmail(email: string, token: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: email,
    subject: "Verify your Aggie Market account",
    html: `
      <h2>Welcome to Aggie Market!</h2>
      <p>Your verification code is:</p>
      <h1 style="letter-spacing: 8px;">${token}</h1>
      <p>This code expires in 15 minutes.</p>
    `,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev",
    to: email,
    subject: "Reset your Aggie Market password",
    html: `
      <h2>Password Reset</h2>
      <p>Your password reset code is:</p>
      <h1 style="letter-spacing: 8px;">${token}</h1>
      <p>This code expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
    `,
  });
}
