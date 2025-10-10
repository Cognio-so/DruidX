import { NextRequest, NextResponse } from "next/server";
import * as nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || "gmail",
  auth: {
    user: process.env.GMAIL_USERNAME || "",
    pass: process.env.GMAIL_PASSWORD || "",
  },
});

const sender = {
  email: process.env.GMAIL_USERNAME || "",
  name: process.env.MAIL_SENDER_NAME || "EMSA",
};

const INVITATION_EMAIL_TEMPLATE = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to join EMSA</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(to right, #4CAF50, #45a049); padding: 20px; text-align: center;">
    <h1 style="color: white; margin: 0;">You've Been Invited!</h1>
  </div>
  <div style="background-color: #f9f9f9; padding: 20px; border-radius: 0 0 5px 5px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">
    <p>Hello {name},</p>
    <p>You've been invited to join EMSA as a <strong>{role}</strong>. Click the button below to accept the invitation and set up your account:</p>
    {message && <p><em>"{message}"</em></p>}
    <div style="text-align: center; margin: 30px 0;">
      <a href="{invitationToken}" style="background-color: #4CAF50; color: white; padding: 12px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Accept Invitation</a>
    </div>
    <p>This invitation link will expire in 7 days for security reasons.</p>
    <p>If you didn't expect this invitation, please ignore this email.</p>
    <p>Best regards,<br>The EMSA Team</p>
  </div>
  <div style="text-align: center; margin-top: 20px; color: #888; font-size: 0.8em;">
    <p>This is an automated message, please do not reply to this email.</p>
  </div>
</body>
</html>
`;

export async function POST(request: NextRequest) {
  try {
    const { email, name, role, message, invitationToken } =
      await request.json();

    if (!email || !name || !role || !invitationToken) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const subject = "Invitation to join EMSA";
    const htmlBody = INVITATION_EMAIL_TEMPLATE.replace("{name}", name)
      .replace("{role}", role)
      .replace("{message}", message || "")
      .replace("{invitationToken}", invitationToken);

    const mailOptions = {
      from: `"${sender.name}" <${sender.email}>`,
      to: email,
      subject: subject,
      html: htmlBody,
      headers: { "X-App-Category": "Invitation Email" },
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`Invitation email sent successfully to ${email}`);

    return NextResponse.json(
      {
        success: true,
        message: "Invitation sent successfully",
        messageId: info.messageId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error sending invitation email:", error);
    return NextResponse.json(
      { error: "Failed to send invitation email" },
      { status: 500 }
    );
  }
}
