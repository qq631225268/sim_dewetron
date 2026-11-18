// 前端 mock：无需后端即可跑通全流程
export const MOCK_FS = 20000;
export const MOCK_DURATION = 60;
export const MOCK_CHANNELS = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  name: `CH${i + 1}`,
}));

/** 生成 min/max 包络 */
export function mockEnvelope(points: number) {
  const t = new Float64Array(points);
  const min = new Float64Array(points);
  const max = new Float64Array(points);
  for (let i = 0; i < points; i++) {
    const s = (i / points) * MOCK_DURATION;
    t[i] = s;
    const base = Math.sin(s * 0.8) * 0.1 + Math.sin(s * 3.1) * 0.03;
    // 在 15–20s、45–48s 注入"大信号"区，方便肉眼识别
    let burst = 0;
    if (s > 15 && s < 20) burst = 0.7;
    if (s > 45 && s < 48) burst = 0.4;
    const noise = Math.random() * 0.02;
    min[i] = base - burst - noise;
    max[i] = base + burst + noise;
  }
  return { t, min, max };
}

/** 生成单通道频谱（dBFS，Float32Array） */
export function mockSpectrum(
  channelId: number,
  bins: number,
  t: number,
): Float32Array {
  const arr = new Float32Array(bins);
  const f0 = 200 + channelId * 150;
  // 用 t 做一点变化，让拖游标时曲线可见变化
  const phase = Math.sin(t * 0.3 + channelId);
  for (let i = 0; i < bins; i++) {
    const freq = (i * 10000) / (bins - 1);
    let db = -100 + Math.random() * 3;
    if (Math.abs(freq - f0) < 25) db = -30 + phase * 5;
    if (Math.abs(freq - 3000) < 40) db = -50 + Math.random() * 5;
    if (freq > 8000) db -= (freq - 8000) / 100;
    arr[i] = db;
  }
  return arr;
}
