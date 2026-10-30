
const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  // TODO: retry transient errors only: AbortError, 429, 5xx, or network errors.
  // Never retry 4xx client errors other than 429.
  if (!error) return false;

  if (error.name === 'AbortError') return true;

  const status = error.status ?? error.statusCode ?? error.response?.status;

  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if (status >= 400 && status <= 499) return false;

  if (error.name === 'TypeError') return true;

  const retryableCodes = [
    'ECONNRESET',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'EAI_AGAIN',
    'ENETUNREACH',
    'EHOSTUNREACH',
    'ECONNABORTED',
  ];

  return retryableCodes.includes(error.code);
}

async function withTimeout(operation, timeoutMs) {
  // TODO: create AbortController, abort after timeoutMs,
  // call operation(controller.signal), always clear timer in finally.
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(operation, options = {}) {
  // TODO: maxAttempts defaults to 3.
  // Run operation, retry only isRetryable errors.
  // Between attempts await sleep(baseDelayMs * 2 ** attempt).
  // Throw final error after max attempts or non-retryable error.
  const maxAttempts = options.maxAttempts ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 25;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxAttempts - 1 || !isRetryable(error)) {
        throw error;
      }

      await sleep(baseDelayMs * 2 ** attempt);
    }
  }
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs || 200;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  try {
    // TODO: compose retry around timeout around avatarClient.getAvatar.
    // Return { authorId, avatar, degraded: false } on success.
    const avatar = await withRetry(
      () =>
        withTimeout(
          signal => avatarClient.getAvatar(authorId, { signal }),
          timeoutMs
        ),
      { maxAttempts, baseDelayMs }
    );

    return { authorId, avatar, degraded: false };
  } catch (error) {
    // TODO: return { authorId, avatar: DEFAULT_AVATAR, degraded: true }.
    // Keep fallback local; do not throw for avatar failure.
    return { authorId, avatar: DEFAULT_AVATAR, degraded: true };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};
