import { Button, Select, Space, Typography, message } from 'antd'
import { UploadOutlined } from '@ant-design/icons'
import { useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'
import { uploadFile } from '../api/client'

const EMPTY = '__EMPTY__'

export function FileBar() {
  const uploadedFiles = useAppStore((s) => s.uploadedFiles)
  const currentFileId = useAppStore((s) => s.currentFileId)
  const currentFileName = useAppStore((s) => s.currentFileName)
  const addUploadedFile = useAppStore((s) => s.addUploadedFile)
  const setActiveFile = useAppStore((s) => s.setActiveFile)

  const [selectValue, setSelectValue] = useState<string>(EMPTY)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const options = [
    { label: '（空）', value: EMPTY },
    ...uploadedFiles.map((f) => ({ label: f.fileName, value: f.fileId })),
  ]

  const onClickUpload = () => {
    if (selectValue === EMPTY) {
      fileInputRef.current?.click()
      return
    }
    // 已选文件
    const f = uploadedFiles.find((x) => x.fileId === selectValue)
    if (!f) return
    if (f.fileId === currentFileId) {
      message.info('当前已是活跃文件')
      return
    }
    setActiveFile(f)
  }

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const info = await uploadFile(file)
      addUploadedFile(info)
      setSelectValue(info.fileId)
      await setActiveFile(info)
      message.success(`已上传：${info.fileName}`)
    } catch (err: any) {
      message.error(err.message || '上传失败')
    }
  }

  return (
    <Space>
      <Select
        style={{ width: 260 }}
        value={selectValue}
        onChange={setSelectValue}
        options={options}
      />
      <Typography.Text type="secondary">
        当前文件：{currentFileName || '（无）'}
      </Typography.Text>
      <Button icon={<UploadOutlined />} onClick={onClickUpload}>
        上传 / 设为活跃
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={onFileChosen}
      />
    </Space>
  )
}