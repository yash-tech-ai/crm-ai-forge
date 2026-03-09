import { createTransport, type Transporter } from "nodemailer";
import pino from "pino";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info" });

let transporter: Transporter | null = null;

interface EmailOptions {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  headers?: Record<string, string>;
}

interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Gets or creates the Nodemailer transporter.
 * Falls back to a test/log-only mode if SMTP is not configured.
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT ?? "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    transporter = createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    logger.info({ host, port }, "SMTP transporter configured");
  } else {
    // Development fallback — log emails instead of sending
    transporter = createTransport({
      jsonTransport: true,
    });
    logger.warn("No SMTP configured — emails will be logged only (dev mode)");
  }

  return transporter;
}

/**
 * Sends an email using the configured SMTP transporter.
 */
export async function sendEmail(options: EmailOptions): Promise<SendResult> {
  const transport = getTransporter();

  try {
    const result = await transport.sendMail({
      from: options.fromName
        ? `"${options.fromName}" <${options.from}>`
        : options.from,
      to: options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      headers: {
        "List-Unsubscribe": options.headers?.["List-Unsubscribe"] ?? "",
        ...options.headers,
      },
    });

    // In dev mode (jsonTransport), log the email
    if (!process.env.SMTP_HOST) {
      logger.info(
        {
          to: options.to,
          subject: options.subject,
          messageId: result.messageId,
        },
        "Email logged (dev mode — no SMTP configured)"
      );
    }

    return {
      success: true,
      messageId: result.messageId,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown email error";
    logger.error({ to: options.to, error }, "Failed to send email");
    return { success: false, error };
  }
}
