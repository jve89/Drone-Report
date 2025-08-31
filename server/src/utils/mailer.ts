import sgMail from "@sendgrid/mail";

const adminEmail = process.env.ADMIN_EMAIL || "";
const apiKey = process.env.SENDGRID_API_KEY || "";

if (apiKey) sgMail.setApiKey(apiKey);

export async function sendAdminReportEmail(
  subject: string,
  htmlBody: string,
  pdf: Buffer
) {
  if (!adminEmail) {
    console.warn("[mail] ADMIN_EMAIL not set; skipping email");
    return;
  }
  if (!apiKey) {
    console.warn("[mail] SENDGRID_API_KEY not set; skipping email");
    return;
  }

  try {
    await sgMail.send({
      to: adminEmail,
      from: adminEmail, // must be your verified sender
      subject,
      html: htmlBody,
      attachments: [
        {
          filename: "report.pdf",
          type: "application/pdf",
          content: pdf.toString("base64"),
          disposition: "attachment",
          contentId: "report"
        }
      ]
    } as any);
  } catch (e: any) {
    console.warn("[mail] sendgrid error:", e?.response?.body || e?.message || e);
  }
}
