import { useEffect, useMemo, useRef, useState } from 'react'
import { Spin } from 'antd'
import uPlot from 'uplot'
import { useAppStore } from '../store/useAppStore'
import { fetchEnvelope } from '../api/client'
import { useUPlot } from '../hooks/useUPlot'
import { createThrottle } from '../utils/throttle'

export function TimeDomain() {
  const {
    currentFileId, timeDomainChannelId, duration, cursorTime,
    setCursorTime, loading,
  } = useAppStore()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [env, setEnv] = useState<{ t: Float64Array; min: Float32Array; max: Float32Array } | null>(null)
  const [width, setWidth] = useState(800)
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const throttleRef = useRef(createThrottle(40))
  const draggingRef = useRef(false)

  const height = Math.max(40, Math.round(window.innerHeight * 0.02))

  // 容器宽度自适应
  useEffect(() => {
    if (!wrapperRef.current) return
    const ro = new ResizeObserver(() => {
      setWidth(wrapperRef.current?.clientWidth || 800)
    })
    ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // 拉取包络
  useEffect(() => {
    let cancel = false
    if (!currentFileId || timeDomainChannelId == null) { setEnv(null); return }
    fetchEnvelope(currentFileId, timeDomainChannelId, Math.max(width, 400))
      .then((d) => { if (!cancel) setEnv(d) })
      .catch(() => {})
    return () => { cancel = true }
  }, [currentFileId, timeDomainChannelId, width])

  const data: uPlot.AlignedData = useMemo(() => {
    if (!env) return [[], [], []] as any
    return [env.t as any, env.min as any, env.max as any] as uPlot.AlignedData
  }, [env])

  const options: uPlot.Options = useMemo(() => ({
    width,
    height,
    legend: { show: false },
    cursor: { show: true, x: false, y: false, drag: { setScale: false } },
    scales: { x: { time: false, min: 0, max: duration || 60 } },
    axes: [{ show: false }, { show: false }],
    series: [
      {},
      { stroke: '#fa8c16', width: 0, fill: 'rgba(250,140,22,0.25)' },
      { stroke: '#fa8c16', width: 0, fill: 'rgba(250,140,22,0.25)' },
    ],
    bands: [{ series: [1, 2] }],
    hooks: {
      setCursor: [(u) => {
        if (u.cursor.left != null) {
          setHoverTime(u.posToVal(u.cursor.left, 'x'))
        } else setHoverTime(null)
      }],
    },
  }), [width, height, duration])

  const { containerRef, plotRef } = useUPlot(options, data)

  // 游标像素位置
  const cursorX = useMemo(() => {
    const u = plotRef.current
    if (!u) return 0
    return u.valToPos(cursorTime, 'x')
  }, [cursorTime, env, width])

  // 拖动游标（拖一下停住）
  const onPointerDown = (e: React.PointerEvent) => {
    const u = plotRef.current
    if (!u || !wrapperRef.current) return
    const rect = u.over.getBoundingClientRect()
    const x = e.clientX - rect.left
    draggingRef.current = true
    const apply = (px: number) => {
      const t = u.posToVal(px, 'x')
      const clamped = Math.min(Math.max(t, 0), duration || 60)
      throttleRef.current.fire(() => setCursorTime(clamped))
    }
    apply(x)
    const onMove = (ev: PointerEvent) => {
      const xx = ev.clientX - rect.left
      apply(xx)
    }
    const onUp = () => {
      draggingRef.current = false
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // 键盘微调
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    el.tabIndex = 0
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        setCursorTime(Math.max(0, cursorTime - (e.shiftKey ? 1 : 0.05)))
      } else if (e.key === 'ArrowRight') {
        setCursorTime(Math.min(duration || 60, cursorTime + (e.shiftKey ? 1 : 0.05)))
      }
    }
    el.addEventListener('keydown', onKey)
    return () => el.removeEventListener('keydown', onKey)
  }, [cursorTime, duration, setCursorTime])

  return (
    <div style={{ position: 'relative' }}>
      {loading && <Spin size="small" style={{ position: 'absolute', right: 8, top: 4, zIndex: 10 }} />}
      <div
        ref={wrapperRef}
        style={{ position: 'relative', width: '100%', height }}
        onPointerDown={onPointerDown}
      >
        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        {/* 游标线 */}
        <div style={{
          position: 'absolute', left: cursorX - 1, top: 0, bottom: 0,
          width: 2, background: '#ff4d4f', pointerEvents: 'none',
        }} />
        {/* 游标时间数值（A1） */}
        <div style={{
          position: 'absolute', left: cursorX + 4, top: 0,
          background: 'rgba(0,0,0,0.6)', color: '#fff',
          fontSize: 11, padding: '1px 4px', borderRadius: 2,
          pointerEvents: 'none', whiteSpace: 'nowrap',
        }}>
          t = {cursorTime.toFixed(3)} s
        </div>
        {/* hover tooltip */}
        {hoverTime != null && (
          <div style={{
            position: 'absolute', right: 4, top: 0,
            background: 'rgba(0,0,0,0.5)', color: '#fff',
            fontSize: 11, padding: '1px 4px', borderRadius: 2,
            pointerEvents: 'none',
          }}>
            hover: {hoverTime.toFixed(3)} s
          </div>
        )}
      </div>
    </div>
  )
}