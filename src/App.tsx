import { Layout } from 'antd'
import { FileBar } from './components/FileBar'
import { TimeDomain } from './components/TimeDomain'
import { ChannelList } from './components/ChannelList'
import { SpectrumGrid } from './components/SpectrumGrid'
import { RightDrawer } from './components/RightDrawer'
import { LeftCollapsedHandle, RightCollapsedHandle } from './components/CollapsedHandle'
import { useAppStore } from './store/useAppStore'

const { Header, Sider, Content } = Layout

export default function App() {
  const leftCollapsed = useAppStore((s) => s.leftCollapsed)
  const set = useAppStore((s) => s.set)

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ background: '#fff', padding: '0 16px', display: 'flex', alignItems: 'center' }}>
        <FileBar />
      </Header>
      <Layout>
        <Sider
          width={220}
          collapsed={leftCollapsed}
          collapsedWidth={0}
          theme="light"
          style={{ borderRight: '1px solid #eee' }}
        >
          <div style={{ height: '100%', overflow: 'auto' }}>
            <ChannelList />
          </div>
        </Sider>
        <Content style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee' }}>
            <TimeDomain />
          </div>
          <div style={{ flex: 1, minHeight: 0, background: '#0e0e0e', overflow: 'hidden' }}>
            <SpectrumGrid />
          </div>
        </Content>
      </Layout>
      <RightDrawer />
      <LeftCollapsedHandle />
      <RightCollapsedHandle />
      {/* 折叠按钮放在左侧边缘 */}
      {!leftCollapsed && (
        <button
          onClick={() => set('leftCollapsed', true)}
          style={{
            position: 'fixed', left: 220, top: '50%', zIndex: 100,
            border: 'none', background: '#eee', cursor: 'pointer',
            padding: 4, borderRadius: 4,
          }}
        >◀</button>
      )}
    </Layout>
  )
}


