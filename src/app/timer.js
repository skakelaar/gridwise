// Countdown helper for timed sessions. Computes the remaining time from an absolute deadline so a
// reload (or a throttled background tab) never drifts.
export function createCountdown({ endsAt, onTick, onEnd, announceAt = [60, 10], onAnnounce, now = Date.now }) {
  let handle = null;
  let lastWhole = null;
  const announced = new Set();

  function remainingSeconds() {
    return Math.max(0, (endsAt - now()) / 1000);
  }

  function tick() {
    const remaining = remainingSeconds();
    const whole = Math.ceil(remaining);
    if (whole !== lastWhole) {
      lastWhole = whole;
      onTick?.(whole);
      for (const mark of announceAt) {
        if (whole === mark && !announced.has(mark)) {
          announced.add(mark);
          onAnnounce?.(mark);
        }
      }
    }
    if (remaining <= 0) {
      stop();
      onEnd?.();
    }
  }

  function start() {
    stop();
    tick();
    handle = setInterval(tick, 250);
    return api;
  }

  function stop() {
    if (handle != null) clearInterval(handle);
    handle = null;
  }

  const api = { start, stop, remainingSeconds, get running() { return handle != null; } };
  return api;
}
