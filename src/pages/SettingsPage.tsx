import React, { useState } from 'react'
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
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { List, ListItem } from '@/components/ui/List'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { useToast } from '@/components/ui/Toast'
import { useToast as useToastComp } from '@/components/ui/Toast'
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
  } = useAppStore()
  const { showToast } = useToast()
  const [tab, setTab] = useState<TabType>('appearance')
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const tabItems = [
    { id: 'appearance', label: '外观', icon: <Palette size={18} /> },
    { id: 'reader', label: '阅读设置', icon: <BookOpen size={18} /> },
    { id: 'player', label: '播放设置', icon: <PlaySquare size={18} /> },
    { id: 'network', label: '网络设置', icon: <Wifi size={18} /> },
    { id: 'data', label: '数据管理', icon: <Database size={18} /> },
  ]

  const handleExportData = async () => {
    if (!window.electronAPI) return

    const data = {
      sources,
      books,
      videos,
      liveChannels,
      localFiles,
      settings,
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
    if (!window.electronAPI) return

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

  const dataStats = [
    { label: '数据源', value: sources.length, icon: <Database size={16} /> },
    { label: '小说', value: books.length, icon: <BookOpen size={16} /> },
    { label: '视频', value: videos.length, icon: <PlaySquare size={16} /> },
    { label: '直播频道', value: liveChannels.length, icon: <Settings size={16} /> },
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
            </div>
          </div>
        </div>

        <div className="flex-1 max-w-2xl">
          {tab === 'appearance' && (
            <div className="space-y-6">
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
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'reader' && (
            <div className="space-y-6">
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
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Palette size={20} className="text-ios-blue" />
                    阅读背景
                  </h3>
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
            </div>
          )}

          {tab === 'player' && (
            <div className="space-y-6">
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
                      icon={<Volume2 size={18} />}
                      label={`默认音量: ${settings.player.defaultVolume}%`}
                      action={
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={settings.player.defaultVolume}
                          onChange={(e) => updatePlayerSettings({ defaultVolume: parseInt(e.target.value) })}
                          className="w-32"
                        />
                      }
                    />
                    <ListItem
                      icon={<RefreshCw size={18} />}
                      label="硬件解码"
                      subtitle="启用GPU加速解码"
                      action={
                        <Switch
                          checked={settings.player.enableHardwareDecoding}
                          onChange={(checked) => updatePlayerSettings({ enableHardwareDecoding: checked })}
                        />
                      }
                    />
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
                        max="300"
                        step="5"
                        value={settings.player.skipIntro}
                        onChange={(e) => updatePlayerSettings({ skipIntro: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block mb-2 ios-label">
                        跳过片尾: {settings.player.skipEnding}秒
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="300"
                        step="5"
                        value={settings.player.skipEnding}
                        onChange={(e) => updatePlayerSettings({ skipEnding: parseInt(e.target.value) })}
                        className="w-full"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {tab === 'network' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <Wifi size={20} className="text-ios-blue" />
                    网络设置
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block mb-2 ios-label">代理服务器</label>
                      <input
                        type="text"
                        placeholder="http://127.0.0.1:7890"
                        value={settings.network.proxy || ''}
                        onChange={(e) => updateNetworkSettings({ proxy: e.target.value })}
                        className="ios-input w-full"
                      />
                      <p className="text-xs text-ios-gray mt-1">可选，用于访问被屏蔽的网站</p>
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
            </div>
          )}

          {tab === 'data' && (
            <div className="space-y-6">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <FileJson size={20} className="text-ios-blue" />
                    数据备份
                  </h3>
                  <div className="flex gap-3">
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
                    导出所有数据源、书籍、视频和设置信息到JSON文件
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-black dark:text-white mb-4 flex items-center gap-2">
                    <RefreshCw size={20} className="text-ios-orange" />
                    历史记录
                  </h3>
                  <ListItem
                    icon={<RefreshCw size={18} />}
                    label="清除阅读历史"
                    subtitle="清除所有阅读和观看历史记录"
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          clearHistory()
                          showToast('历史记录已清除', 'success')
                        }}
                      >
                        清除
                      </Button>
                    }
                  />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <h3 className="font-semibold text-ios-red mb-4 flex items-center gap-2">
                    <Trash2 size={20} />
                    危险操作
                  </h3>
                  <ListItem
                    icon={<Trash2 size={18} />}
                    label="重置所有数据"
                    subtitle="删除所有数据并恢复默认设置"
                    destructive
                    action={
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setClearConfirmOpen(true)}
                      >
                        重置
                      </Button>
                    }
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="确认重置"
        size="md"
      >
        <p className="text-black/70 dark:text-white/70">
          此操作将删除所有数据，包括数据源、书架、视频库、历史记录和设置。此操作不可撤销，确定要继续吗？
        </p>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setClearConfirmOpen(false)}>
            取消
          </Button>
          <Button variant="danger" onClick={handleClearAllData}>
            确认重置
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
