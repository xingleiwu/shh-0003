import React, { useState } from 'react'
import { PlaySquare, Search, Plus, Grid3X3, List, Trash2, Play, Film, Tv2 } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchJson } from '@/utils/http'
import { truncate, formatDate } from '@/utils'
import { motion } from 'framer-motion'

type ViewMode = 'grid' | 'list'
type TabType = 'library' | 'discover'

export const VideosPage: React.FC = () => {
  const { videos, sources, addVideo, removeVideo, setCurrentVideo, addHistory } = useAppStore()
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [tab, setTab] = useState<TabType>('library')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const videoSources = sources.filter(s => s.type === 'video' || s.type === 'mixed')

  const filteredVideos = videos.filter(video =>
    video.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSearch = async () => {
    if (!searchKeyword.trim()) {
      showToast('请输入搜索关键词', 'warning')
      return
    }

    setSearching(true)
    setSearchResults([])

    try {
      const sourcesToSearch = selectedSource === 'all'
        ? videoSources
        : videoSources.filter(s => s.id === selectedSource)

      if (sourcesToSearch.length === 0) {
        showToast('请先添加视频数据源', 'warning')
        setSearching(false)
        return
      }

      const results: any[] = []

      for (const source of sourcesToSearch) {
        try {
          const searchUrl = source.config?.searchUrl || source.url
          const url = searchUrl.includes('?')
            ? `${searchUrl}&search=${encodeURIComponent(searchKeyword)}`
            : `${searchUrl}?search=${encodeURIComponent(searchKeyword)}`

          const data = await fetchJson(url, source.config?.headers)

          const list = data.list || data.data || data.result || Array.isArray(data) ? data : []
          if (Array.isArray(list)) {
            list.forEach((item: any) => {
              results.push({
                ...item,
                sourceId: source.id,
                sourceName: source.name,
              })
            })
          }
        } catch (error) {
          console.error(`搜索数据源 ${source.name} 失败:`, error)
        }
      }

      setSearchResults(results)
      if (results.length === 0) {
        showToast('未找到相关视频', 'info')
      } else {
        showToast(`找到 ${results.length} 个相关视频`, 'success')
      }
    } catch (error) {
      showToast(`搜索失败: ${(error as Error).message}`, 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleAddToLibrary = (video: any) => {
    const exists = videos.find(v => v.videoUrl === (video.videoUrl || video.url))
    if (exists) {
      showToast('该视频已在库中', 'warning')
      return
    }

    addVideo({
      name: video.name || video.title,
      cover: video.cover || video.pic || video.img || '',
      intro: video.intro || video.desc || video.remarks || '',
      rating: video.rating,
      year: video.year,
      area: video.area,
      director: video.director,
      actors: video.actor?.split(/[,，]/) || [],
      sourceId: video.sourceId,
      videoUrl: video.videoUrl || video.url || '',
      playList: video.playList || [],
    })
    showToast('已添加到视频库', 'success')
  }

  const handlePlayVideo = (video: any) => {
    addHistory({
      type: 'video',
      itemId: video.id,
      name: video.name,
      cover: video.cover,
      progress: 0,
    })
    setCurrentVideo(video)
  }

  if (tab === 'discover') {
    return (
      <div className="p-6 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">发现视频</h1>
          <Button variant="secondary" size="sm" icon={<Film size={18} />} onClick={() => setTab('library')}>
            我的视频库 ({videos.length})
          </Button>
        </div>

        <div className="flex gap-3 items-start">
          <div className="flex-1">
            <Input
              placeholder="搜索电影、电视剧..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              leftIcon={<Search size={18} />}
              rightIcon={searching ? <Spinner size="sm" /> : undefined}
            />
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="ios-input w-48"
          >
            <option value="all">全部数据源</option>
            {videoSources.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? '搜索中...' : '搜索'}
          </Button>
        </div>

        {searching ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-ios-gray">正在搜索中...</p>
          </div>
        ) : searchResults.length > 0 ? (
          <div className="grid grid-cols-5 gap-4">
            {searchResults.map((video, index) => (
              <motion.div
                key={`${video.sourceId}-${video.id || video.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="group"
              >
                <Card hoverable>
                  <div className="aspect-[2/3] relative bg-ios-gray6 dark:bg-[#2C2C2E]">
                    {video.cover || video.pic || video.img ? (
                      <img
                        src={video.cover || video.pic || video.img}
                        alt={video.name || video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ios-gray">
                        <Tv2 size={48} />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Play size={48} className="text-white" />
                    </div>
                    {video.remarks && (
                      <div className="absolute top-2 right-2 bg-ios-blue/90 text-white text-xs px-2 py-1 rounded-full">
                        {video.remarks}
                      </div>
                    )}
                  </div>
                  <CardContent className="p-3">
                    <h3 className="font-medium text-black dark:text-white truncate">
                      {video.name || video.title}
                    </h3>
                    <p className="text-sm text-ios-gray truncate">
                      {video.year || ''} {video.area || ''}
                    </p>
                    <p className="text-xs text-ios-blue mt-1">{video.sourceName}</p>
                  </CardContent>
                </Card>
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    fullWidth
                    variant="secondary"
                    onClick={() => handleAddToLibrary(video)}
                  >
                    添加
                  </Button>
                  <Button
                    size="sm"
                    fullWidth
                    onClick={() => handlePlayVideo(video)}
                    icon={<Play size={14} />}
                  >
                    播放
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={48} />}
            title="开始搜索"
            description="输入关键词搜索你喜欢的电影、电视剧"
          />
        )}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black dark:text-white">我的视频库</h1>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as TabType)}
            options={[
              { value: 'library', label: '视频库', icon: <Film size={16} /> },
              { value: 'discover', label: '发现', icon: <Search size={16} /> },
            ]}
          />
          <div className="flex items-center gap-1 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios p-0.5">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-[10px] transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm' : 'text-ios-gray'}`}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-[10px] transition-all ${viewMode === 'list' ? 'bg-white dark:bg-[#1C1C1E] shadow-sm' : 'text-ios-gray'}`}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="搜索视频库..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={18} />}
          className="flex-1"
        />
        <Button variant="secondary" icon={<Plus size={18} />}>
          导入本地视频
        </Button>
      </div>

      {filteredVideos.length === 0 ? (
        <EmptyState
          icon={<PlaySquare size={48} />}
          title="视频库为空"
          description="去发现页面搜索喜欢的视频，或者导入本地视频"
          action={
            <Button onClick={() => setTab('discover')}>
              去发现
            </Button>
          }
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-5 gap-4">
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="group"
            >
              <Card hoverable onClick={() => handlePlayVideo(video)}>
                <div className="aspect-[2/3] relative bg-ios-gray6 dark:bg-[#2C2C2E]">
                  {video.cover ? (
                    <img src={video.cover} alt={video.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ios-gray">
                      <Tv2 size={48} />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <Play size={48} className="text-white" />
                  </div>
                </div>
                <CardContent className="p-3">
                  <h3 className="font-medium text-black dark:text-white truncate">{video.name}</h3>
                  <p className="text-sm text-ios-gray truncate">
                    {video.year || ''} {video.area || ''}
                  </p>
                  <p className="text-xs text-ios-gray mt-1">{formatDate(video.addedAt)}</p>
                </CardContent>
              </Card>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeVideo(video.id)
                  showToast('已从视频库移除', 'success')
                }}
                className="mt-2 w-full p-2 text-ios-red text-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-ios-red/10 rounded-ios"
              >
                <Trash2 size={16} className="inline mr-1" />
                移除
              </button>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredVideos.map((video, index) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Card hoverable>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-24 h-36 rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E] flex-shrink-0">
                    {video.cover ? (
                      <img src={video.cover} alt={video.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ios-gray">
                        <Tv2 size={32} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-black dark:text-white text-lg">{video.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {video.year && <span className="text-sm text-ios-gray">{video.year}</span>}
                      {video.area && <span className="text-sm text-ios-gray">· {video.area}</span>}
                      {video.rating && (
                        <span className="text-sm text-ios-orange font-medium">★ {video.rating}</span>
                      )}
                    </div>
                    {video.director && (
                      <p className="text-sm text-ios-gray mt-1">导演: {video.director}</p>
                    )}
                    {video.actors && video.actors.length > 0 && (
                      <p className="text-sm text-ios-gray mt-1">
                        主演: {truncate(video.actors.join(', '), 50)}
                      </p>
                    )}
                    <p className="text-sm text-ios-gray mt-2 line-clamp-2">
                      {truncate(video.intro, 150)}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button onClick={() => handlePlayVideo(video)} icon={<Play size={16} />}>
                      播放
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-ios-red"
                      onClick={() => {
                        removeVideo(video.id)
                        showToast('已从视频库移除', 'success')
                      }}
                      icon={<Trash2 size={16} />}
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
  )
}
