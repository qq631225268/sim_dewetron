import { Button } from 'antd'
import { MenuUnfoldOutlined, SettingOutlined } from '@ant-design/icons'
import { useAppStore } from '../store/useAppStore'

export function LeftCollapsedHandle() {
  const collapsed = useAppStore((s) => s.leftCollapsed)
  const set = useAppStore((s) => s.set)
  if (!collapsed) return null
  return (
    <Button
      shape="circle"
      icon={<MenuUnfoldOutlined />}
      style={{ position: 'fixed', left: 8, top: '50%', zIndex: 100 }}
      onClick={() => set('leftCollapsed', false)}
    />
  )
}

export function RightCollapsedHandle() {
  const open = useAppStore((s) => s.rightOpen)
  const set = useAppStore((s) => s.set)
  if (open) return null
  return (
    <Button
      shape="circle"
      icon={<SettingOutlined />}
      style={{ position: 'fixed', right: 8, top: '50%', zIndex: 100 }}
      onClick={() => set('rightOpen', true)}
    />
  )
}