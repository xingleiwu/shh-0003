import React, { useState, useEffect } from 'react'
import {
  Settings,
  Palette,
  BookOpen,
  PlaySquare,
  Wifi,
  Database,
  Trash2,
  Download,
  Upload,
  Moon,
  Sun,
  Monitor,
  Type,
  AlignLeft,
  AlignCenter,
  Maximize2,
  Volume2,
  FastForward,
  SkipForward,
  RefreshCw,
  FileJson,
  Minimize2,
  Zap,
  Clock,
  Image,
  Globe,
  HardDrive,
  Save,
  AlertTriangle,
  ChevronRight,
  Languages,
  Eye,
  MousePointerClick,
  Keyboard,
  Subtitles,
  Gauge,
  Shield,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { List, ListItem } from '@/components/ui/List'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { formatFileSize } from '@/utils'

type TabType = 'appearance' | 'reader' | 'player' | 'network' | 'data'

export const SettingsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    updateReaderSettings,
    updatePlayerSettings,
    updateNetworkSettings,
    clearHistory,
    sources,
    books,
    videos,
    liveChannels,
    localFiles,
    history,
    readProgress,
  } = useAppStore()
  const { showToast } = useToast()
  const [tab, setTab] = useState<TabType>('appearance')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)
  const [clearCacheOpen, setClearCacheOpen] = useState(false)
  const [cacheSize, setCacheSize] = useState('计算中...')
  const [isClearingCache, setIsClearingCache] = useState(false)

  const tabItems = [
    { id: 'appearance', label: '外观', icon: <Palette size={18} /> },
    { id: 'reader', label: '阅读设置', icon: <BookOpen size={18} /> },
    { id: 'player', label: '播放设置', icon: <PlaySquare size={18} /> },
    { id: 'network', label: '网络设置', icon: <Wifi size={18} /> },
    { id: 'data', label: '数据管理', icon: <Database size={18} /> },
  ]

  useEffect(() => {
    calculateCacheSize()
  }, [])

  const calculateCacheSize = () => {
    try {
      const storage = localStorage.getItem('reader-hub-storage')
      const size = storage ? new Blob([storage]).size : 0
      const booksSize = books.length * 2048
      const videosSize = videos.length * 1024
      const liveSize = liveChannels.length * 512
      const total = size + booksSize + videosSize + liveSize
      setCacheSize(formatFileSize(total))
    } catch (error) {
      setCacheSize('未知')
    }
  }

  const handleExportData = async () => {
    if (!window.electronAPI) {
      const data = {
        sources,
        books,
        videos,
        liveChannels,
        localFiles,
        settings,
        readProgress,
        history,
        exportedAt: new Date().toISOString(),
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `readerhub-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      showToast('数据导出成功', 'success')
      return
    }

    const data = {
      sources,
      books,
      videos,
      liveChannels,
      localFiles,
      settings,
      readProgress,
      history,
      exportedAt: new Date().toISOString(),
    }

    const result = await window.electronAPI.saveFile({
      title: '导出数据',
      defaultPath: `readerhub-backup-${Date.now()}.json`,
      filters: [{ name: 'JSON文件', extensions: ['json'] }],
    })

    if (!result.canceled && result.filePath) {
      await window.electronAPI.writeFile(result.filePath, JSON.stringify(data, null, 2))
      showToast('数据导出成功', 'success')
    }
  }

  const handleImportData = async () => {
    if (!window.electronAPI) {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = '.json'
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0]
        if (!file) return
        try {
          const content = await file.text()
          const data = JSON.parse(content)
          if (data.sources) useAppStore.getState().importSources(data.sources)
          if (data.settings) updateSettings(data.settings)
          if (data.books) {
            data.books.forEach((book: any) => {
              useAppStore.getState().addBook(book)
            })
          }
          if (data.videos) {
            data.videos.forEach((video: any) => {
              useAppStore.getState().addVideo(video)
            })
          }
          if (data.liveChannels) {
            data.liveChannels.forEach((channel: any) => {
              useAppStore.getState().addLiveChannel(channel)
            })
          }
          showToast('数据导入成功', 'success')
        } catch (error) {
          showToast('导入失败：文件格式错误', 'error')
        }
      }
      input.click()
      return
    }

    const result = await window.electronAPI.openFile({
      title: '导入数据',
      filters: [{ name: 'JSON文件', extensions: ['json'] }],
      properties: ['openFile'],
    })

    if (!result.canceled && result.filePaths[0]) {
      const fileResult = await window.electronAPI.readFile(result.filePaths[0])
      if (fileResult.success && fileResult.content) {
        try {
          const data = JSON.parse(fileResult.content)
          if (data.sources) useAppStore.getState().importSources(data.sources)
          if (data.settings) updateSettings(data.settings)
          if (data.books) {
            data.books.forEach((book: any) => {
              useAppStore.getState().addBook(book)
            })
          }
          if (data.videos) {
            data.videos.forEach((video: any) => {
              useAppStore.getState().addVideo(video)
            })
          }
          if (data.liveChannels) {
            data.liveChannels.forEach((channel: any) => {
              useAppStore.getState().addLiveChannel(channel)
            })
          }
          showToast('数据导入成功', 'success')
        } catch (error) {
          showToast('导入失败：文件格式错误', 'error')
        }
      }
    }
  }

  const handleClearAllData = () => {
    localStorage.removeItem('reader-hub-storage')
    window.location.reload()
  }

  const handleClearCache = () => {
    setIsClearingCache(true)
    setTimeout(() => {
      calculateCacheSize()
      setIsClearingCache(false)
      setClearCacheOpen(false)
      showToast('缓存已清除', 'success')
    }, 1000)
  }

  const dataStats = [
    { label: '数据源', value: sources.length, icon: <Database size={16} /> },
    { label: '小说', value: books.length, icon: <BookOpen size={16} /> },
    { label: '视频', value: videos.length, icon: <PlaySquare size={16} /> },
    { label: '直播频道', value: liveChannels.length, icon: <Globe size={16} /> },
    { label: '历史记录', value: history.length, icon: <Clock size={16} /> },
  ]

  const bgColors = [
    { value: '#F8F4E6', label: '护眼米黄' },
    { value: '#FFFFFF', label: '纯白' },
    { value: '#F5F5F5', label: '浅灰' },
    { value: '#FFF8DC', label: '羊皮纸' },
    { value: '#E8F5E9', label: '淡绿' },
    { value: '#1A1A1A', label: '暗黑' },
  ]

  const fontFamilies = [
    { value: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif', label: '系统默认' },
    { value: '"PingFang SC", "Microsoft YaHei", sans-serif', label: '苹方/微软雅黑' },
    { value: '"Source Han Serif SC", "Noto Serif SC", serif', label: '思源宋体' },
    { value: '"KaiTi", "STKaiti", serif', label: '楷体' },
    { value: '"SimSun", "STSong", serif', label: '宋体' },
  ]

  const windowSizes = [
    { value: '1024x768', label: '小 (1024×768)' },
    { value: '1280x800', label: '标准 (1280×800)' },
    { value: '1440x900', label: '大 (1440×900)' },
    { value: '1920x1080', label: '全高清 (1920×1080)' },
    { value: 'maximized', label: '最大化' },
  ]

  const playSpeeds = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  const textColors = [
    { value: '#333333', label: '默认黑' },
    { value: '#1A1A1A', label: '纯黑' },
    { value: '#5D4037', label: '棕褐' },
    { value: '#2E7D32', label: '墨绿' },
    { value: '#1565C0', label: '深蓝' },
    { value: '#FFFFFF', label: '白色(暗黑)' },
  ]

  return (
    <div className="p-6 animate-fadeIn">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-16 h-16 rounded-ios-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Settings size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">设置</h1>
          <p className="text-ios-gray mt-1">自定义你的阅读体验</p>
        </div>
      </div>

      <div className="flex gap-6">
        <div className="w-48 flex-shrink-0">
          <div className="space-y-1">
            {tabItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id as TabType)}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-left transition-all',
                  tab === item.id
                    ? 'bg-ios-blue text-white'
                    : 'hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-black/70 dark:text-white/70'
                ].join(' ')}
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
            <h4 className="font-medium text-black dark:text-white mb-3">数据统计</h4>
            <div className="space-y-2">
              {dataStats.map((stat) => (
                <div key={stat.label} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ios-gray">
                    {stat.icon}
                    {stat.label}
                  </span>
                  <span className="font-medium text-black dark:text-white">{stat.value}</span>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-ios-gray5 dark:border-[#38383A] flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-ios-gray">
                  <HardDrive size={16} />
                  缓存大小
                </span>
                <span className="font-medium text-black dark:text-white">{cacheSize}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl space-y-6 max-h-[calc(100vh-220px)] overflow-y-auto scrollbar-ios pr-2">
          {tab === 'appearance' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Monitor size={20} className="text-ios-blue" />
                    主题模式
                  </h3>
                  <SegmentedControl
                    value={settings.theme}
                    onChange={(v) => updateSettings({ theme: v as any })}
                    options={[
                      { value: 'light', label: '浅色', icon: <Sun size={16} /> },
                      { value: 'dark', label: '深色', icon: <Moon size={16} /> },
                      { value: 'system', label: '跟随系统', icon: <Monitor size={16} /> },
                    ]}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Maximize2 size={20} className="text-ios-blue" />
                    窗口设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">窗口大小</label>
                      <select
                        value={settings.appearance?.windowSize || '1280x800'}
                        onChange={(e) => updateSettings({
                          appearance: { ...settings.appearance, windowSize: e.target.value }
                        })}
                        className="ios-input w-full"
                      >
                        {windowSizes.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <ListItem
                      icon={<Minimize2 size={18} />}
                      label="最小化到托盘"
                      subtitle="关闭窗口时不退出程序，最小化到系统托盘"
                      action={
                        <Switch
                          checked={settings.appearance?.minimizeToTray ?? true}
                          onChange={(checked) => updateSettings({
                            appearance: { ...settings.appearance, minimizeToTray: checked }
                          })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Zap size={18} />}
                      label="开机自动启动"
                      subtitle="登录系统时自动启动应用"
                      action={
                        <Switch
                          checked={settings.appearance?.autoLaunch ?? false}
                          onChange={(checked) => updateSettings({
                            appearance: { ...settings.appearance, autoLaunch: checked }
                          })}
                        />
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Eye size={20} className="text-ios-blue" />
                    显示设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">
                        界面缩放: {settings.appearance?.zoom ?? 100}%
                      </label>
                      <input
                        type="range"
                        min="75"
                        max="150"
                        step="5"
                        value={settings.appearance?.zoom ?? 100}
                        onChange={(e) => updateSettings({
                          appearance: { ...settings.appearance, zoom: parseInt(e.target.value) }
                        })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>75%</span>
                        <span>100%</span>
                        <span>150%</span>
                      </div>
                    </div>
                    <ListItem
                      icon={<Languages size={18} />}
                      label="动画效果"
                      subtitle="启用页面切换和交互动画"
                      action={
                        <Switch
                          checked={settings.appearance?.animations ?? true}
                          onChange={(checked) => updateSettings({
                            appearance: { ...settings.appearance, animations: checked }
                          })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Save size={18} />}
                      label="记住窗口位置"
                      subtitle="下次启动时恢复窗口位置和大小"
                      action={
                        <Switch
                          checked={settings.appearance?.rememberWindow ?? true}
                          onChange={(checked) => updateSettings({
                            appearance: { ...settings.appearance, rememberWindow: checked }
                          })}
                        />
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4">关于</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-ios-gray">应用名称</span>
                      <span className="font-medium">ReaderHub</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ios-gray">版本</span>
                      <span className="font-medium">1.0.0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ios-gray">技术栈</span>
                      <span className="font-medium">Electron + React + TypeScript</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ios-gray">构建时间</span>
                      <span className="font-medium">{new Date().toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'reader' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Type size={20} className="text-ios-blue" />
                    字体设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">字体</label>
                      <select
                        value={settings.reader.fontFamily}
                        onChange={(e) => updateReaderSettings({ fontFamily: e.target.value })}
                        className="ios-input w-full"
                      >
                        {fontFamilies.map((f) => (
                          <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        字号: {settings.reader.fontSize}px
                      </label>
                      <input
                        type="range"
                        min="12"
                        max="32"
                        value={settings.reader.fontSize}
                        onChange={(e) => updateReaderSettings({ fontSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>12px</span>
                        <span>22px</span>
                        <span>32px</span>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        行高: {settings.reader.lineHeight}
                      </label>
                      <input
                        type="range"
                        min="1.2"
                        max="3"
                        step="0.1"
                        value={settings.reader.lineHeight}
                        onChange={(e) => updateReaderSettings({ lineHeight: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>紧凑</span>
                        <span>适中</span>
                        <span>宽松</span>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        段间距: {settings.reader.paragraphSpacing ?? 16}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="48"
                        step="4"
                        value={settings.reader.paragraphSpacing ?? 16}
                        onChange={(e) => updateReaderSettings({ paragraphSpacing: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        字间距: {settings.reader.letterSpacing ?? 0.5}px
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="4"
                        step="0.5"
                        value={settings.reader.letterSpacing ?? 0.5}
                        onChange={(e) => updateReaderSettings({ letterSpacing: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Palette size={20} className="text-ios-blue" />
                    颜色设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">阅读背景</label>
                      <div className="grid grid-cols-6 gap-3">
                        {bgColors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => updateReaderSettings({ backgroundColor: color.value })}
                            className={[
                              'aspect-square rounded-ios border-2 transition-all',
                              settings.reader.backgroundColor === color.value
                                ? 'border-ios-blue ring-2 ring-ios-blue/30'
                                : 'border-transparent hover:border-ios-gray3'
                            ].join(' ')}
                            style={{ backgroundColor: color.value }}
                            title={color.label}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-ios-gray mt-3">
                        当前: {bgColors.find(c => c.value === settings.reader.backgroundColor)?.label}
                      </p>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">文字颜色</label>
                      <div className="grid grid-cols-6 gap-3">
                        {textColors.map((color) => (
                          <button
                            key={color.value}
                            onClick={() => updateReaderSettings({ textColor: color.value })}
                            className={[
                              'aspect-square rounded-ios border-2 transition-all flex items-center justify-center text-sm font-bold',
                              settings.reader.textColor === color.value
                                ? 'border-ios-blue ring-2 ring-ios-blue/30'
                                : 'border-transparent hover:border-ios-gray3'
                            ].join(' ')}
                            style={{ backgroundColor: settings.reader.backgroundColor, color: color.value }}
                            title={color.label}
                          >
                            A
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Maximize2 size={20} className="text-ios-blue" />
                    页面布局
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">
                        页面宽度: {settings.reader.pageWidth}px
                      </label>
                      <input
                        type="range"
                        min="400"
                        max="1200"
                        step="20"
                        value={settings.reader.pageWidth}
                        onChange={(e) => updateReaderSettings({ pageWidth: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">翻页模式</label>
                      <SegmentedControl
                        value={settings.reader.flipMode}
                        onChange={(v) => updateReaderSettings({ flipMode: v as any })}
                        options={[
                          { value: 'page', label: '分页', icon: <AlignCenter size={14} /> },
                          { value: 'scroll', label: '滚动', icon: <AlignLeft size={14} /> },
                          { value: 'continuous', label: '连续', icon: <Maximize2 size={14} /> },
                        ]}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <MousePointerClick size={20} className="text-ios-blue" />
                    交互设置
                  </h3>
                  <div className="space-y-4">
                    <ListItem
                      icon={<MousePointerClick size={18} />}
                      label="点击翻页"
                      subtitle="点击屏幕左右区域翻页"
                      action={
                        <Switch
                          checked={settings.reader?.tapToFlip ?? true}
                          onChange={(checked) => updateReaderSettings({ tapToFlip: checked })}
                        />
                      }
                    />
                    <div>
                      <label className="block mb-2 ios-label">
                        点击区域灵敏度: {settings.reader?.tapSensitivity ?? 30}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="50"
                        value={settings.reader?.tapSensitivity ?? 30}
                        onChange={(e) => updateReaderSettings({ tapSensitivity: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <ListItem
                      icon={<Keyboard size={18} />}
                      label="音量键翻页"
                      subtitle="使用音量加减键翻上下页"
                      action={
                        <Switch
                          checked={settings.reader?.volumeKeyFlip ?? false}
                          onChange={(checked) => updateReaderSettings({ volumeKeyFlip: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Eye size={18} />}
                      label="保持屏幕常亮"
                      subtitle="阅读时防止屏幕休眠"
                      action={
                        <Switch
                          checked={settings.reader?.keepScreenOn ?? true}
                          onChange={(checked) => updateReaderSettings({ keepScreenOn: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Save size={18} />}
                      label="自动保存进度"
                      subtitle="阅读过程中实时保存阅读进度"
                      action={
                        <Switch
                          checked={settings.reader?.autoSaveProgress ?? true}
                          onChange={(checked) => updateReaderSettings({ autoSaveProgress: checked })}
                        />
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'player' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <PlaySquare size={20} className="text-ios-blue" />
                    播放设置
                  </h3>
                  <div className="space-y-4">
                    <ListItem
                      icon={<PlaySquare size={18} />}
                      label="自动播放"
                      subtitle="打开视频时自动开始播放"
                      action={
                        <Switch
                          checked={settings.player.autoPlay}
                          onChange={(checked) => updatePlayerSettings({ autoPlay: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<RefreshCw size={18} />}
                      label="自动下一集"
                      subtitle="当前集播放完毕自动播放下一集"
                      action={
                        <Switch
                          checked={settings.player?.autoNext ?? true}
                          onChange={(checked) => updatePlayerSettings({ autoNext: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<RefreshCw size={18} />}
                      label="硬件解码"
                      subtitle="启用GPU加速解码，播放更流畅"
                      action={
                        <Switch
                          checked={settings.player.enableHardwareDecoding}
                          onChange={(checked) => updatePlayerSettings({ enableHardwareDecoding: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Gauge size={18} />}
                      label="记住播放倍速"
                      subtitle="下次播放时使用上次设置的倍速"
                      action={
                        <Switch
                          checked={settings.player?.rememberSpeed ?? true}
                          onChange={(checked) => updatePlayerSettings({ rememberSpeed: checked })}
                        />
                      }
                    />
                    <div>
                      <label className="block mb-2 ios-label">
                        默认音量: {settings.player.defaultVolume}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={settings.player.defaultVolume}
                        onChange={(e) => updatePlayerSettings({ defaultVolume: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        默认倍速: {settings.player?.defaultSpeed ?? 1}x
                      </label>
                      <SegmentedControl
                        value={String(settings.player?.defaultSpeed ?? 1)}
                        onChange={(v) => updatePlayerSettings({ defaultSpeed: parseFloat(v) })}
                        options={playSpeeds.map((s) => ({ value: String(s), label: `${s}x` }))}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <SkipForward size={20} className="text-ios-blue" />
                    自动跳过
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">
                        跳过片头: {settings.player.skipIntro}秒
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="600"
                        step="5"
                        value={settings.player.skipIntro}
                        onChange={(e) => updatePlayerSettings({ skipIntro: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>0秒</span>
                        <span>5分钟</span>
                        <span>10分钟</span>
                      </div>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        跳过片尾: {settings.player.skipEnding}秒
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="600"
                        step="5"
                        value={settings.player.skipEnding}
                        onChange={(e) => updatePlayerSettings({ skipEnding: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Subtitles size={20} className="text-ios-blue" />
                    字幕设置
                  </h3>
                  <div className="space-y-4">
                    <ListItem
                      icon={<Subtitles size={18} />}
                      label="自动加载字幕"
                      subtitle="自动加载同目录下的字幕文件"
                      action={
                        <Switch
                          checked={settings.player?.autoLoadSubtitle ?? true}
                          onChange={(checked) => updatePlayerSettings({ autoLoadSubtitle: checked })}
                        />
                      }
                    />
                    <div>
                      <label className="block mb-2 ios-label">
                        字幕字号: {settings.player?.subtitleSize ?? 24}px
                      </label>
                      <input
                        type="range"
                        min="16"
                        max="48"
                        step="2"
                        value={settings.player?.subtitleSize ?? 24}
                        onChange={(e) => updatePlayerSettings({ subtitleSize: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <ListItem
                      icon={<Volume2 size={18} />}
                      label="缓冲大小"
                      subtitle="增大可减少卡顿，但占用更多内存"
                      action={
                        <select
                          value={settings.player?.bufferSize ?? 'medium'}
                          onChange={(e) => updatePlayerSettings({ bufferSize: e.target.value as any })}
                          className="ios-input w-32"
                        >
                          <option value="small">小</option>
                          <option value="medium">中</option>
                          <option value="large">大</option>
                        </select>
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'network' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Wifi size={20} className="text-ios-blue" />
                    基础设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">代理服务器（可选）</label>
                      <input
                        type="text"
                        placeholder="http://127.0.0.1:7890"
                        value={settings.network.proxy || ''}
                        onChange={(e) => updateNetworkSettings({ proxy: e.target.value })}
                        className="ios-input w-full"
                      />
                      <p className="text-xs text-ios-gray mt-1">用于访问被屏蔽的网站，留空则不使用</p>
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">User-Agent</label>
                      <input
                        type="text"
                        value={settings.network.userAgent}
                        onChange={(e) => updateNetworkSettings({ userAgent: e.target.value })}
                        className="ios-input w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block mb-2 ios-label">
                          超时时间: {settings.network.timeout / 1000}秒
                        </label>
                        <input
                          type="range"
                          min="5000"
                          max="120000"
                          step="5000"
                          value={settings.network.timeout}
                          onChange={(e) => updateNetworkSettings({ timeout: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="block mb-2 ios-label">
                          重试次数: {settings.network.retryCount}次
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          value={settings.network.retryCount}
                          onChange={(e) => updateNetworkSettings({ retryCount: parseInt(e.target.value) })}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Zap size={20} className="text-ios-blue" />
                    并发设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">
                        最大并发请求数: {settings.network?.maxConcurrency ?? 5}
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="20"
                        value={settings.network?.maxConcurrency ?? 5}
                        onChange={(e) => updateNetworkSettings({ maxConcurrency: parseInt(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>1（保守）</span>
                        <span>5（推荐）</span>
                        <span>20（极速）</span>
                      </div>
                    </div>
                    <ListItem
                      icon={<Shield size={18} />}
                      label="并发搜索多源"
                      subtitle="搜索时同时请求多个数据源，速度更快"
                      action={
                        <Switch
                          checked={settings.network?.parallelSearch ?? true}
                          onChange={(checked) => updateNetworkSettings({ parallelSearch: checked })}
                        />
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Image size={20} className="text-ios-blue" />
                    图片加载
                  </h3>
                  <div className="space-y-4">
                    <ListItem
                      icon={<Image size={18} />}
                      label="自动加载图片"
                      subtitle="关闭后仅在点击时加载封面图，节省流量"
                      action={
                        <Switch
                          checked={settings.network?.autoLoadImages ?? true}
                          onChange={(checked) => updateNetworkSettings({ autoLoadImages: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<HardDrive size={18} />}
                      label="启用图片缓存"
                      subtitle="缓存已加载的图片，减少重复请求"
                      action={
                        <Switch
                          checked={settings.network?.imageCache ?? true}
                          onChange={(checked) => updateNetworkSettings({ imageCache: checked })}
                        />
                      }
                    />
                    <ListItem
                      icon={<Globe size={18} />}
                      label="启用DNS缓存"
                      subtitle="缓存DNS解析结果，加快访问速度"
                      action={
                        <Switch
                          checked={settings.network?.dnsCache ?? true}
                          onChange={(checked) => updateNetworkSettings({ dnsCache: checked })}
                        />
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {tab === 'data' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <FileJson size={20} className="text-ios-blue" />
                    数据备份
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="secondary"
                      icon={<Download size={18} />}
                      onClick={handleExportData}
                    >
                      导出数据
                    </Button>
                    <Button
                      variant="secondary"
                      icon={<Upload size={18} />}
                      onClick={handleImportData}
                    >
                      导入数据
                    </Button>
                  </div>
                  <p className="text-sm text-ios-gray mt-3">
                    导出所有数据源、书籍、视频、直播频道、阅读进度、历史记录和设置信息
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Save size={20} className="text-ios-blue" />
                    自动备份
                  </h3>
                  <div className="space-y-4">
                    <ListItem
                      icon={<Save size={18} />}
                      label="自动备份"
                      subtitle="定期自动备份数据到本地"
                      action={
                        <Switch
                          checked={settings.data?.autoBackup ?? false}
                          onChange={(checked) => updateSettings({
                            data: { ...settings.data, autoBackup: checked }
                          })}
                        />
                      }
                    />
                    {(settings.data?.autoBackup ?? false) && (
                      <div>
                        <label className="block mb-2 ios-label">备份频率</label>
                        <select
                          value={settings.data?.backupInterval ?? 'daily'}
                          onChange={(e) => updateSettings({
                            data: { ...settings.data, backupInterval: e.target.value as any }
                          })}
                          className="ios-input w-full"
                        >
                          <option value="hourly">每小时</option>
                          <option value="daily">每天</option>
                          <option value="weekly">每周</option>
                          <option value="monthly">每月</option>
                        </select>
                      </div>
                    )}
                    <div>
                      <label className="block mb-2 ios-label">
                        历史记录保留: {settings.data?.historyRetention ?? 30}天
                      </label>
                      <input
                        type="range"
                        min="7"
                        max="365"
                        step="7"
                        value={settings.data?.historyRetention ?? 30}
                        onChange={(e) => updateSettings({
                          data: { ...settings.data, historyRetention: parseInt(e.target.value) }
                        })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-ios-gray mt-1">
                        <span>7天</span>
                        <span>30天</span>
                        <span>365天</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <HardDrive size={20} className="text-ios-blue" />
                    存储信息
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
                      <div className="flex items-center gap-3">
                        <Database size={18} className="text-ios-blue" />
                        <div>
                          <p className="font-medium text-black dark:text-white">缓存大小</p>
                          <p className="text-xs text-ios-gray">图片、临时数据等</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-black dark:text-white">{cacheSize}</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setClearCacheOpen(true)}
                        >
                          <Trash2 size={14} className="mr-1" />
                          清除
                        </Button>
                      </div>
                    </div>
                    {window.electronAPI && (
                      <div className="flex justify-between items-center p-3 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
                        <div className="flex items-center gap-3">
                          <HardDrive size={18} className="text-ios-green" />
                          <div>
                            <p className="font-medium text-black dark:text-white">数据存储位置</p>
                            <p className="text-xs text-ios-gray">应用数据保存目录</p>
                          </div>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={async () => {
                            const path = await window.electronAPI?.getPath?.('userData')
                            if (path) showToast(`存储位置: ${path}`, 'info')
                          }}
                        >
                          <ChevronRight size={14} />
                          查看
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <RefreshCw size={20} className="text-ios-orange" />
                    历史记录
                  </h3>
                  <div className="space-y-3">
                    <ListItem
                      icon={<RefreshCw size={18} />}
                      label="清除阅读历史"
                      subtitle={`清除所有阅读和观看历史记录（共 ${history.length} 条）`}
                      action={
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={history.length === 0}
                          onClick={() => {
                            clearHistory()
                            showToast('历史记录已清除', 'success')
                          }}
                        >
                          清除
                        </Button>
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-ios-red mb-4 flex items-center gap-2">
                    <Trash2 size={20} />
                    危险操作
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-ios border border-red-200 dark:border-red-800/30">
                      <div className="flex items-center gap-3">
                        <AlertTriangle size={18} className="text-ios-red" />
                        <div>
                          <p className="font-medium text-black dark:text-white">重置所有数据</p>
                          <p className="text-xs text-ios-gray">删除所有数据并恢复默认设置</p>
                        </div>
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setClearConfirmOpen(true)}
                      >
                        重置
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      <Modal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="确认重置"
        size="md"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-ios">
            <AlertTriangle size={24} className="text-ios-red flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-black dark:text-white">此操作不可撤销！</h4>
              <p className="text-sm text-black/70 dark:text-white/70 mt-1">
                将删除所有数据，包括：
              </p>
              <ul className="text-sm text-black/70 dark:text-white/70 mt-2 space-y-1 list-disc list-inside">
                <li>所有数据源 ({sources.length}个)</li>
                <li>书架中的小说 ({books.length}本)</li>
                <li>视频库 ({videos.length}个)</li>
                <li>直播频道 ({liveChannels.length}个)</li>
                <li>阅读进度和历史记录</li>
                <li>所有自定义设置</li>
              </ul>
            </div>
          </div>
        </div>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setClearConfirmOpen(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleClearAllData}>
            确认重置
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={clearCacheOpen}
        onClose={() => setClearCacheOpen(false)}
        title="清除缓存"
        size="sm"
      >
        <p className="text-black/70 dark:text-white/70">
          确定要清除所有缓存数据吗？这将删除临时文件、图片缓存等。不会影响你的数据源、书籍和设置。
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setClearCacheOpen(false)}>
            取消
          </Button>
          <Button
            variant="danger"
            onClick={handleClearCache}
            disabled={isClearingCache}
          >
            {isClearingCache ? (
              <>
                <RefreshCw size={16} className="mr-1 animate-spin" />
                清除中...
              </>
            ) : '确认清除'}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
