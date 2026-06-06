import type { Bot } from 'grammy';
import { GrammyError, type Context } from 'grammy';
import { logger } from './logger';

export type SendResult = 'ok' | 'blocked' | 'failed';

// Cap on how long we wait out a Telegram rate limit before giving up on a
// message. A daily delivery can be several messages, so a burst may hit the
// per-chat flood limit; we honour one retry-after wait within this cap.
const MAX_RETRY_AFTER_SECONDS = 30;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The outcome of one raw send attempt, with the Telegram error already mapped:
 *   - `{ done }`        : a terminal result ('ok' | 'blocked' | 'failed') to
 *                         return as-is.
 *   - `{ retryAfter }`  : a 429; the caller decides whether to wait it out.
 *
 * Classifying the error here (rather than inline at each call site) is what
 * lets the first try and the retry treat a 403/other error identically. The
 * retry used to be a second, subtly-different path that reported a blocked user
 * as merely 'failed', so they were never marked blocked and got retried for
 * ever.
 */
type Attempt = { done: SendResult } | { retryAfter: number };

async function attemptSend(bot: Bot<Context>, chatId: bigint, text: string): Promise<Attempt> {
  try {
    await bot.api.sendMessage(Number(chatId), text);
    return { done: 'ok' };
  } catch (err) {
    if (err instanceof GrammyError && err.error_code === 403) {
      logger.info('Subscriber has blocked the bot', { chatId: String(chatId) });
      return { done: 'blocked' };
    }
    if (err instanceof GrammyError && err.error_code === 429) {
      return { retryAfter: err.parameters?.retry_after ?? 1 };
    }
    logger.error('Failed to send message', { chatId: String(chatId), error: String(err) });
    return { done: 'failed' };
  }
}

/**
 * Send one plain-text message to a chat. No parse_mode on purpose: Quran text
 * contains characters Markdown/HTML parsing would reject with a 400, so plain
 * text is the only safe choice.
 *
 * Returns:
 *   'ok'      - delivered.
 *   'blocked' - the user blocked the bot or deleted the chat (403). The caller
 *               should mark them blocked so we stop trying.
 *   'failed'  - any other error (transient). The caller does not advance the
 *               subscriber, so the same content is retried next time.
 *
 * On a 429 (too many requests) we wait the server's suggested retry_after once
 * and try again, which smooths out a multi-message burst to one chat. A retry
 * that itself returns 403 is reported as 'blocked', not 'failed'.
 */
export async function sendMessage(
  bot: Bot<Context>,
  chatId: bigint,
  text: string,
): Promise<SendResult> {
  const first = await attemptSend(bot, chatId, text);
  if ('done' in first) return first.done;

  // A 429: honour the server's retry_after once, but only within our cap.
  // Waiting longer than the cap risks holding up the whole daily run, so we
  // give up and let the caller retry the delivery on the next tick.
  const { retryAfter } = first;
  if (retryAfter > MAX_RETRY_AFTER_SECONDS) {
    logger.error('Rate limited beyond cap, giving up', { chatId: String(chatId), retryAfter });
    return 'failed';
  }
  logger.warn('Rate limited, waiting then retrying once', { chatId: String(chatId), retryAfter });
  await sleep(retryAfter * 1000);

  // A second 429 means the chat is still flooded; stop here rather than loop.
  const second = await attemptSend(bot, chatId, text);
  return 'done' in second ? second.done : 'failed';
}

/**
 * Send several messages to a chat in order. Stops at the first failure and
 * returns its result, so the caller does not record the delivery (it will be
 * retried). Returns 'ok' only if every message was delivered.
 */
export async function sendMessages(
  bot: Bot<Context>,
  chatId: bigint,
  texts: string[],
): Promise<SendResult> {
  for (const text of texts) {
    const result = await sendMessage(bot, chatId, text);
    if (result !== 'ok') return result;
  }
  return 'ok';
}
