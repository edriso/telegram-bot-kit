import { afterEach, describe, expect, it, vi } from 'vitest';
import { GrammyError } from 'grammy';
import type { Bot, Context } from 'grammy';
import { sendMessage, sendMessages } from './send';

/**
 * No network: we hand sendMessage a fake bot whose only method is
 * `api.sendMessage`, a vi.fn we script per test (resolve, or reject with a
 * GrammyError). We assert the mapped SendResult and how many attempts ran.
 */
function fakeBot(sendMock: ReturnType<typeof vi.fn>): Bot<Context> {
  return { api: { sendMessage: sendMock } } as unknown as Bot<Context>;
}

/**
 * Build something that passes `instanceof GrammyError` without depending on the
 * constructor's exact signature: set the prototype, then the two fields the
 * code reads (error_code and parameters.retry_after).
 */
function grammyError(errorCode: number, retryAfter?: number): GrammyError {
  const err = Object.create(GrammyError.prototype) as {
    error_code: number;
    description: string;
    parameters: { retry_after?: number };
  };
  err.error_code = errorCode;
  err.description = 'test';
  err.parameters = retryAfter === undefined ? {} : { retry_after: retryAfter };
  return err as unknown as GrammyError;
}

const CHAT = 123456789n;

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('sendMessage', () => {
  it("returns 'ok' on a successful send", async () => {
    const send = vi.fn().mockResolvedValue({ message_id: 1 });
    await expect(sendMessage(fakeBot(send), CHAT, 'hi')).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(Number(CHAT), 'hi');
  });

  it("returns 'blocked' on a 403 and does not retry", async () => {
    const send = vi.fn().mockRejectedValue(grammyError(403));
    await expect(sendMessage(fakeBot(send), CHAT, 'hi')).resolves.toBe('blocked');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns 'failed' on a non-403/429 GrammyError", async () => {
    const send = vi.fn().mockRejectedValue(grammyError(400));
    await expect(sendMessage(fakeBot(send), CHAT, 'hi')).resolves.toBe('failed');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns 'failed' on a non-Grammy error (e.g. a network throw)", async () => {
    const send = vi.fn().mockRejectedValue(new Error('socket hang up'));
    await expect(sendMessage(fakeBot(send), CHAT, 'hi')).resolves.toBe('failed');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('waits the retry_after on a 429 then retries once and succeeds', async () => {
    vi.useFakeTimers();
    const send = vi
      .fn()
      .mockRejectedValueOnce(grammyError(429, 2))
      .mockResolvedValueOnce({ message_id: 1 });
    const p = sendMessage(fakeBot(send), CHAT, 'hi');
    await vi.advanceTimersByTimeAsync(2000);
    await expect(p).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("maps a 403 ON THE RETRY to 'blocked' (not 'failed')", async () => {
    // The regression this guards: the old retry path reported any retry error,
    // including a 403, as 'failed', so a user who blocked the bot mid-burst was
    // never marked blocked and got retried for ever.
    vi.useFakeTimers();
    const send = vi
      .fn()
      .mockRejectedValueOnce(grammyError(429, 1))
      .mockRejectedValueOnce(grammyError(403));
    const p = sendMessage(fakeBot(send), CHAT, 'hi');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('blocked');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns 'failed' when the retry is itself rate limited", async () => {
    vi.useFakeTimers();
    const send = vi
      .fn()
      .mockRejectedValueOnce(grammyError(429, 1))
      .mockRejectedValueOnce(grammyError(429, 1));
    const p = sendMessage(fakeBot(send), CHAT, 'hi');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('failed');
    expect(send).toHaveBeenCalledTimes(2);
  });

  it("returns 'failed' without waiting when retry_after exceeds the cap", async () => {
    const send = vi.fn().mockRejectedValue(grammyError(429, 31));
    // No fake timers needed: a too-long retry_after must give up immediately,
    // without sleeping or a second attempt.
    await expect(sendMessage(fakeBot(send), CHAT, 'hi')).resolves.toBe('failed');
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('defaults a missing retry_after to 1 second', async () => {
    vi.useFakeTimers();
    const send = vi
      .fn()
      .mockRejectedValueOnce(grammyError(429))
      .mockResolvedValueOnce({ message_id: 1 });
    const p = sendMessage(fakeBot(send), CHAT, 'hi');
    await vi.advanceTimersByTimeAsync(1000);
    await expect(p).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe('sendMessages', () => {
  it("returns 'ok' only when every message is delivered, in order", async () => {
    const send = vi.fn().mockResolvedValue({ message_id: 1 });
    await expect(sendMessages(fakeBot(send), CHAT, ['a', 'b', 'c'])).resolves.toBe('ok');
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map((c) => c[1])).toEqual(['a', 'b', 'c']);
  });

  it('stops at the first non-ok result and returns it', async () => {
    const send = vi
      .fn()
      .mockResolvedValueOnce({ message_id: 1 })
      .mockRejectedValueOnce(grammyError(403))
      .mockResolvedValue({ message_id: 2 });
    await expect(sendMessages(fakeBot(send), CHAT, ['a', 'b', 'c'])).resolves.toBe('blocked');
    // Stopped after the 403: the third message was never attempted.
    expect(send).toHaveBeenCalledTimes(2);
  });
});
