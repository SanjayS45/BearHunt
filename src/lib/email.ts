'use server'

// Stub — replace with Resend once RESEND_API_KEY is configured
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (process.env.RESEND_API_KEY) {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'BearHunt <noreply@bearhunt.app>',
      to,
      subject,
      html,
    })
  } else {
    console.log(`[EMAIL STUB] To: ${to} | Subject: ${subject}`)
  }
}

export async function sendClaimNotification(ownerEmail: string, ticketDescription: string) {
  await sendEmail({
    to: ownerEmail,
    subject: 'Someone found what might be your item!',
    html: `<p>Good news! Someone found what might be your lost item: <strong>${ticketDescription}</strong>.</p><p>Log in to BearHunt to review their proof.</p>`,
  })
}

export async function sendClaimApprovedNotification(finderEmail: string, ticketDescription: string) {
  await sendEmail({
    to: finderEmail,
    subject: 'Your claim was approved — start chatting!',
    html: `<p>The owner confirmed your claim for <strong>${ticketDescription}</strong>. Open the app to coordinate the handoff!</p>`,
  })
}

export async function sendClaimRejectedNotification(finderEmail: string, ticketDescription: string) {
  await sendEmail({
    to: finderEmail,
    subject: 'Update on your BearHunt claim',
    html: `<p>The owner reviewed your claim for <strong>${ticketDescription}</strong> and said it wasn't their item. Thanks for looking!</p>`,
  })
}

export async function sendPayoutNotification(finderEmail: string, amountFormatted: string) {
  await sendEmail({
    to: finderEmail,
    subject: 'Payout incoming!',
    html: `<p>The owner confirmed receipt of their item. Your payout of <strong>${amountFormatted}</strong> is on its way via Stripe!</p>`,
  })
}

export async function sendTicketExpiryNotification(ownerEmail: string, ticketDescription: string) {
  await sendEmail({
    to: ownerEmail,
    subject: 'Your BearHunt ticket expires in 3 days',
    html: `<p>Your bounty ticket for <strong>${ticketDescription}</strong> expires in 3 days. Log in to extend it or let it expire for a full refund.</p>`,
  })
}

export async function sendDisputeNotification(email: string, role: string) {
  await sendEmail({
    to: email,
    subject: 'A dispute has been opened',
    html: `<p>A dispute has been opened on your BearHunt transaction. Admin will review and reach out shortly.</p>`,
  })
}

export async function sendMessageNotification(recipientEmail: string, senderName: string) {
  await sendEmail({
    to: recipientEmail,
    subject: `New message from ${senderName}`,
    html: `<p>You have a new message from <strong>${senderName}</strong> on BearHunt. Open the app to reply.</p>`,
  })
}
