import { useEffect, useMemo, useRef, useState } from 'react'
import { InputNumber, Popover, Button, Space } from 'antd'
import uPlot from 'uplot'
import { useAppStore } from '../store/useAppStore'
import { fetchSpectrum } from '../api/client'
import { useUPlot } from '../hooks/useUPlot'
import type { Annotation } from '../types'

interface Props {
  channelId: number
  isFirstCol: boolean
  isLastRow: boolean
}

export function SpectrumTile({ channelId, isFirstCol, isLastRow }: Props) {
  const {
    currentFileId, cursorTime, fftSize, windowType, amplitudeScale, dbRef,
    filter, yAxisRanges, xAxisRange, setYAxisRange,
    annotations, addAnnotation, removeAnnotation, updateAnnotation,
  } = useAppStore()

  const [spec, setSpec] = useState<Float32Array | null>(null)
  const [editAxis, setEditAxis] = useState<null | 'x' | 'y'>(null)

  const bins = fftSize / 2 + 1
  const freqs = useMemo(() => {
    const arr = new Float64Array(bins)
    for (let i = 0; i < bins; i++) arr[i] = (i * 10000) / (bins - 1)
    return arr
  }, [bins])

  const yRange = yAxisRanges[channelId] || { min: -120, max: 0 }

  // 拉取频谱
  useEffect(() => {
    let cancel = false
    if (!currentFileId) return
    fetchSpectrum({
      fileId: currentFileId, channels: [channelId], t: cursorTime,
      fftSize, window: windowType, scale: amplitudeScale, dbRef, filter,
    }).then((arrs) => {
      if (!cancel) setSpec(arrs[0])
    })
    return () => { cancel = true }
  }, [currentFileId, channelId, cursorTime, fftSize, windowType, amplitudeScale, dbRef, filter])

  const data: uPlot.AlignedData = useMemo(() => {
    if (!spec) return [[], []] as any
    return [freqs as any, spec as any] as uPlot.AlignedData
  }, [spec, freqs])

  const options: uPlot.Options = useMemo(() => ({
    width: 200, height: 140,
    legend: { show: false },
    cursor: { show: true, x: true, y: true, drag: { setScale: false } },
    scales: {
      x: { time: false, min: xAxisRange.min, max: xAxisRange.max },
      y: { min: yRange.min, max: yRange.max },
    },
    axes: [
      { show: isLastRow, stroke: '#aaa', grid: { stroke: '#2a2a2a' } },
      { show: isFirstCol, stroke: '#aaa', grid: { stroke: '#2a2a2a' } },
    ],
    series: [{}, { stroke: '#36cfc9', width: 1 }],
  }), [isFirstCol, isLastRow, xAxisRange, yRange])

  const { containerRef, plotRef } = useUPlot(options, data)

  // 双击轴编辑
  useEffect(() => {
    const u = plotRef.current
    if (!u) return
    const over = u.over
    const handler = (e: MouseEvent) => {
      const rect = over.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      // 底部轴标签区（y > height - 25）
      if (y > rect.height - 25) { setEditAxis('x'); return }
      // 左侧轴标签区（x < 40）
      if (x < 40) { setEditAxis('y'); return }
    }
    over.addEventListener('dblclick', handler)
    return () => over.removeEventListener('dblclick', handler)
  }, [plotRef])

  // Ctrl+左键标注
  useEffect(() => {
    const u = plotRef.current
    if (!u) return
    const over = u.over
    const handler = (e: MouseEvent) => {
      if (!e.ctrlKey) return
      const rect = over.getBoundingClientRect()
      const px = e.clientX - rect.left
      const py = e.clientY - rect.top
      const freq = u.posToVal(px, 'x')
      // 找最近的已有标注（像素距离 < 10px）
      const list = annotations[channelId] || []
      const hit = list.find((a) => {
        const ax = u.valToPos(a.freq, 'x')
        return Math.abs(ax - px) < 10
      })
      if (hit) {
        removeAnnotation(channelId, hit.id)
      } else {
        addAnnotation(channelId, {
          id: `a-${Date.now()}-${Math.random()}`,
          freq, dx: 8, dy: -30,
        })
      }
    }
    over.addEventListener('click', handler)
    return () => over.removeEventListener('click', handler)
  }, [plotRef, annotations, channelId, addAnnotation, removeAnnotation])

  // 渲染标注
  const renderedAnnotations = (annotations[channelId] || []).map((a) => {
    const u = plotRef.current
    if (!u || !spec) return null
    const x = u.valToPos(a.freq, 'x')
    // 找最近频点的幅值
    const idx = Math.round((a.freq / 10000) * (bins - 1))
    const amp = spec[Math.max(0, Math.min(idx, spec.length - 1))]
    const y = u.valToPos(amp, 'y')
    if (!isFinite(x) || !isFinite(y)) return null
    return (
      <AnnotationBox
        key={a.id}
        x={x} y={y} dx={a.dx} dy={a.dy}
        freq={a.freq} amp={amp}
        onDrag={(dx, dy) => updateAnnotation(channelId, a.id, { dx, dy })}
      />
    )
  })

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {renderedAnnotations}
      {/* 轴编辑浮层 */}
      {editAxis && (
        <div style={{
          position: 'absolute', top: 8, right: 8, zIndex: 20,
          background: '#fff', padding: 8, borderRadius: 4,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}>
          <Space direction="vertical" size={4}>
            {editAxis === 'y' ? (
              <>
                <div style={{ fontSize: 12 }}>Y 轴范围</div>
                <InputNumber size="small" value={yRange.min}
                  onChange={(v) => v != null && setYAxisRange(channelId, { ...yRange, min: v })} />
                <InputNumber size="small" value={yRange.max}
                  onChange={(v) => v != null && setYAxisRange(channelId, { ...yRange, max: v })} />
              </>
            ) : (
              <>
                <div style={{ fontSize: 12 }}>频率范围</div>
                <InputNumber size="small" value={xAxisRange.min}
                  onChange={(v) => v != null && useAppStore.getState().setXAxisRange({ ...xAxisRange, min: v })} />
                <InputNumber size="small" value={xAxisRange.max}
                  onChange={(v) => v != null && useAppStore.getState().setXAxisRange({ ...xAxisRange, max: v })} />
              </>
            )}
            <Button size="small" type="primary" onClick={() => setEditAxis(null)}>
              确定
            </Button>
          </Space>
        </div>
      )}
      <div style={{
        position: 'absolute', top: 2, left: 4, color: '#aaa', fontSize: 11,
        pointerEvents: 'none',
      }}>
        CH{channelId + 1}
      </div>
    </div>
  )
}

/** 标注框：箭头指向锚点 + 可拖动 */
function AnnotationBox(props: {
  x: number; y: number; dx: number; dy: number
  freq: number; amp: number
  onDrag: (dx: number, dy: number) => void
}) {
  const { x, y, dx, dy, freq, amp, onDrag } = props
  const boxX = x + dx
  const boxY = y + dy
  const dragRef = useRef<{ sx: number; sy: number; odx: number; ody: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    dragRef.current = { sx: e.clientX, sy: e.clientY, odx: dx, ody: dy }
    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return
      const ndx = dragRef.current.odx + (ev.clientX - dragRef.current.sx)
      const ndy = dragRef.current.ody + (ev.clientY - dragRef.current.sy)
      onDrag(ndx, ndy)
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <>
      <svg style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <line x1={boxX} y1={boxY} x2={x} y2={y} stroke="#ffd666" strokeWidth={1} />
        <circle cx={x} cy={y} r={2.5} fill="#ffd666" />
      </svg>
      <div
        onPointerDown={onPointerDown}
        style={{
          position: 'absolute', left: boxX, top: boxY,
          background: 'rgba(0,0,0,0.75)', color: '#fff',
          padding: '2px 6px', borderRadius: 3, fontSize: 11,
          cursor: 'move', userSelect: 'none', whiteSpace: 'nowrap',
        }}
      >
        <div>f = {freq.toFixed(1)} Hz</div>
        <div>a = {amp.toFixed(2)}</div>
      </div>
    </>
  )
}