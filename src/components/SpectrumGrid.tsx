import { useAppStore } from '../store/useAppStore'
import { SpectrumTile } from './SpectrumTile'

export function SpectrumGrid() {
  const selected = useAppStore((s) => s.selectedChannelIds)
  const rows = useAppStore((s) => s.gridRows)
  const cols = useAppStore((s) => s.gridCols)

  const total = rows * cols
  const shown = selected.slice(0, total)

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gridTemplateRows: `repeat(${rows}, 1fr)`,
      gap: 8, padding: 8, height: '100%', overflow: 'auto',
    }}>
      {shown.map((id, idx) => {
        const row = Math.floor(idx / cols)
        const col = idx % cols
        const isFirstCol = col === 0
        const isLastRow = row === Math.ceil(shown.length / cols) - 1
        return (
          <div key={id} style={{ background: '#1f1f1f', minHeight: 120, position: 'relative' }}>
            <SpectrumTile channelId={id} isFirstCol={isFirstCol} isLastRow={isLastRow} />
          </div>
        )
      })}
    </div>
  )
}