export function htmlHeader(branding: {
  logoUrl?: string;
  appName?: string;
}) {
  const appName = branding.appName ?? 'AIRCO AIMS';

  const logo = branding.logoUrl
    ? `<img src="${branding.logoUrl}" alt="${appName}" style="height:40px; margin-bottom:20px;" />`
    : `<h1 style="margin:0 0 20px 0; font-size:22px; color:#0f172a;">${appName}</h1>`;

  return `
<!doctype html>
<html>
  <body style="margin:0; padding:0; background:#f1f5f9;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9; padding:24px 0;">
      <tr>
        <td align="center">
          <table width="100%" cellpadding="0" cellspacing="0" style="max-width:640px; background:#ffffff; border-radius:12px; box-shadow:0 10px 30px rgba(15,23,42,0.08); overflow:hidden;">
            <tr>
              <td style="padding:32px; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial; color:#0f172a;">
                ${logo}
`;
}


export function htmlFooter() {
  return `
                <hr style="border:none; border-top:1px solid #e5e7eb; margin:32px 0;" />

                <p style="font-size:12px; color:#64748b; line-height:1.6;">
                  If you did not request this email, you can safely ignore it.
                </p>

                <p style="font-size:12px; color:#64748b;">
                  Thanks,<br/>
                  <strong>Team AIRCO</strong>
                </p>
              </td>
            </tr>
          </table>

          <p style="margin-top:16px; font-size:11px; color:#94a3b8; font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial;">
            © ${new Date().getFullYear()} AIRCO. All rights reserved.
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
`;
}


export function forgotPasswordHtml(
  displayName: string,
  resetLink: string,
  branding?: { logoUrl?: string; appName?: string },
) {
  const header = htmlHeader(branding ?? {});
  const footer = htmlFooter();

  const safeName = escapeHtml(toTitleCase(displayName || 'User'));

  return `${header}
    <h2 style="margin-top:0; font-size:24px;">Reset your password</h2>

    <p style="font-size:15px;">Hi ${safeName},</p>

    <p style="font-size:15px; color:#334155;">
      We received a request to reset your password. Click the button below to choose a new one.
      This link will expire shortly for security reasons.
    </p>

    <div style="text-align:center; margin:32px 0;">
      <a href="${resetLink}" style="
        background:#0b2948;
        color:#ffffff;
        padding:14px 28px;
        border-radius:10px;
        text-decoration:none;
        font-weight:600;
        display:inline-block;
      ">
        Reset password
      </a>
    </div>

    <p style="font-size:14px; color:#475569;">
      If the button doesn’t work, copy and paste this URL into your browser:
    </p>

    <p style="font-size:13px; word-break:break-all;">
      <a href="${resetLink}" style="color:#0b2948;">${resetLink}</a>
    </p>
${footer}`;
}


export function accountActivationHtml(
  displayName: string,
  activationUrl: string,
  tempPassword: string,
  opts?: {
    logoUrl?: string;
    appName?: string;
  },
) {
  const header = htmlHeader(opts ?? {});
  const footer = htmlFooter();

  const safeName = escapeHtml(toTitleCase(displayName || 'User'));

  return `${header}
    <h2 style="margin-top:0; font-size:24px;">Welcome to ${opts?.appName ?? 'AIRCO AIMS'}</h2>

    <p style="font-size:15px;">Hello ${safeName},</p>

    <p style="font-size:15px; color:#334155;">
      Your account has been created by an administrator.
    </p>

    <p style="font-size:15px;"><strong>Temporary password:</strong></p>

    <div style="
      background:#f8fafc;
      border:1px solid #e5e7eb;
      border-radius:8px;
      padding:12px;
      font-family: monospace;
      font-size:14px;
      margin-bottom:20px;
    ">
      ${escapeHtml(tempPassword)}
    </div>

    <p style="font-size:15px;">
      Please activate your account using the button below. This link expires in <strong>24 hours</strong>.
    </p>

    <div style="text-align:center; margin:32px 0;">
      <a href="${activationUrl}" style="
        background:#0ea5e9;
        color:#ffffff;
        padding:14px 28px;
        border-radius:10px;
        text-decoration:none;
        font-weight:600;
        display:inline-block;
      ">
        Activate account
      </a>
    </div>

    <p style="font-size:14px; color:#475569;">
      After activation, you’ll be prompted to change your password.
    </p>
${footer}`;
}


function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function toTitleCase(name: string) {
  return name
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
