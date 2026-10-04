/**
 * PowerForecast Branded Email Templates
 * Responsive, modern light-themed HTML email templates matching the PowerForecast brand aesthetic.
 * Clean #ffffff cards, neutral #e4e4e7 borders, #09090b typography, and emerald accents.
 * Compatible with Supabase GoTrue Auth Templates and in-app transactional dispatchers.
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
 * Builds a universal, responsive HTML email template using inline CSS for cross-client compatibility.
 */
export function buildBrandedEmailHtml(config: EmailTemplateConfig): string {
  const {
    preheader = 'PowerForecast Energy Notification',
    badge = 'ENERGY INTELLIGENCE',
    badgeColor = '#047857',
    badgeBg = '#ecfdf5',
    badgeBorder = '#a7f3d0',
    headline,
    subheadline,
    bodyParagraphs,
    highlightBox,
    metricsTable,
    buttonText,
    buttonUrl,
    fallbackUrlLabel = 'Or paste this URL in your browser:',
    fallbackUrl,
    securityNotice = 'If you did not request this action, you can safely ignore this email.',
  } = config;

  const paragraphsHtml = bodyParagraphs
    .map(
      (p) =>
        `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #3f3f46;">${p}</p>`
    )
    .join('');

  const highlightHtml = highlightBox
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 18px 20px;">
        <tr>
          <td align="center">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #64748b; margin-bottom: 6px;">${highlightBox.label}</div>
            <div style="font-size: 26px; font-weight: 800; letter-spacing: 3px; color: #047857; font-family: 'JetBrains Mono', 'Courier New', monospace;">${highlightBox.value}</div>
            ${highlightBox.sublabel ? `<div style="font-size: 12px; color: #64748b; margin-top: 6px;">${highlightBox.sublabel}</div>` : ''}
          </td>
        </tr>
      </table>
    `
    : '';

  const tableHtml = metricsTable && metricsTable.length > 0
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 20px 0; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
        ${metricsTable
          .map(
            (row, idx) => `
          <tr style="${idx > 0 ? 'border-top: 1px solid #f4f4f5;' : ''}">
            <td style="padding: 12px 18px; font-size: 14px; color: #71717a;">${row.label}</td>
            <td style="padding: 12px 18px; font-size: 14px; font-weight: 700; text-align: right; color: ${
              row.highlight ? '#047857' : '#09090b'
            };">${row.value}</td>
          </tr>`
          )
          .join('')}
      </table>
    `
    : '';

  const buttonActionUrl = buttonUrl || fallbackUrl;
  const buttonHtml = buttonText && buttonActionUrl
    ? `
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 28px 0 20px 0;">
        <tr>
          <td align="center">
            <table role="presentation" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="border-radius: 8px; background-color: #09090b;">
                  <a href="${buttonActionUrl}" target="_blank" rel="noopener noreferrer" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 13px 32px; border-radius: 8px; display: inline-block; letter-spacing: 0.2px; background-color: #09090b; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);">
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
      <div style="background: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 8px; padding: 12px 16px; margin-top: 20px;">
        <div style="font-size: 11px; font-weight: 600; color: #71717a; margin-bottom: 4px;">${fallbackUrlLabel}</div>
        <a href="${buttonActionUrl}" target="_blank" rel="noopener noreferrer" style="font-size: 12px; color: #09090b; word-break: break-all; text-decoration: underline; line-height: 1.4;">${buttonActionUrl}</a>
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
<body style="margin: 0; padding: 0; background-color: #f4f4f5; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%;">
  <!-- Preheader text (hidden in body but shown in inbox preview) -->
  <div style="display: none; max-height: 0px; overflow: hidden; mso-hide: all; font-size: 1px; line-height: 1px; color: #f4f4f5; opacity: 0;">
    ${preheader}
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; padding: 36px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);">
          
          <!-- Brand Header -->
          <tr>
            <td style="padding: 24px 32px 20px 32px; border-bottom: 1px solid #f4f4f5; background-color: #ffffff;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="vertical-align: middle; width: 42px;">
                    <img src="${POWERFORECAST_LOGO_URL}" alt="PowerForecast" width="36" height="36" style="display: block; border-radius: 8px; border: 1px solid #e4e4e7;" />
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 19px; font-weight: 800; color: #09090b; letter-spacing: -0.3px;">
                          Power<span style="color: #10b981;">Forecast</span>
                        </td>
                        <td style="padding-left: 10px;">
                          <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 700; background-color: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 999px; letter-spacing: 0.5px; text-transform: uppercase; border: 1px solid ${badgeBorder};">
                            ${badge}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: 500; color: #71717a; letter-spacing: 0.2px; padding-top: 2px;">
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
              
              <h1 style="margin: 0 0 10px 0; font-size: 22px; font-weight: 800; color: #09090b; letter-spacing: -0.3px; line-height: 1.3;">
                ${headline}
              </h1>

              ${
                subheadline
                  ? `<p style="margin: 0 0 20px 0; font-size: 14px; color: #059669; font-weight: 600;">${subheadline}</p>`
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
            <td style="padding: 20px 32px 24px 32px; border-top: 1px solid #f4f4f5; background-color: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
              <p style="margin: 0 0 10px 0; font-size: 12px; line-height: 1.5; color: #71717a;">
                🛡️ <strong>Security Notice:</strong> ${securityNotice}
              </p>
              <div style="font-size: 11px; line-height: 1.5; color: #a1a1aa;">
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
 * Returns the production-ready HTML template for Supabase Auth: Reset Password.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Reset Password.
 */
export function getSupabaseResetPasswordTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Reset your PowerForecast account password',
    badge: 'SECURITY',
    badgeColor: '#047857',
    headline: 'Reset Your Password',
    subheadline: 'A request was received to reset your password',
    bodyParagraphs: [
      'We received a request to change the password for your PowerForecast account associated with <strong>{{ .Email }}</strong>.',
      'To choose a new secure password and restore full access to your energy monitors, click the button below:',
    ],
    buttonText: 'Reset Password',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'If the button does not work, copy and paste this link in your browser:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'This password reset link is single-use and will expire in 24 hours. If you did not request this change, your password remains completely secure and you can safely disregard this email.',
  });
}

/**
 * Returns the production-ready HTML template for Supabase Auth: Confirm Signup.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Confirm Signup.
 */
export function getSupabaseConfirmSignupTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Confirm your PowerForecast account registration',
    badge: 'WELCOME',
    badgeColor: '#047857',
    headline: 'Welcome to PowerForecast!',
    subheadline: 'Smart Energy Optimization & Real-Time Appliance Intelligence',
    bodyParagraphs: [
      'Thank you for creating an account with PowerForecast! You are one step away from monitoring your electricity consumption, calculating Meralco appliance tariffs, and preventing monthly bill spikes.',
      'Please confirm your email address (<strong>{{ .Email }}</strong>) to activate your account:',
    ],
    buttonText: 'Confirm My Account',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or open the direct confirmation URL below:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'If you did not sign up for PowerForecast, please ignore this email or contact support.',
  });
}

/**
 * Returns the production-ready HTML template for Supabase Auth: Magic Link.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Magic Link.
 */
export function getSupabaseMagicLinkTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Your secure passwordless sign-in link for PowerForecast',
    badge: 'MAGIC LINK',
    badgeColor: '#047857',
    headline: 'Sign In to PowerForecast',
    subheadline: 'Passwordless instant authentication',
    bodyParagraphs: [
      'You requested a passwordless sign-in link for your account associated with <strong>{{ .Email }}</strong>.',
      'Click the button below to authenticate instantly:',
    ],
    buttonText: 'Sign In Now',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or navigate directly to your unique magic link:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'This magic link will expire shortly and can only be used once. If you did not make this login request, no action is required.',
  });
}

/**
 * Returns the production-ready HTML template for Supabase Auth: Invite User.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Invite User.
 */
export function getSupabaseInviteUserTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'You have been invited to join PowerForecast',
    badge: 'TEAM INVITATION',
    badgeColor: '#047857',
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
 * Returns the production-ready HTML template for Supabase Auth: Change Email Address.
 * Copy and paste this directly into Supabase Dashboard -> Authentication -> Email Templates -> Change Email Address.
 */
export function getSupabaseChangeEmailTemplate(): string {
  return buildBrandedEmailHtml({
    preheader: 'Confirm change of email address for PowerForecast',
    badge: 'EMAIL UPDATE',
    badgeColor: '#047857',
    headline: 'Confirm Email Address Change',
    subheadline: 'Account security verification',
    bodyParagraphs: [
      'We received a request to update your PowerForecast account email address to <strong>{{ .Email }}</strong>.',
      'Click the button below to confirm and finalize this update:',
    ],
    buttonText: 'Confirm Email Change',
    buttonUrl: '{{ .ConfirmationURL }}',
    fallbackUrlLabel: 'Or verify via this confirmation URL:',
    fallbackUrl: '{{ .ConfirmationURL }}',
    securityNotice:
      'If you did not initiate this change, please log in immediately and review your account security settings.',
  });
}
