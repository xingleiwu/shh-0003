import React, { useState } from 'react'
import { Database, Search, Plus, Trash2, Edit2, RefreshCw, Check, X, Globe, BookOpen, PlaySquare, Tv, Settings } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Switch } from '@/components/ui/Switch'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchUrl, testUrl } from '@/utils/http'
import { parseSourceContent } from '@/utils/parser'
import { formatDate, extractDomain } from '@/utils'
import { motion } from 'framer-motion'

type FilterType = 'all' | 'novel' | 'video' | 'live' | 'mixed'

export const SourcesPage: React.FC = () => {
  const { sources, addSource, updateSource, removeSource, importSources, addLiveChannel, clearAllSources } = useAppStore()
  const { showToast } = useToast()
  const [filter, setFilter] = useState<FilterType>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editSource, setEditSource] = useState<any>(null)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    url: string
    type: 'novel' | 'video' | 'live' | 'mixed'
    apiType: 'catvod' | 'tvbox' | 'yuedu' | 'iptv' | 'custom'
    omniboxPassword: string
  }>({
    name: '',
    url: '',
    type: 'video',
    apiType: 'catvod',
    omniboxPassword: '',
  })
  const [loading, setLoading] = useState(false)

  const filteredSources = sources.filter(source => {
    const matchesFilter = filter === 'all' || source.type === filter
    const matchesSearch = source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      source.url.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const typeIcons: Record<string, React.ReactNode> = {
    novel: <BookOpen size={18} />,
    video: <PlaySquare size={18} />,
    live: <Tv size={18} />,
    mixed: <Database size={18} />,
  }

  const typeLabels: Record<string, string> = {
    novel: '小说',
    video: '视频',
    live: '直播',
    mixed: '混合',
  }

  const typeColors: Record<string, string> = {
    novel: 'bg-blue-500',
    video: 'bg-purple-500',
    live: 'bg-orange-500',
    mixed: 'bg-green-500',
  }

  const handleTest = async (url: string, id: string) => {
    setTestingId(id)
    try {
      const result = await testUrl(url)
      if (result.success) {
        showToast('连接成功', 'success')
      } else {
        showToast(`连接失败: ${result.error || `状态码 ${result.status}`}`, 'error')
      }
    } catch (error) {
      showToast('测试失败', 'error')
    } finally {
      setTestingId(null)
    }
  }

  const handleRefresh = async (source: any) => {
    setTestingId(source.id)
    try {
      const content = await fetchUrl(source.url, source.config?.headers)
      const result = await parseSourceContent(source.url, content)

      if (result.liveChannels.length > 0) {
        result.liveChannels.forEach(channel => {
          channel.sourceId = source.id
          addLiveChannel(channel)
        })
        showToast(`刷新成功，更新了 ${result.liveChannels.length} 个频道`, 'success')
      } else {
        showToast('刷新成功', 'success')
      }
    } catch (error) {
      showToast(`刷新失败: ${(error as Error).message}`, 'error')
    } finally {
      setTestingId(null)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name.trim() || !formData.url.trim()) {
      showToast('请填写完整信息', 'warning')
      return
    }

    setLoading(true)
    try {
      if (editSource) {
        updateSource(editSource.id, {
          name: formData.name,
          url: formData.url,
          type: formData.type,
          config: { apiType: formData.apiType, omniboxPassword: formData.omniboxPassword || undefined },
        })
        showToast('数据源已更新', 'success')
      } else {
        const content = await fetchUrl(formData.url)
        const result = await parseSourceContent(formData.url, content)

        if (result.sources.length > 0) {
          importSources(result.sources)
          if (result.liveChannels.length > 0) {
            result.liveChannels.forEach(channel => addLiveChannel(channel))
          }
          showToast(`成功导入 ${result.sources.length} 个数据源${result.liveChannels.length > 0 ? `，${result.liveChannels.length} 个直播频道` : ''}`, 'success')
        } else if (result.liveChannels.length > 0) {
          result.liveChannels.forEach(channel => addLiveChannel(channel))
          showToast(`成功导入 ${result.liveChannels.length} 个直播频道`, 'success')
        } else {
          addSource({
            name: formData.name,
            url: formData.url,
            type: formData.type,
            enabled: true,
            config: { apiType: formData.apiType, omniboxPassword: formData.omniboxPassword || undefined },
          })
          showToast('数据源已添加', 'success')
        }
      }

      setAddModalOpen(false)
      setEditSource(null)
      setFormData({ name: '', url: '', type: 'video', apiType: 'catvod', omniboxPassword: '' })
    } catch (error) {
      showToast(`操作失败: ${(error as Error).message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (source: any) => {
    setEditSource(source)
    setFormData({
      name: source.name,
      url: source.url,
      type: source.type,
      apiType: source.config?.apiType || 'custom',
      omniboxPassword: source.config?.omniboxPassword || '',
    })
    setAddModalOpen(true)
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black dark:text-white">数据源管理</h1>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            onClick={() => {
              if (confirm('确定要清空所有数据源吗？此操作不可恢复。')) {
                clearAllSources()
                showToast('已清空所有数据源', 'success')
              }
            }}
          >
            <Trash2 size={18} />
          </Button>
          <Button icon={<Plus size={18} />} onClick={() => {
            setEditSource(null)
            setFormData({ name: '', url: '', type: 'video', apiType: 'catvod', omniboxPassword: '' })
            setAddModalOpen(true)
          }}>
            添加数据源
          </Button>
        </div>
      </div>

      <div className="flex gap-3 items-center">
        <SegmentedControl
          value={filter}
          onChange={(v) => setFilter(v as FilterType)}
          options={[
            { value: 'all', label: '全部' },
            { value: 'novel', label: '小说', icon: typeIcons.novel },
            { value: 'video', label: '视频', icon: typeIcons.video },
            { value: 'live', label: '直播', icon: typeIcons.live },
            { value: 'mixed', label: '混合', icon: typeIcons.mixed },
          ]}
        />
        <Input
          placeholder="搜索数据源..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} />}
          className="flex-1 max-w-md"
        />
      </div>

      {filteredSources.length === 0 ? (
        <EmptyState
          icon={<Database size={48} />}
          title="暂无数据源"
          description="添加数据源开始使用各种功能"
          action={
            <Button onClick={() => setAddModalOpen(true)}>
              添加数据源
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredSources.map((source, index) => (
            <motion.div
              key={source.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`w-12 h-12 rounded-ios ${typeColors[source.type]} flex items-center justify-center text-white flex-shrink-0`}>
                    {typeIcons[source.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-black dark:text-white">{source.name}</h3>
                      <span className={`ios-badge ${
                        source.type === 'novel' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                        source.type === 'video' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                          source.type === 'live' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                      }`}>
                        {typeLabels[source.type]}
                      </span>
                      {source.config?.apiType && (
                        <span className="ios-badge bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                          {source.config.apiType.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ios-gray mt-1 truncate flex items-center gap-2">
                      <Globe size={14} />
                      {extractDomain(source.url)}
                    </p>
                    <p className="text-xs text-ios-gray mt-1">
                      添加于 {formatDate(source.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-ios-gray">启用</span>
                      <Switch
                        checked={source.enabled}
                        onChange={(checked) => updateSource(source.id, { enabled: checked })}
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleTest(source.url, source.id)}
                        disabled={testingId === source.id}
                      >
                        {testingId === source.id ? <Spinner size="sm" /> : <Check size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRefresh(source)}
                        disabled={testingId === source.id}
                      >
                        {testingId === source.id ? <Spinner size="sm" /> : <RefreshCw size={16} />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(source)}
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-ios-red"
                        onClick={() => {
                          removeSource(source.id)
                          showToast('已删除数据源', 'success')
                        }}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false)
          setEditSource(null)
        }}
        title={editSource ? '编辑数据源' : '添加数据源'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="数据源名称"
            placeholder="例如：某某视频源"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Input
            label="数据源URL"
            placeholder="https://example.com/source.json"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1.5 ios-label">类型</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="ios-input w-full"
              >
                <option value="novel">小说</option>
                <option value="video">视频</option>
                <option value="live">直播</option>
                <option value="mixed">混合</option>
              </select>
            </div>
            <div>
              <label className="block mb-1.5 ios-label">API类型</label>
              <select
                value={formData.apiType}
                onChange={(e) => setFormData({ ...formData, apiType: e.target.value as any })}
                className="ios-input w-full"
              >
                <option value="catvod">CatVod</option>
                <option value="tvbox">TVBox</option>
                <option value="yuedu">阅读APP</option>
                <option value="iptv">IPTV</option>
                <option value="custom">自定义</option>
              </select>
            </div>
          </div>

          {formData.url.includes('/api/tvbox/source/') && (
            <Input
              label="OmniBox 管理密码"
              type="password"
              placeholder="输入 OmniBox 管理密码以获取播放信息"
              value={formData.omniboxPassword}
              onChange={(e) => setFormData({ ...formData, omniboxPassword: e.target.value })}
            />
          )}

          <div className="p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
            <h4 className="font-medium text-black dark:text-white mb-2 flex items-center gap-2">
              <Settings size={16} />
              支持的格式说明
            </h4>
            <ul className="text-sm text-ios-gray space-y-1">
              <li>• <strong>CatVod/TVBox:</strong> JSON格式，包含sites数组</li>
              <li>• <strong>阅读APP:</strong> JSON数组，包含bookSourceName等字段</li>
              <li>• <strong>IPTV:</strong> M3U、TXT或JSON格式的直播源</li>
            </ul>
          </div>

          {!editSource && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-ios">
              <h4 className="font-medium text-blue-600 dark:text-blue-400 mb-2">快速添加示例</h4>
              <div className="space-y-2 text-sm">
                <button
                  onClick={() => setFormData({
                    ...formData,
                    name: 'CatVod演示源',
                    url: 'https://gh-proxy.org/https://raw.githubusercontent.com/ggrrttyyiii/CatVodSpider/refs/heads/main/json/demo.json',
                    type: 'video',
                    apiType: 'catvod',
                  })}
                  className="block w-full text-left text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  → CatVod 演示源
                </button>
                <button
                  onClick={() => setFormData({
                    ...formData,
                    name: '阅读APP书源',
                    url: 'https://bitbucket.org/xiu2/yuedu/raw/master/shuyuan',
                    type: 'novel',
                    apiType: 'yuedu',
                  })}
                  className="block w-full text-left text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  → 阅读APP 全部书源
                </button>
              </div>
            </div>
          )}
        </div>

        <ModalFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setAddModalOpen(false)
              setEditSource(null)
            }}
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Spinner size="sm" color="white" />
                处理中...
              </>
            ) : (
              editSource ? '保存修改' : '添加数据源'
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  )
}
