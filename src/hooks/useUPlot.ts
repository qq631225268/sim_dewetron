import { useEffect, useRef } from "react";
import uPlot from "uplot";

/**
 * 创建 uPlot 实例、自适应容器尺寸、数据变化时 setData。
 * 返回容器 ref 和 uPlot 实例 ref。
 */
export function useUPlot(options: uPlot.Options, data: uPlot.AlignedData) {
  const containerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<uPlot | null>(null);

  // 创建
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    // 初始尺寸由容器决定
    const opts: uPlot.Options = {
      ...options,
      width: el.clientWidth || 300,
      height: el.clientHeight || 150,
    };
    const u = new uPlot(opts, data, el);
    plotRef.current = u;

    const ro = new ResizeObserver(() => {
      if (!plotRef.current) return;
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) plotRef.current.setSize({ width: w, height: h });
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      u.destroy();
      plotRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 数据更新
  useEffect(() => {
    plotRef.current?.setData(data);
  }, [data]);

  return { containerRef, plotRef };
}
