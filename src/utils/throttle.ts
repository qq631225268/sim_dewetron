/**
 * 保证：拖动中最多每 ms 触发一次；松手后一定触发最后一次。
 * 用法：const s = createThrottle(40); s.fire(fn); s.fire(fn) ...
 */
export function createThrottle(ms: number) {
  let last = 0;
  let timer: number | null = null;
  let pending: (() => void) | null = null;
  return {
    fire(fn: () => void) {
      const now = Date.now();
      pending = fn;
      if (now - last >= ms) {
        last = now;
        const f = pending;
        pending = null;
        f && f();
      } else if (timer == null) {
        timer = window.setTimeout(
          () => {
            timer = null;
            last = Date.now();
            const f = pending;
            pending = null;
            f && f();
          },
          ms - (now - last),
        );
      }
    },
  };
}
