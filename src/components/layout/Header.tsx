import React, { useState, useEffect } from 'react'
import {
  Search,
  Moon,
  Sun,
  Plus,
  Download,
  Import,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/Toast'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { fetchUrl } from '@/utils/http'
import { parseSourceContent, parseLocalNovel } from '@/utils/parser'
import { isNovelFile, isVideoFile, isPlaylistFile, formatFileSize } from '@/utils'
import { SegmentedControl } from '@/components/ui/SegmentedControl'

export const Header: React.FC = () => {
  const { isDarkMode, setDarkMode, addSource, addBook, addVideo, addLiveChannel, addLocalFile, currentView, setCurrentView } = useAppStore()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importType, setImportType] = useState<'url' | 'file'>('url')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)

  useEffect(() => {
    const handleMenuImportFile = () => {
      setImportType('file')
      setImportModalOpen(true)
    }
    const handleMenuImportSource = () => {
      setImportType('url')
      setImportModalOpen(true)
    }

    if (window.electronAPI) {
      window.electronAPI.on('menu:import-file', handleMenuImportFile)
      window.electronAPI.on('menu:import-source', handleMenuImportSource)
    }

    return () => {
      if (window.electronAPI) {
        window.electronAPI.removeListener('menu:import-file', handleMenuImportFile)
        window.electronAPI.removeListener('menu:import-source', handleMenuImportSource)
      }
    }
  }, [])

  const toggleTheme = () => {
    setDarkMode(!isDarkMode)
    if (window.electronAPI) {
      window.electronAPI.setTheme(!isDarkMode ? 'dark' : 'light')
    }
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      showToast('请输入数据源URL', 'warning')
      return
    }

    setImporting(true)
    try {
      const content = await fetchUrl(importUrl)
      const result = await parseSourceContent(importUrl, content)

      if (result.sources.length > 0) {
        result.sources.forEach((source) => addSource(source))
        showToast(`成功导入 ${result.sources.length} 个数据源`, 'success')
      }

      if (result.liveChannels.length > 0) {
        result.liveChannels.forEach((channel) => addLiveChannel(channel))
        showToast(`成功导入 ${result.liveChannels.length} 个直播频道`, 'success')
      }

      if (result.sources.length === 0 && result.liveChannels.length === 0) {
        showToast('未识别到有效数据', 'warning')
      } else {
        setImportModalOpen(false)
        setImportUrl('')
      }
    } catch (error) {
      showToast(`导入失败: ${(error as Error).message}`, 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleImportFromFile = async () => {
    if (!window.electronAPI) {
      showToast('请在Electron环境中使用', 'warning')
      return
    }

    const result = await window.electronAPI.openFile({
      title: '选择文件',
      filters: [
        { name: '所有支持的文件', extensions: ['json', 'm3u', 'm3u8', 'txt', 'xml', 'mp4', 'mkv', 'avi', 'mov', 'epub', 'pdf'] },
        { name: '数据源', extensions: ['json', 'm3u', 'm3u8', 'txt', 'xml'] },
        { name: '视频文件', extensions: ['mp4', 'mkv', 'avi', 'mov', 'webm'] },
        { name: '小说文件', extensions: ['txt', 'epub', 'pdf'] },
      ],
      properties: ['openFile', 'multiSelections'],
    })

    if (result.canceled) return

    setImporting(true)
    let successCount = 0

    try {
      for (const filePath of result.filePaths) {
        const fileName = filePath.split(/[/\\]/).pop() || ''
        const fileResult = await window.electronAPI.readFile(filePath)

        if (!fileResult.success || !fileResult.content) {
          continue
        }

        if (isNovelFile(fileName)) {
          const parsed = parseLocalNovel(fileName, fileResult.content)
          addBook({
            name: parsed.name,
            author: parsed.author,
            cover: '',
            intro: `本地小说: ${fileName}`,
            sourceId: 'local',
            bookUrl: filePath,
            chapters: parsed.chapters,
          })
          addLocalFile({
            name: fileName,
            path: filePath,
            type: 'novel',
            size: fileResult.content.length,
          })
          successCount++
        } else if (isVideoFile(fileName)) {
          addVideo({
            name: fileName.replace(/\.[^/.]+$/, ''),
            cover: '',
            intro: `本地视频: ${fileName}`,
            sourceId: 'local',
            videoUrl: filePath,
            playList: [{ name: '默认', urls: [{ name: '播放', url: filePath }] }],
          })
          addLocalFile({
            name: fileName,
            path: filePath,
            type: 'video',
            size: fileResult.content.length,
          })
          successCount++
        } else if (isPlaylistFile(fileName)) {
          const parseResult = await parseSourceContent(filePath, fileResult.content)
          parseResult.sources.forEach((s) => addSource(s))
          parseResult.liveChannels.forEach((c) => addLiveChannel(c))
          successCount += parseResult.sources.length + parseResult.liveChannels.length
        }
      }

      if (successCount > 0) {
        showToast(`成功导入 ${successCount} 个文件`, 'success')
        setImportModalOpen(false)
      } else {
        showToast('未识别到有效文件', 'warning')
      }
    } catch (error) {
      showToast(`导入失败: ${(error as Error).message}`, 'error')
    } finally {
      setImporting(false)
    }
  }

  const viewTitles: Record<string, string> = {
    home: '首页',
    books: '小说阅读',
    videos: '视频播放',
    live: '电视直播',
    sources: '数据源管理',
    settings: '设置',
  }

  return (
    <>
      <header className="h-14 flex items-center gap-4 px-6 bg-white dark:bg-[#1C1C1E] border-b border-ios-gray5 dark:border-[#38383A] title-bar-drag">
        <div className="flex items-center gap-1 title-bar-no-drag">
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            icon={<ChevronLeft size={18} />}
          />
          <Button
            variant="ghost"
            size="sm"
            className="w-8 h-8 p-0"
            icon={<ChevronRight size={18} />}
          />
        </div>

        <h2 className="text-lg font-semibold text-black dark:text-white">
          {viewTitles[currentView] || 'ReaderHub'}
        </h2>

        <div className="flex-1 max-w-xl mx-auto title-bar-no-drag">
          <Input
            placeholder="搜索书籍、视频、直播..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search size={18} />}
          />
        </div>

        <div className="flex items-center gap-2 title-bar-no-drag">
          <Button
            variant="secondary"
            size="sm"
            icon={<Plus size={18} />}
            onClick={() => setImportModalOpen(true)}
          >
            导入
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-9 h-9 p-0"
            icon={isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            onClick={toggleTheme}
          />
        </div>
      </header>

      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="导入资源"
        size="lg"
      >
        <div className="space-y-4">
          <SegmentedControl
            value={importType}
            onChange={setImportType}
            options={[
              { value: 'url', label: '网络接口', icon: <Download size={16} /> },
              { value: 'file', label: '本地文件', icon: <Import size={16} /> },
            ]}
          />

          {importType === 'url' && (
            <div className="space-y-3">
              <Input
                label="数据源URL"
                placeholder="https://example.com/source.json"
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
              <div className="text-sm text-ios-gray space-y-1">
                <p>支持的格式：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>CatVod / TVBox 视频源 (JSON)</li>
                  <li>阅读APP 书源 (JSON)</li>
                  <li>IPTV 直播源 (M3U, TXT, JSON)</li>
                </ul>
              </div>
              <Button fullWidth onClick={handleImportFromUrl} disabled={importing}>
                {importing ? '导入中...' : '开始导入'}
              </Button>
            </div>
          )}

          {importType === 'file' && (
            <div className="space-y-4">
              <div className="text-sm text-ios-gray space-y-1">
                <p>支持导入的文件类型：</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>小说: .txt, .epub, .pdf</li>
                  <li>视频: .mp4, .mkv, .avi, .mov</li>
                  <li>数据源: .json, .m3u, .m3u8, .txt</li>
                </ul>
              </div>
              <Button fullWidth onClick={handleImportFromFile} disabled={importing}>
                {importing ? '导入中...' : '选择文件'}
              </Button>
            </div>
          )}

          <div className="mt-4 p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
            <h4 className="font-medium text-black dark:text-white mb-2">示例数据源</h4>
            <div className="space-y-2 text-sm">
              <button
                onClick={() => setImportUrl('https://gh-proxy.org/https://raw.githubusercontent.com/ggrrttyyiii/CatVodSpider/refs/heads/main/json/demo.json')}
                className="block w-full text-left text-ios-blue hover:text-ios-blue/80 truncate"
              >
                • CatVod 演示源
              </button>
              <button
                onClick={() => setImportUrl('https://bitbucket.org/xiu2/yuedu/raw/master/shuyuan')}
                className="block w-full text-left text-ios-blue hover:text-ios-blue/80 truncate"
              >
                • 阅读APP 全部书源
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </>
  )
}
