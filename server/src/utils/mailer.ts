// server/src/utils/mailer.ts
import sgMail, { MailDataRequired } from "@sendgrid/mail";

const adminEmail = process.env.ADMIN_EMAIL || "";
const senderEmail = process.env.SENDER_EMAIL || adminEmail;
const apiKey = process.env.SENDGRID_API_KEY || "";

if (apiKey) sgMail.setApiKey(apiKey);

export async function sendAdminReportEmail(
  subject: string,
  htmlBody: string,
  pdf: Buffer
): Promise<void> {
  if (!adminEmail) {
    console.warn("[mail] ADMIN_EMAIL not set; skipping email");
    return;
  }
  if (!senderEmail) {
    console.warn("[mail] SENDER_EMAIL not set; skipping email");
    return;
  }
  if (!apiKey) {
    console.warn("[mail] SENDGRID_API_KEY not set; skipping email");
    return;
  }

  const msg: MailDataRequired = {
    to: adminEmail,
    from: senderEmail, // must be a verified sender in SendGrid
    subject,
    html: htmlBody,
    attachments: [
      {
        filename: "report.pdf",
        type: "application/pdf",
        content: pdf.toString("base64"),
        disposition: "attachment",
        contentId: "report",
      },
    ],
  };

  try {
    await sgMail.send(msg);
  } catch (e: any) {
    const body = e?.response?.body ?? e?.message ?? e;
    console.warn("[mail] sendgrid error:", body);
  }
}
