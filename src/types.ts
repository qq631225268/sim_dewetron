export interface Channel {
  id: number;
  name: string;
}
export interface UploadedFile {
  fileId: string;
  fileName: string;
}
export interface AxisRange {
  min: number;
  max: number;
}
export interface Annotation {
  id: string;
  freq: number; // Hz（按频率值存储）
  dx: number; // 标注框相对锚点的像素偏移
  dy: number;
}
export interface FilterConfig {
  type: "lowpass" | "highpass" | "bandpass" | "bandstop";
  fc1: number;
  fc2: number;
  order: number;
  zeroPhase: boolean;
}
