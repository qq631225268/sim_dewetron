import { create } from "zustand";
import type {
  AxisRange,
  Channel,
  FilterConfig,
  Annotation,
  UploadedFile,
} from "../types";

interface AppState {
  // 文件
  uploadedFiles: UploadedFile[];
  currentFileId: string | null;
  currentFileName: string | null;
  // meta
  channels: Channel[];
  fs: number;
  duration: number;
  // 游标
  cursorTime: number;
  // 左侧
  selectedChannelIds: number[];
  // FFT
  fftSize: number;
  windowType: "hann" | "hamming" | "blackman" | "rect";
  amplitudeScale: "db" | "linear";
  dbRef: "dbfs" | "re1";
  // 滤波
  filter: FilterConfig | null;
  // 网格
  gridRows: number;
  gridCols: number;
  // 时域通道
  timeDomainChannelId: number | null;
  // 显示态：轴范围（按 channelId 存）
  yAxisRanges: Record<number, AxisRange>;
  xAxisRange: AxisRange;
  // 标注（按 channelId 存）
  annotations: Record<number, Annotation[]>;
  // UI
  leftCollapsed: boolean;
  rightOpen: boolean;
  loading: boolean;

  // actions
  addUploadedFile: (f: UploadedFile) => void;
  setActiveFile: (f: UploadedFile) => Promise<void>;
  setMeta: (channels: Channel[], fs: number, duration: number) => void;
  setCursorTime: (t: number) => void;
  toggleChannel: (id: number) => void;
  selectAll: () => void;
  selectNone: () => void;
  invertSelection: () => void;
  setYAxisRange: (ch: number, r: AxisRange) => void;
  setXAxisRange: (r: AxisRange) => void;
  addAnnotation: (ch: number, a: Annotation) => void;
  removeAnnotation: (ch: number, id: string) => void;
  updateAnnotation: (
    ch: number,
    id: string,
    patch: Partial<Annotation>,
  ) => void;
  set: <K extends keyof AppState>(k: K, v: AppState[K]) => void;
  resetDisplayState: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  uploadedFiles: [],
  currentFileId: null,
  currentFileName: null,
  channels: [],
  fs: 20000,
  duration: 0,
  cursorTime: 0,
  selectedChannelIds: [],
  fftSize: 2048,
  windowType: "hann",
  amplitudeScale: "db",
  dbRef: "dbfs",
  filter: null,
  gridRows: 4,
  gridCols: 5,
  timeDomainChannelId: null,
  yAxisRanges: {},
  xAxisRange: { min: 0, max: 10000 },
  annotations: {},
  leftCollapsed: false,
  rightOpen: true,
  loading: false,

  addUploadedFile: (f) =>
    set((s) => ({ uploadedFiles: [...s.uploadedFiles, f] })),

  setActiveFile: async (f) => {
    set({ loading: true });
    try {
      // 清缓存 + 清显示态
      const { clearSpectrumCache } = await import("../api/client");
      clearSpectrumCache();
      set({
        currentFileId: f.fileId,
        currentFileName: f.fileName,
        yAxisRanges: {},
        xAxisRange: { min: 0, max: 10000 },
        annotations: {},
      });
      const meta = await (await import("../api/client")).fetchMeta(f.fileId);
      set({
        channels: meta.channels,
        fs: meta.fs,
        duration: meta.duration,
        selectedChannelIds: meta.channels.map((c: Channel) => c.id),
        timeDomainChannelId: meta.channels[0]?.id ?? null,
      });
      const cur = get().cursorTime;
      if (cur > meta.duration) set({ cursorTime: meta.duration });
    } finally {
      set({ loading: false });
    }
  },

  setMeta: (channels, fs, duration) => set({ channels, fs, duration }),
  setCursorTime: (t) => set({ cursorTime: t }),

  toggleChannel: (id) =>
    set((s) => ({
      selectedChannelIds: s.selectedChannelIds.includes(id)
        ? s.selectedChannelIds.filter((c) => c !== id)
        : [...s.selectedChannelIds, id],
    })),
  selectAll: () =>
    set((s) => ({
      selectedChannelIds: s.channels.map((c) => c.id),
    })),
  selectNone: () => set({ selectedChannelIds: [] }),
  invertSelection: () =>
    set((s) => {
      const all = s.channels.map((c) => c.id);
      const setSel = new Set(s.selectedChannelIds);
      return { selectedChannelIds: all.filter((id) => !setSel.has(id)) };
    }),

  setYAxisRange: (ch, r) =>
    set((s) => ({ yAxisRanges: { ...s.yAxisRanges, [ch]: r } })),
  setXAxisRange: (r) => set({ xAxisRange: r }),

  addAnnotation: (ch, a) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [ch]: [...(s.annotations[ch] || []), a],
      },
    })),
  removeAnnotation: (ch, id) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [ch]: (s.annotations[ch] || []).filter((x) => x.id !== id),
      },
    })),
  updateAnnotation: (ch, id, patch) =>
    set((s) => ({
      annotations: {
        ...s.annotations,
        [ch]: (s.annotations[ch] || []).map((x) =>
          x.id === id ? { ...x, ...patch } : x,
        ),
      },
    })),

  set: (k, v) => set({ [k]: v } as any),
  resetDisplayState: () =>
    set({
      yAxisRanges: {},
      xAxisRange: { min: 0, max: 10000 },
      annotations: {},
    }),
}));
