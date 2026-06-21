import React, { useState, useMemo, useRef } from 'react'
import {
  Tv,
  Search,
  Plus,
  Play,
  Trash2,
  Radio,
  Download,
  Upload,
  X,
  RefreshCw,
  Globe,
  FileJson,
  Folder,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Spinner } from '@/components/ui/Spinner'
import { fetchUrl, testUrl } from '@/utils/http'
import { parseSourceContent, parseIptvPlaylist, parseTxtIptv, parseJsonIptv, detectSourceType } from '@/utils/parser'
import { groupBy } from '@/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { LiveChannel } from '@/types'

export const LivePage: React.FC = () => {
  const navigate = useNavigate()
  const { liveChannels, removeLiveChannel, setCurrentLiveChannel, addHistory, addLiveChannel, setCurrentView, addLocalFile } = useAppStore()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importType, setImportType] = useState<'url' | 'file'>('url')
  const [importUrl, setImportUrl] = useState('')
  const [importing, setImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const groupedChannels = useMemo(() => {
    return groupBy(liveChannels, 'group')
  }, [liveChannels])

  const groups = ['all', ...Object.keys(groupedChannels)]

  const filteredChannels = useMemo(() => {
    let channels = liveChannels

    if (selectedGroup !== 'all') {
      channels = channels.filter((c) => c.group === selectedGroup)
    }

    if (searchQuery) {
      channels = channels.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return channels
  }, [liveChannels, selectedGroup, searchQuery])

  const handlePlayChannel = (channel: LiveChannel) => {
    addHistory({
      type: 'live',
      itemId: channel.id,
      name: channel.name,
      cover: channel.logo || '',
      progress: 0,
    })
    setCurrentLiveChannel(channel)
  }

  const handleImportFromUrl = async () => {
    if (!importUrl.trim()) {
      showToast('请输入直播源URL', 'warning')
      return
    }
    setImporting(true)
    try {
      const content = await fetchUrl(importUrl)
      const type = detectSourceType(importUrl, content)
      let channels: LiveChannel[] = []

      if (type === 'iptv' || content.includes('#EXTM3U')) {
        channels = parseIptvPlaylist(content)
      } else if (content.startsWith('[') || content.startsWith('{')) {
        channels = parseJsonIptv(content)
      } else {
        channels = parseTxtIptv(content)
      }

      if (channels.length === 0) {
        showToast('未解析到任何直播频道', 'warning')
        return
      }

      let added = 0
      for (const channel of channels) {
        const exists = liveChannels.some((c) => c.name === channel.name && c.urls[0] === channel.urls[0])
        if (!exists) {
          addLiveChannel(channel)
          added++
        }
      }
      showToast(`成功导入 ${added} 个直播频道${added < channels.length ? `（跳过${channels.length - added}个重复）` : ''}`, 'success')
      setImportModalOpen(false)
      setImportUrl('')
    } catch (error) {
      showToast(`导入失败: ${(error as Error).message}`, 'error')
    } finally {
      setImporting(false)
    }
  }

  const handleFileClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setImporting(true)
    let totalAdded = 0
    const playlistExtensions = ['.m3u', '.m3u8', '.txt', '.json']

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const ext = '.' + file.name.split('.').pop()?.toLowerCase()
        if (!playlistExtensions.includes(ext)) continue

        try {
          const content = await file.text()
          let channels: LiveChannel[] = []

          if (ext === '.m3u' || ext === '.m3u8' || content.includes('#EXTM3U')) {
            channels = parseIptvPlaylist(content)
          } else if (ext === '.json' || content.startsWith('[')) {
            channels = parseJsonIptv(content)
          } else {
            channels = parseTxtIptv(content)
          }

          let added = 0
          for (const channel of channels) {
            const exists = liveChannels.some((c) => c.name === channel.name && c.urls[0] === channel.urls[0])
            if (!exists) {
              addLiveChannel(channel)
              added++
            }
          }
          totalAdded += added

          addLocalFile({
            name: file.name,
            path: file.name,
            type: 'live',
            size: file.size,
          })
        } catch (e) {
          console.error(`解析文件 ${file.name} 失败:`, e)
        }
      }

      if (totalAdded > 0) {
        showToast(`成功导入 ${totalAdded} 个直播频道`, 'success')
        setImportModalOpen(false)
      } else {
        showToast('未解析到有效的直播频道', 'warning')
      }
    } catch (error) {
      showToast(`导入失败: ${(error as Error).message}`, 'error')
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleRemoveAll = () => {
    if (liveChannels.length === 0) return
    if (!confirm(`确定要删除所有 ${liveChannels.length} 个直播频道吗？`)) return
    liveChannels.forEach((c) => removeLiveChannel(c.id))
    showToast('已清空所有直播频道', 'success')
  }

  const goToSources = () => {
    setCurrentView('sources')
    navigate('/sources')
  }

  return (
    <div className="flex h-full animate-fadeIn">
      <div className="w-60 border-r border-ios-gray5 dark:border-[#38383A] p-4 overflow-y-auto scrollbar-ios flex-shrink-0 bg-white dark:bg-[#1C1C1E]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-black dark:text-white mb-3 flex items-center gap-2">
            <Radio size={18} className="text-ios-blue" />
            频道分类
          </h2>
          <div className="text-xs text-ios-gray mb-3">共 {liveChannels.length} 个频道</div>
        </div>
        <div className="space-y-1">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={[
                'w-full flex items-center justify-between px-3 py-2 rounded-ios text-left transition-all text-sm',
                selectedGroup === group
                  ? 'bg-ios-blue text-white shadow-sm'
                  : 'hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-black/70 dark:text-white/70'
              ].join(' ')}
            >
              <span className="flex items-center gap-2 truncate">
                <Tv size={14} className={selectedGroup === group ? 'text-white' : 'text-ios-blue'} />
                <span className="truncate">{group === 'all' ? '全部频道' : group}</span>
              </span>
              <span className={[
                'text-xs font-medium px-2 py-0.5 rounded-full',
                selectedGroup === group ? 'bg-white/20 text-white' : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-ios-gray'
              ].join(' ')}>
                {group === 'all' ? liveChannels.length : groupedChannels[group]?.length || 0}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-ios-gray5 dark:border-[#38383A]">
          <h3 className="text-xs font-medium text-ios-gray uppercase tracking-wider mb-3 px-3">快捷操作</h3>
          <div className="space-y-1">
            <button
              onClick={() => setImportModalOpen(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-ios text-left text-sm hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-ios-blue transition-all"
            >
              <Plus size={16} />
              导入直播源
            </button>
            <button
              onClick={handleRemoveAll}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-ios text-left text-sm hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-ios-red transition-all"
            >
              <Trash2 size={16} />
              清空所有
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-ios-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-md">
                <Tv size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-black dark:text-white">
                  {selectedGroup === 'all' ? '电视直播' : selectedGroup}
                </h1>
                <p className="text-ios-gray text-sm">
                  {filteredChannels.length} 个频道
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="搜索频道..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-64"
              />
              <Button variant="secondary" icon={<Plus size={18} />} onClick={() => setImportModalOpen(true)}>
                导入直播源
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 pt-0 overflow-y-auto scrollbar-ios">
          {filteredChannels.length === 0 ? (
            <EmptyState
              icon={<Tv size={48} />}
              title="暂无直播频道"
              description={liveChannels.length === 0
                ? '导入直播源开始观看电视直播。支持 M3U、TXT、JSON 格式。'
                : '没有匹配的频道，换个关键词试试？'
              }
              action={
                <div className="flex gap-2">
                  {liveChannels.length === 0 ? (
                    <>
                      <Button onClick={() => setImportModalOpen(true)} icon={<Plus size={16} />}>
                        导入直播源
                      </Button>
                      <Button variant="secondary" onClick={goToSources} icon={<Globe size={16} />}>
                        去数据源管理
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" onClick={() => setSearchQuery('')}>
                      清空搜索
                    </Button>
                  )}
                </div>
              }
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredChannels.map((channel, index) => (
                <motion.div
                  key={channel.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.015 }}
                  className="group"
                >
                  <Card hoverable onClick={() => handlePlayChannel(channel)}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-14 h-14 rounded-ios bg-ios-gray6 dark:bg-[#2C2C2E] flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {channel.logo ? (
                            <img
                              src={channel.logo}
                              alt={channel.name}
                              className="w-full h-full object-contain p-1.5"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none'
                              }}
                            />
                          ) : (
                            <Tv size={22} className="text-ios-gray" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-black dark:text-white truncate">{channel.name}</h3>
                          <p className="text-xs text-ios-gray mt-0.5 truncate">{channel.group || '未分类'}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <span className={[
                              'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded',
                              channel.urls.length > 0
                                ? 'bg-ios-green/10 text-ios-green'
                                : 'bg-ios-gray5 text-ios-gray'
                            ].join(' ')}>
                              <span className={[
                                'w-1.5 h-1.5 rounded-full',
                                channel.urls.length > 0 ? 'bg-ios-green animate-pulse' : 'bg-ios-gray'
                              ].join(' ')} />
                              {channel.urls.length} 线路
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <Button
                          size="sm"
                          fullWidth
                          onClick={(e) => {
                            e.stopPropagation()
                            handlePlayChannel(channel)
                          }}
                          icon={<Play size={14} />}
                        >
                          播放
                        </Button>
                        <Button
                          size="sm"
                          fullWidth
                          variant="ghost"
                          className="text-ios-red"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeLiveChannel(channel.id)
                            showToast('已移除频道', 'success')
                          }}
                          icon={<Trash2 size={14} />}
                        >
                          移除
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".m3u,.m3u8,.txt,.json"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <Modal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="导入直播源"
        size="lg"
      >
        <div className="space-y-5">
          <SegmentedControl
            value={importType}
            onChange={setImportType as any}
            options={[
              { value: 'url', label: '网络接口', icon: <Globe size={16} /> },
              { value: 'file', label: '本地文件', icon: <Folder size={16} /> },
            ]}
          />

          {importType === 'url' && (
            <div className="space-y-4">
              <div>
                <Input
                  label="直播源URL"
                  placeholder="https://example.com/iptv.m3u 或 .txt/.json"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                />
                <p className="text-xs text-ios-gray mt-2">
                  支持格式：M3U8、M3U、TXT、JSON
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
                  <h4 className="text-sm font-medium text-black dark:text-white mb-2 flex items-center gap-2">
                    <Globe size={14} className="text-ios-blue" />
                    推荐使用：数据源管理批量导入
                  </h4>
                  <p className="text-xs text-ios-gray mb-3">
                    通过数据源管理页面可以统一管理 IPTV 源，支持自动刷新
                  </p>
                  <Button variant="secondary" size="sm" onClick={goToSources}>
                    前往数据源管理
                  </Button>
                </div>
              </div>

              <Button fullWidth onClick={handleImportFromUrl} disabled={importing}>
                {importing ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> 导入中...</span>
                ) : '开始导入'}
              </Button>
            </div>
          )}

          {importType === 'file' && (
            <div className="space-y-4">
              <div
                className="border-2 border-dashed border-ios-gray4 dark:border-[#38383A] rounded-ios-xl p-8 text-center hover:border-ios-blue/50 transition-all cursor-pointer"
                onClick={handleFileClick}
              >
                <FileJson size={48} className="mx-auto text-ios-gray3 mb-3" />
                <p className="font-medium text-black dark:text-white mb-1">点击选择文件</p>
                <p className="text-sm text-ios-gray">
                  支持 .m3u, .m3u8, .txt, .json 格式
                </p>
              </div>

              <div className="bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios p-4">
                <h4 className="text-sm font-medium text-black dark:text-white mb-2">格式说明</h4>
                <div className="text-xs text-ios-gray space-y-1">
                  <p><strong className="text-black/70 dark:text-white/70">TXT格式：</strong>频道名,http://xxx/xxx.m3u8</p>
                  <p><strong className="text-black/70 dark:text-white/70">分组格式：</strong>[分组名] 开头，后面跟频道</p>
                  <p><strong className="text-black/70 dark:text-white/70">JSON格式：</strong>数组形式：name, url, group 字段</p>
                </div>
              </div>

              <Button fullWidth onClick={handleFileClick} disabled={importing}>
                {importing ? (
                  <span className="flex items-center gap-2"><Spinner size="sm" /> 导入中...</span>
                ) : (
                  <span className="flex items-center gap-2"><Upload size={16} /> 选择文件</span>
                )}
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
