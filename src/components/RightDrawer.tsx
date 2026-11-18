import {
  Button, Drawer, InputNumber, Select, Space, Switch, Typography, Upload,
  Divider, message,
} from 'antd'
import { DownloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useRef } from 'react'
import { useAppStore } from '../store/useAppStore'

export function RightDrawer() {
  const {
    rightOpen, set, channels, timeDomainChannelId,
    fftSize, windowType, amplitudeScale, dbRef, filter,
    gridRows, gridCols,
    yAxisRanges, xAxisRange, annotations,
  } = useAppStore()

  const importRef = useRef<HTMLInputElement>(null)

  const exportTemplate = () => {
    const tpl = {
      version: 1,
      yAxisRanges, xAxisRange,
      fftSize, windowType, amplitudeScale, dbRef, filter,
      gridRows, gridCols, annotations,
    }
    const blob = new Blob([JSON.stringify(tpl, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'template.json'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importTemplate = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const tpl = JSON.parse(String(reader.result))
        set('yAxisRanges', tpl.yAxisRanges || {})
        set('xAxisRange', tpl.xAxisRange || { min: 0, max: 10000 })
        set('fftSize', tpl.fftSize ?? 2048)
        set('windowType', tpl.windowType ?? 'hann')
        set('amplitudeScale', tpl.amplitudeScale ?? 'db')
        set('dbRef', tpl.dbRef ?? 'dbfs')
        set('filter', tpl.filter ?? null)
        set('gridRows', tpl.gridRows ?? 4)
        set('gridCols', tpl.gridCols ?? 5)
        set('annotations', tpl.annotations || {})
        message.success('模板已应用')
      } catch {
        message.error('模板文件解析失败')
      }
    }
    reader.readAsText(f)
  }

  return (
    <Drawer
      title="设置"
      placement="right"
      open={rightOpen}
      onClose={() => set('rightOpen', false)}
      width={320}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* FFT */}
        <div>
          <Typography.Text strong>FFT 设置</Typography.Text>
          <Space style={{ marginTop: 4 }}>
            <span>窗长</span>
            <Select size="small" value={fftSize} style={{ width: 100 }}
              onChange={(v) => set('fftSize', v)}
              options={[512, 1024, 2048, 4096, 8192].map((n) => ({ value: n, label: String(n) }))} />
            <span>窗函数</span>
            <Select size="small" value={windowType} style={{ width: 100 }}
              onChange={(v) => set('windowType', v)}
              options={[
                { value: 'hann', label: 'Hann' },
                { value: 'hamming', label: 'Hamming' },
                { value: 'blackman', label: 'Blackman' },
                { value: 'rect', label: 'Rect' },
              ]} />
          </Space>
          <Space style={{ marginTop: 4 }}>
            <span>单位</span>
            <Select size="small" value={amplitudeScale} style={{ width: 100 }}
              onChange={(v) => set('amplitudeScale', v)}
              options={[{ value: 'db', label: 'dB' }, { value: 'linear', label: '线性' }]} />
            <span>dB 参考</span>
            <Select size="small" value={dbRef} style={{ width: 100 }}
              onChange={(v) => set('dbRef', v)}
              disabled={amplitudeScale !== 'db'}
              options={[{ value: 'dbfs', label: 'dBFS' }, { value: 're1', label: 'dB re 1' }]} />
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 滤波器 */}
        <div>
          <Typography.Text strong>滤波器</Typography.Text>
          <Space style={{ marginTop: 4 }}>
            <span>类型</span>
            <Select size="small" style={{ width: 110 }}
              value={filter?.type || 'none'}
              onChange={(v) => {
                if (v === 'none') set('filter', null)
                else set('filter', { type: v, fc1: 100, fc2: 2000, order: 4, zeroPhase: true } as any)
              }}
              options={[
                { value: 'none', label: '无' },
                { value: 'lowpass', label: '低通' },
                { value: 'highpass', label: '高通' },
                { value: 'bandpass', label: '带通' },
                { value: 'bandstop', label: '带阻' },
              ]} />
          </Space>
          {filter && (
            <>
              <Space style={{ marginTop: 4 }}>
                <span>fc1</span>
                <InputNumber size="small" value={filter.fc1}
                  onChange={(v) => v != null && set('filter', { ...filter, fc1: v })} />
                <span>fc2</span>
                <InputNumber size="small" value={filter.fc2}
                  onChange={(v) => v != null && set('filter', { ...filter, fc2: v })} />
              </Space>
              <Space style={{ marginTop: 4 }}>
                <span>阶数</span>
                <InputNumber size="small" value={filter.order}
                  onChange={(v) => v != null && set('filter', { ...filter, order: v })} />
                <span>零相位</span>
                <Switch size="small" checked={filter.zeroPhase}
                  onChange={(v) => set('filter', { ...filter, zeroPhase: v })} />
              </Space>
            </>
          )}
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* m×n */}
        <div>
          <Typography.Text strong>网格行列</Typography.Text>
          <Space style={{ marginTop: 4 }}>
            <span>行</span>
            <InputNumber size="small" min={1} max={10} value={gridRows}
              onChange={(v) => v != null && set('gridRows', v)} />
            <span>列</span>
            <InputNumber size="small" min={1} max={10} value={gridCols}
              onChange={(v) => v != null && set('gridCols', v)} />
          </Space>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 时域通道 */}
        <div>
          <Typography.Text strong>时域通道</Typography.Text>
          <Select
            size="small" style={{ width: '100%', marginTop: 4 }}
            value={timeDomainChannelId ?? undefined}
            onChange={(v) => set('timeDomainChannelId', v)}
            options={channels.map((c) => ({ value: c.id, label: c.name }))}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* 模板 */}
        <div>
          <Typography.Text strong>模板</Typography.Text>
          <Space style={{ marginTop: 4 }}>
            <Button size="small" icon={<DownloadOutlined />} onClick={exportTemplate}>
              导出
            </Button>
            <Button size="small" icon={<UploadOutlined />} onClick={() => importRef.current?.click()}>
              导入
            </Button>
            <input ref={importRef} type="file" accept=".json" style={{ display: 'none' }}
              onChange={importTemplate} />
          </Space>
        </div>
      </Space>
    </Drawer>
  )
}