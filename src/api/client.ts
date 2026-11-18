import { FIFOCache } from "../utils/fifoCache";
import {
  MOCK_CHANNELS,
  MOCK_DURATION,
  MOCK_FS,
  mockEnvelope,
  mockSpectrum,
} from "../mock/synth";
import type { Channel, FilterConfig, UploadedFile } from "../types";

const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";
const BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const spectrumCache = new FIFOCache<Float32Array[]>(200);

function cacheKey(p: any) {
  return JSON.stringify(p);
}

export async function uploadFile(file: File): Promise<UploadedFile> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    return { fileId: "mock-" + Date.now(), fileName: file.name };
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BASE}/api/files/upload`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) throw new Error("上传失败");
  return res.json();
}

export async function fetchMeta(fileId: string) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 200));
    return {
      channels: MOCK_CHANNELS as Channel[],
      fs: MOCK_FS,
      duration: MOCK_DURATION,
      nSamples: MOCK_FS * MOCK_DURATION,
    };
  }
  const res = await fetch(`${BASE}/api/files/${fileId}/meta`);
  return res.json();
}

export async function fetchEnvelope(
  fileId: string,
  ch: number,
  points: number,
): Promise<{ t: Float64Array; min: Float32Array; max: Float32Array }> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 100));
    const { t, min, max } = mockEnvelope(points);
    return { t, min: Float32Array.from(min), max: Float32Array.from(max) };
  }
  const res = await fetch(
    `${BASE}/api/files/${fileId}/waveform?ch=${ch}&points=${points}`,
  );
  const j = await res.json();
  return {
    t: Float64Array.from(j.t),
    min: Float32Array.from(j.min),
    max: Float32Array.from(j.max),
  };
}

export interface SpectrumParams {
  fileId: string;
  channels: number[];
  t: number;
  fftSize: number;
  window: string;
  scale: "db" | "linear";
  dbRef: "dbfs" | "re1";
  filter: FilterConfig | null;
}

/** 返回每个通道的频谱数组（Float32Array） */
export async function fetchSpectrum(
  p: SpectrumParams,
): Promise<Float32Array[]> {
  const key = cacheKey(p);
  const hit = spectrumCache.get(key);
  if (hit) return hit;

  let result: Float32Array[];

  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 30));
    const bins = p.fftSize / 2 + 1;
    result = p.channels.map((ch) => mockSpectrum(ch, bins, p.t));
  } else {
    const res = await fetch(`${BASE}/api/files/${p.fileId}/spectrum`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channels: p.channels,
        t: p.t,
        fftSize: p.fftSize,
        window: p.window,
        scale: p.scale,
        dbRef: p.dbRef,
        filter: p.filter,
      }),
    });
    const nCh = Number(res.headers.get("X-Channels"));
    const fftSize = Number(res.headers.get("X-FftSize"));
    const bins = fftSize / 2 + 1;
    const buf = await res.arrayBuffer();
    const all = new Float32Array(buf);
    result = [];
    for (let i = 0; i < nCh; i++) {
      result.push(all.slice(i * bins, (i + 1) * bins));
    }
  }

  spectrumCache.set(key, result);
  return result;
}

export function clearSpectrumCache() {
  spectrumCache.clear();
}
