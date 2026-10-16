"""Email body templates for invitations."""

from html import escape


def invitation_subject() -> str:
    """Subject line for an invitation email."""
    return "You've been invited to join MalutiRecon"


def invitation_text(
    *,
    user_name: str,
    company_name: str,
    role_name: str,
    invitation_link: str,
    expires_at: str,
    support_email: str | None = None,
) -> str:
    """Plain-text body for an invitation email."""
    closing_line = (
        f"If you were not expecting this invitation, you can safely ignore this "
        f"email or contact {support_email}."
        if support_email
        else "If you were not expecting this invitation, you can safely ignore "
             "this email or contact your company administrator."
    )
    return (
        f"MALUTIRECON\n"
        f"Business Management Platform\n"
        f"\n"
        f"Hello {user_name},\n"
        f"\n"
        f"You've been invited to join {company_name} on MalutiRecon.\n"
        f"\n"
        f"We're pleased to welcome you to the team. Complete your registration "
        f"to activate your account and get started.\n"
        f"\n"
        f"YOUR ASSIGNED ROLE\n"
        f"{role_name}\n"
        f"\n"
        f"Accept your invitation by opening this link:\n"
        f"\n"
        f"{invitation_link}\n"
        f"\n"
        f"INVITATION SECURITY\n"
        f"This invitation expires on {expires_at}.\n"
        f"For your security, please do not share this invitation link with anyone.\n"
        f"\n"
        f"{closing_line}\n"
        f"\n"
        f"--\n"
        f"MalutiRecon\n"
        f"Business Management Platform\n"
        f"\n"
        f"This is an automated invitation email.\n"
    )


def invitation_html(
    *,
    user_name: str,
    company_name: str,
    role_name: str,
    invitation_link: str,
    expires_at: str,
    support_email: str | None = None,
) -> str:
    """HTML body for an invitation email."""
    user_name_e = escape(user_name)
    company_name_e = escape(company_name)
    role_name_e = escape(role_name)
    invitation_link_e = escape(invitation_link)
    invitation_link_href = escape(invitation_link, quote=True)
    expires_at_e = escape(expires_at)

    closing_line = (
        f"If you weren&rsquo;t expecting an invitation, you can safely ignore "
        f"this email or contact {escape(support_email)}."
        if support_email
        else "If you weren&rsquo;t expecting an invitation, you can safely "
             "ignore this email or contact your company administrator."
    )

    return f"""\
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <title>{escape(invitation_subject())}</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F5F9;-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1F2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3F5F9;">
    <tr>
      <td align="center" style="padding:32px 16px;">

        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#FFFFFF;border:1px solid #E5E7EB;border-radius:8px;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="padding:28px 40px 8px 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="vertical-align:middle;">
                    <div style="font-size:18px;font-weight:700;letter-spacing:0.02em;color:#00209F;">MalutiRecon</div>
                    <div style="font-size:12px;color:#6B7280;margin-top:2px;">Business Management Platform</div>
                  </td>
                  <td align="right" style="vertical-align:middle;">
                    <div style="height:6px;width:6px;border-radius:50%;background-color:#009739;display:inline-block;"></div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="height:1px;background-color:#E5E7EB;line-height:1px;font-size:1px;">&nbsp;</div>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <h1 style="margin:0;font-size:24px;line-height:1.3;font-weight:700;color:#1F2937;">
                You&rsquo;ve been invited to join your team
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:20px 40px 0 40px;font-size:15px;line-height:1.65;color:#1F2937;">
              <p style="margin:0 0 14px 0;">Hello {user_name_e},</p>
              <p style="margin:0 0 14px 0;">
                You&rsquo;ve been invited to join <strong style="color:#1F2937;">{company_name_e}</strong> on MalutiRecon.
              </p>
              <p style="margin:0;">
                We&rsquo;re pleased to welcome you to the team. Complete your
                registration to activate your account and get started.
              </p>
            </td>
          </tr>

          <!-- Role card -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#F3F5F9;border:1px solid #E5E7EB;border-radius:6px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#6B7280;text-transform:uppercase;">
                      Your assigned role
                    </div>
                    <div style="font-size:18px;font-weight:700;color:#1F2937;margin-top:6px;">
                      {role_name_e}
                    </div>
                    <div style="font-size:12px;color:#6B7280;margin-top:6px;line-height:1.5;">
                      You&rsquo;ve been invited to join the organisation with this role.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:28px 40px 0 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" bgcolor="#00209F" style="border-radius:6px;">
                    <a href="{invitation_link_href}"
                       style="display:inline-block;padding:14px 26px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:6px;line-height:1;">
                      Accept Invitation &amp; Register
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Fallback link -->
          <tr>
            <td style="padding:24px 40px 0 40px;font-size:13px;line-height:1.6;color:#6B7280;">
              <p style="margin:0 0 6px 0;font-weight:600;color:#1F2937;">Button not working?</p>
              <p style="margin:0 0 8px 0;">Copy and paste the following link into your browser:</p>
              <p style="margin:0;word-break:break-all;">
                <a href="{invitation_link_href}" style="color:#00209F;text-decoration:underline;">{invitation_link_e}</a>
              </p>
            </td>
          </tr>

          <!-- Security -->
          <tr>
            <td style="padding:24px 40px 0 40px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-left:3px solid #00209F;background-color:#FAFBFC;">
                <tr>
                  <td style="padding:14px 18px;">
                    <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#00209F;text-transform:uppercase;">
                      Invitation security
                    </div>
                    <div style="font-size:13px;color:#1F2937;margin-top:8px;line-height:1.6;">
                      This invitation expires on <strong>{expires_at_e}</strong>.
                    </div>
                    <div style="font-size:13px;color:#6B7280;margin-top:6px;line-height:1.6;">
                      For your security, please do not share this invitation link with anyone.
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Unexpected notice -->
          <tr>
            <td style="padding:24px 40px 0 40px;font-size:13px;line-height:1.6;color:#6B7280;">
              <p style="margin:0 0 6px 0;font-weight:600;color:#1F2937;">Didn&rsquo;t expect this invitation?</p>
              <p style="margin:0;">{closing_line}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:28px 40px 32px 40px;">
              <div style="height:1px;background-color:#E5E7EB;line-height:1px;font-size:1px;margin-bottom:16px;">&nbsp;</div>
              <div style="font-size:12px;color:#6B7280;line-height:1.6;">
                <div style="font-weight:700;color:#1F2937;">MalutiRecon</div>
                <div>Business Management Platform</div>
                <div style="margin-top:8px;">
                  This is an automated invitation email. Please contact your
                  company administrator if you need assistance.
                </div>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
"""