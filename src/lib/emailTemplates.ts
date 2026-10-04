/**
 * PowerForecast Branded Email Templates (Obsidian / Zinc Theme)
 * Responsive, premium dark-themed HTML email templates matching the current PowerForecast brand aesthetic.
 * Obsidian #09090b background, Zinc #121215 cards, subtle #27272a borders, crisp white #fafafa CTA buttons,
 * and high-contrast typography with 8-digit OTP verification code hero blocks.
 * 100% compatible with Supabase GoTrue Auth Templates and in-app transactional dispatchers.
 */

export const POWERFORECAST_LOGO_URL =
  'https://raw.githubusercontent.com/hAizen-Nibba/PowerForecast-2v/main/public/Assets/LOGO.png';

export interface EmailTemplateConfig {
  preheader?: string;
  badge?: string;
  badgeColor?: string;
  badgeBg?: string;
  badgeBorder?: string;
  headline: string;
  subheadline?: string;
  bodyParagraphs: string[];
  highlightBox?: {
    label: string;
    value: string;
    sublabel?: string;
  };
  metricsTable?: Array<{ label: string; value: string; highlight?: boolean }>;
  buttonText?: string;
  buttonUrl?: string;
  fallbackUrlLabel?: string;
  fallbackUrl?: string;
  securityNotice?: string;
}

/**
 * Builds a universal, responsive dark-themed HTML email template using inline CSS for cross-client compatibility.
 */
export function buildBrandedEmailHtml(config: EmailTemplateConfig): string {
  const {
    preheader = 'PowerForecast Energy Intelligence Notification',
    badge = 'SECURITY',
    badgeColor = '#fafafa',
    badgeBg = '#18181b',
    badgeBorder = '#27272a',
    headline,
    subheadline,
    bodyParagraphs,
    highlightBox,
    metricsTable,
    buttonText,
    buttonUrl,
    fallbackUrlLabel = 'If the button does not work, copy and paste this link in your browser:',
    fallbackUrl,
    securityNotice = 'This code and link are single-use and will expire in 24 hours. If you did not request this, your account remains secure and you can safely disregard this email.',
  } = config;

  const paragraphsHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #cbd5e1;">${p}</p>`
    )
    .join('');

  const highlightHtml = highlightBox
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 24px 0; background-color: #09090b; border: 1px dashed #3f3f46; border-radius: 12px; padding: 20px;">
        <tr>
          <td align="center">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #a1a1aa; margin-bottom: 10px;">${highlightBox.label}</div>
            <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #ffffff; font-family: 'JetBrains Mono', 'Courier New', monospace; background-color: #18181b; padding: 14px 28px; border-radius: 8px; border: 1px solid #27272a; display: inline-block;">${highlightBox.value}</div>
            ${
              highlightBox.sublabel
                ? `<div style="font-size: 12px; color: #71717a; margin-top: 12px; line-height: 1.4;">${highlightBox.sublabel}</div>`
                : ''
            }
          </td>
        </tr>
      </table>
    `
    : '';

  const tableHtml =
    metricsTable && metricsTable.length > 0
      ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; overflow: hidden;">
        ${metricsTable
          .map(
            (row, idx) => `
          <tr style="${idx > 0 ? 'border-top: 1px solid #27272a;' : ''}">
            <td style="padding: 12px 18px; font-size: 14px; color: #a1a1aa;">${row.label}</td>
            <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: ${
              row.highlight ? '#fafafa' : '#ffffff'
            };">${row.value}</td>
          </tr>`
          )
          .join('')}
      </table>
    `
      : '';

  const buttonActionUrl = buttonUrl || fallbackUrl;
  const buttonHtml =
    buttonText && buttonActionUrl
      ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: #fafafa;">
                  <a href="${buttonActionUrl}" target="_blank" rel="noopener noreferrer" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 700; color: #09090b; text-decoration: none; padding: 14px 36px; border-radius: 8px; display: inline-block; letter-spacing: 0.2px; background-color: #fafafa; box-shadow: 0 2px 10px rgba(255, 255, 255, 0.1);">
                    ${buttonText}
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    `
      : '';

  const fallbackHtml = buttonActionUrl
    ? `
      <div style="background-color: #09090b; border: 1px solid #27272a; border-radius: 8px; padding: 14px 18px; margin-top: 24px;">
        <div style="font-size: 11px; font-weight: 600; color: #71717a; margin-bottom: 6px;">${fallbackUrlLabel}</div>
        <a href="${buttonActionUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #ffffff; word-break: break-all; text-decoration: underline; line-height: 1.5; font-family: monospace;">${buttonActionUrl}</a>
      </div>
    `
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${headline}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td {font-family: Arial, Helvetica, sans-serif !important;}
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #09090b; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text (hidden in body but shown in inbox preview) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #09090b; opacity: 0;">
    ${preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #09090b; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 580px; background-color: #121215; border: 1px solid #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 40px rgba(0, 0, 0, 0.6);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #27272a; background-color: #0d1117;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align: middle; width: 44px;">
                    <img src="${POWERFORECAST_LOGO_URL}" alt="PowerForecast" width="38" height="38" style="display: block; border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px;">
                          Power<span style="color: #fafafa;">Forecast</span>
                        </td>
                        <td style="padding-left: 10px;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; background-color: ${badgeBg}; color: ${badgeColor}; padding: 3px 9px; border-radius: 999px; letter-spacing: 0.6px; text-transform: uppercase; border: 1px solid ${badgeBorder};">
                            ${badge}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 500; color: #a1a1aa; letter-spacing: 0.2px; padding-top: 3px;">
                          Smart Energy Monitoring & Bill Forecasting
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              
              <h1 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 800; color: #ffffff; letter-spacing: -0.3px; line-height: 1.3;">
                ${headline}
              </h1>

              ${
                subheadline
                  ? `<p style="margin: 0 0 20px 0; font-size: 14px; color: #a1a1aa; font-weight: 600; letter-spacing: 0.2px;">${subheadline}</p>`
                  : ''
              }

              ${paragraphsHtml}

              ${highlightHtml}

              ${tableHtml}

              ${buttonHtml}

              ${fallbackHtml}

            </td>
          </tr>

          <!-- Security & Footer Divider -->
          <tr>
            <td style="padding: 20px 32px 24px 32px; border-top: 1px solid #27272a; background-color: #0d1117; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: #a1a1aa;">
                🛡️ <strong style="color: #ffffff;">Security Notice:</strong> ${securityNotice}
              </p>
              <div style="font-size: 11px; line-height: 1.5; color: #52525b;">
                Dispatched via PowerForecast Verified SMTP (<strong style="color: #71717a;">noreply@comugallery.me</strong>).<br>
                © 2026 PowerForecast Refine. All rights reserved.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Returns the production-ready Obsidian/Zinc HTML template for Supabase Auth: Reset Password.
 * Features the ONE-TIME 8-DIGIT SECURITY CONFIRMATION CODE ({{ .Token }}) as the hero element,
 * matching the 8-slot input verification prompt in the PowerForecast application.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Reset Password.
 */
export function getSupabaseResetPasswordTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Your 8-digit verification code to reset your password',
    badge: 'SECURITY',
    badgeColor: '#fafafa',
    badgeBg: '#18181b',
    badgeBorder: '#27272a',
    headline: 'Reset Your Password',
    subheadline: 'Your One-Time 8-Digit Confirmation Code',
    bodyParagraphs: [
      'We received a request to change the password for your PowerForecast account associated with <strong style="color: #ffffff;">{{ .Email }}</strong>.',
      'Enter the 8-digit confirmation code below into the security verification prompt in PowerForecast to update your master password:',
    ],
    highlightBox: {
      label: '8-DIGIT CONFIRMATION CODE',
      value: '{{ .Token }}',
      sublabel: 'Return to your PowerForecast verification screen and enter this code to finalize your new password',
    },
    securityNotice:
      'This password reset code is single-use and will expire in 24 hours. If you did not request this change, your password remains completely secure and you can safely disregard this email.',
  });
}

/**
 * Returns the production-ready Obsidian/Zinc HTML template for Supabase Auth: Confirm Signup.
 * Features both the one-time account activation code ({{ .Token }}) and the primary confirmation button.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Confirm Signup.
 */
export function getSupabaseConfirmSignupTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Confirm your PowerForecast account registration',
    badge: 'WELCOME',
    badgeColor: '#fafafa',
    badgeBg: '#18181b',
    badgeBorder: '#27272a',
    headline: 'Welcome to PowerForecast!',
    subheadline: 'Smart Energy Optimization & Real-Time Appliance Intelligence',
    bodyParagraphs: [
      'Thank you for creating an account with PowerForecast! You are one step away from monitoring your electricity consumption, calculating Meralco appliance tariffs, and preventing monthly bill spikes.',
      'Please confirm your email address (<strong style="color: #ffffff;">{{ .Email }}</strong>) using the verification code or confirmation button below:',
    ],
    highlightBox: {
      label: 'ACCOUNT ACTIVATION CODE',
      value: '{{ .Token }}',
      sublabel: 'Enter this code in PowerForecast or click the button below to activate your account',
    },
    buttonText: 'Confirm My Account',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or open the direct confirmation URL below:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'If you did not sign up for PowerForecast, please ignore this email or contact support.',
  });
}

/**
 * Returns the production-ready Obsidian/Zinc HTML template for Supabase Auth: Magic Link.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Magic Link.
 */
export function getSupabaseMagicLinkTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Your secure passwordless sign-in link for PowerForecast',
    badge: 'MAGIC LINK',
    badgeColor: '#fafafa',
    badgeBg: '#18181b',
    badgeBorder: '#27272a',
    headline: 'Sign In to PowerForecast',
    subheadline: 'Passwordless instant authentication',
    bodyParagraphs: [
      'You requested a passwordless sign-in for your account associated with <strong style="color: #ffffff;">{{ .Email }}</strong>.',
      'Use the one-time sign-in code below or click the button to authenticate instantly:',
    ],
    highlightBox: {
      label: 'SIGN-IN OTP CODE',
      value: '{{ .Token }}',
      sublabel: 'This code is single-use and will expire shortly',
    },
    buttonText: 'Sign In Now',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or navigate directly to your unique magic link:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'This magic link will expire shortly and can only be used once. If you did not make this login request, no action is required.',
  });
}

/**
 * Returns the production-ready Obsidian/Zinc HTML template for Supabase Auth: Invite User.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Invite User.
 */
export function getSupabaseInviteUserTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'You have been invited to join PowerForecast',
    badge: 'INVITATION',
    badgeColor: '#fafafa',
    badgeBg: '#18181b',
    badgeBorder: '#27272a',
    headline: 'You Have Been Invited!',
    subheadline: 'Collaborative Household Energy Management',
    bodyParagraphs: [
      'You have been invited to join a household energy workspace on PowerForecast.',
      'Accept this invitation to view shared appliance telemetry, simulate solar offsets, and collaborate on energy quotas:',
    ],
    buttonText: 'Accept Invitation',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or accept the invitation via this URL:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'If you were not expecting this invitation, you can safely disregard this email.',
  });
}

/**
 * Returns the production-ready Obsidian/Zinc HTML template for Supabase Auth: Change Email Address.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Change Email Address.
 */
export function getSupabaseChangeEmailTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Confirm change of email address for PowerForecast',
    badge: 'EMAIL UPDATE',
    badgeColor: '#fafafa',
    badgeBg: '#18181b',
    badgeBorder: '#27272a',
    headline: 'Confirm Email Address Change',
    subheadline: 'Account security verification',
    bodyParagraphs: [
      'We received a request to update your PowerForecast account email address to <strong style="color: #ffffff;">{{ .Email }}</strong>.',
      'Enter the verification code below in PowerForecast or click the button to finalize this update:',
    ],
    highlightBox: {
      label: 'EMAIL CHANGE CODE',
      value: '{{ .Token }}',
      sublabel: 'Single-use code for confirming your email update',
    },
    buttonText: 'Confirm Email Change',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or verify via this confirmation URL:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'If you did not initiate this change, please log in immediately and review your account security settings.',
  });
}
