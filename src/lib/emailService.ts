import { devLog } from './devLogger';

export type EmailTemplateType = 'household_invite' | 'budget_alert' | 'surge_alert' | 'test_email' | 'custom';

export interface SendEmailOptions {
  to: string | string[];
  subject?: string;
  html?: string;
  text?: string;
  type?: EmailTemplateType;
  data?: Record<string, any>;
  from?: string;
}

export interface EmailResult {
  success: boolean;
  id?: string;
  error?: string;
  code?: string;
  recipient?: string | string[];
  subject?: string;
}

export interface EmailHealthStatus {
  ok: boolean;
  hasApiKey: boolean;
  senderEmail?: string;
  service?: string;
  message: string;
}

/**
 * Checks backend serverless email dispatcher status and whether RESEND_API_KEY is configured on the server.
 */
export async function checkEmailDeliveryHealth(): Promise<EmailHealthStatus> {
  try {
    const res = await fetch('/api/send_email', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (res.ok) {
      const data = await res.json();
      return {
        ok: true,
        hasApiKey: Boolean(data.hasApiKey),
        senderEmail: data.senderEmail,
        service: data.service,
        message: data.hasApiKey
          ? 'Resend API key configured on serverless environment.'
          : 'Serverless email dispatcher reachable, but RESEND_API_KEY is not configured on the server.',
      };
    }
  } catch (err: any) {
    devLog.warn('EmailService', 'Failed to probe /api/send_email endpoint:', err);
  }

  return {
    ok: false,
    hasApiKey: false,
    message: 'Serverless email dispatcher (/api/send_email) is unreachable.',
  };
}

/**
 * Dispatches an email via Vercel Serverless /api/send_email endpoint.
 * SECURITY: All API keys remain strictly on the server side to prevent client secret exposure.
 */
export async function sendEmail(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, text, type, data, from } = options;

  if (!to || (Array.isArray(to) && to.length === 0)) {
    return {
      success: false,
      error: 'Recipient email address is required.',
      code: 'MISSING_RECIPIENT',
    };
  }

  devLog.info('EmailService', `Attempting email delivery to ${JSON.stringify(to)} [type: ${type || 'standard'}]...`);

  try {
    const response = await fetch('/api/send_email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        type,
        data,
        from,
      }),
    });

    const json = await response.json().catch(() => ({}));

    if (response.ok && json.success) {
      devLog.info('EmailService', 'Email sent successfully via /api/send_email', json);
      return {
        success: true,
        id: json.id,
        recipient: json.recipient,
        subject: json.subject,
      };
    }

    devLog.warn('EmailService', `Serverless endpoint error (HTTP ${response.status}):`, json);
    return {
      success: false,
      error: json.error || 'Failed to deliver email through serverless email dispatcher.',
      code: json.code || 'SERVER_ERROR',
    };
  } catch (serverlessError: any) {
    devLog.error('EmailService', 'Serverless /api/send_email endpoint request failed:', serverlessError);
    return {
      success: false,
      error: `Email delivery network error: ${serverlessError?.message || 'Failed to reach backend service'}`,
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Dispatches a branded Household Member Invitation email.
 */
export async function sendHouseholdInvitationEmail(params: {
  toName: string;
  toEmail: string;
  inviterName: string;
  inviteCode: string;
  inviteLink: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'household_invite',
    data: {
      inviterName: params.inviterName,
      inviteCode: params.inviteCode,
      inviteLink: params.inviteLink,
      toName: params.toName,
    },
  });
}

/**
 * Dispatches an Energy Budget threshold warning email.
 */
export async function sendEnergyBudgetAlertEmail(params: {
  toEmail: string;
  userName: string;
  currentKwh: number;
  budgetLimitKwh: number;
  percentConsumed: number;
  projectedBill: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'budget_alert',
    data: {
      userName: params.userName,
      currentKwh: params.currentKwh.toFixed(1),
      budgetLimitKwh: params.budgetLimitKwh.toFixed(1),
      percentConsumed: `${Math.round(params.percentConsumed)}%`,
      projectedBill: params.projectedBill,
    },
  });
}

/**
 * Dispatches an active Wattage Surge warning email.
 */
export async function sendSurgeAlertEmail(params: {
  toEmail: string;
  currentWatts: number;
  thresholdWatts: number;
  timestamp?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'surge_alert',
    data: {
      currentWatts: Math.round(params.currentWatts).toString(),
      thresholdWatts: Math.round(params.thresholdWatts).toString(),
      timestamp: params.timestamp || new Date().toLocaleTimeString(),
    },
  });
}

/**
 * Dispatches a diagnostic test email to verify SMTP & Resend delivery.
 */
export async function sendSmtpTestEmail(params: {
  toEmail: string;
  testNote?: string;
}): Promise<EmailResult> {
  return sendEmail({
    to: params.toEmail,
    type: 'test_email',
    data: {
      recipient: params.toEmail,
      timestamp: new Date().toLocaleString(),
      note: params.testNote || 'Operational check via PowerForecast Settings Diagnostics',
    },
  });
}
