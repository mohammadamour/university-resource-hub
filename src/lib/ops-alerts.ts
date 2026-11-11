/**
 * Discord & Telegram ops-alert helper (server-only).
 *
 * WHY ops alerts?
 * We want instant phone/desktop pings when:
 *   - A student submits a new summary/link for moderation review
 *   - A key backend route (upload, AI quiz generation, attempt recording) hits an unexpected 500
 *
 * Supports Discord webhooks (`DISCORD_WEBHOOK_URL`) and/or Telegram bots
 * (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID`). Both are strictly opt-in: if
 * neither is configured, calls become zero-cost no-ops.
 */

const DISCORD_MAX_LEN = 1950;
const TELEGRAM_MAX_LEN = 4000;

export async function sendOpsAlert(message: string): Promise<void> {
  const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL?.trim();
  const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const telegramChatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!discordWebhookUrl && !(telegramBotToken && telegramChatId)) {
    return;
  }

  const tasks: Promise<void>[] = [];

  if (discordWebhookUrl) {
    // Discord hard-rejects `content` over 2000 chars with HTTP 400
    const content =
      message.length > DISCORD_MAX_LEN
        ? `${message.slice(0, DISCORD_MAX_LEN - 3)}...`
        : message;

    tasks.push(
      fetch(discordWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
        .then(async (res) => {
          if (!res.ok) {
            console.warn(
              `[ops-alerts] Discord webhook HTTP ${res.status}: ${await res.text().catch(() => "")}`
            );
          }
        })
        .catch((err) => {
          console.warn("[ops-alerts] Failed to send Discord alert:", err);
        })
    );
  }

  if (telegramBotToken && telegramChatId) {
    const text =
      message.length > TELEGRAM_MAX_LEN
        ? `${message.slice(0, TELEGRAM_MAX_LEN - 3)}...`
        : message;

    tasks.push(
      fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text,
          disable_web_page_preview: true,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            console.warn(
              `[ops-alerts] Telegram alert HTTP ${res.status}: ${await res.text().catch(() => "")}`
            );
          }
        })
        .catch((err) => {
          console.warn("[ops-alerts] Failed to send Telegram alert:", err);
        })
    );
  }

  // Never throw back to the caller — ops alerting must not break user requests
  await Promise.allSettled(tasks);
}
