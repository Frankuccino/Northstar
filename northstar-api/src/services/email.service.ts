import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = process.env.FROM_EMAIL ?? "Northstar <noreply@onmail.resend.dev>";
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

export const sendInvitationEmail = async (params: {
  to: string;
  inviterName: string;
  projectName: string;
  rawToken: string;
}): Promise<{ success: boolean; error?: string }> => {
  const { to, inviterName, projectName, rawToken } = params;

  if (!process.env.RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email send");
    return { success: false, error: "Email service not configured" };
  }

  const inviteUrl = `${APP_URL}/invitations/accept?token=${rawToken}`;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `${inviterName} invited you to join ${projectName} on Northstar`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
          <h1 style="font-size: 24px; font-weight: 600; margin-bottom: 16px;">You've been invited!</h1>
          <p style="font-size: 16px; color: #374151; margin-bottom: 24px;">
            <strong>${inviterName}</strong> invited you to join <strong>${projectName}</strong> on Northstar.
          </p>
          <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 500;">
            Accept Invitation
          </a>
          <p style="font-size: 14px; color: #6b7280; margin-top: 24px;">
            This invitation expires in 7 days. If you don't have an account, you'll be prompted to create one.
          </p>
        </div>
      `,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Failed to send invitation email:", error);
    return { success: false, error: error.message };
  }
};
