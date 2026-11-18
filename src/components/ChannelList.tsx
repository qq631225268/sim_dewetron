import { Button, Checkbox, List, Space } from 'antd'
import { useAppStore } from '../store/useAppStore'

export function ChannelList() {
  const channels = useAppStore((s) => s.channels)
  const selected = useAppStore((s) => s.selectedChannelIds)
  const toggle = useAppStore((s) => s.toggleChannel)
  const selectAll = useAppStore((s) => s.selectAll)
  const selectNone = useAppStore((s) => s.selectNone)
  const invert = useAppStore((s) => s.invertSelection)

  return (
    <div style={{ padding: 8, height: '100%', overflow: 'auto' }}>
      <Space style={{ marginBottom: 8 }}>
        <Button size="small" onClick={selectAll}>全选</Button>
        <Button size="small" onClick={selectNone}>全不选</Button>
        <Button size="small" onClick={invert}>反选</Button>
      </Space>
      <List
        size="small"
        dataSource={channels}
        renderItem={(ch) => (
          <List.Item style={{ padding: '2px 4px' }}>
            <Checkbox
              checked={selected.includes(ch.id)}
              onChange={() => toggle(ch.id)}
            >
              {ch.name}
            </Checkbox>
          </List.Item>
        )}
      />
    </div>
  )
}