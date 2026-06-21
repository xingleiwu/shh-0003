import React, { useState, useEffect, useRef } from 'react'
import {
  PlaySquare,
  Search,
  Plus,
  Grid3X3,
  List,
  Trash2,
  Play,
  Film,
  Tv2,
  ChevronRight,
  RefreshCw,
  Info,
  X,
  Star,
  Calendar,
  MapPin,
  User,
  Users,
  BookMarked,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { truncate, safeJSONParse } from '@/utils'
import { motion, AnimatePresence } from 'framer-motion'
import {
  catvodGetHomeContent,
  catvodGetCategories,
  catvodGetCategoryContent,
  catvodGetVideoDetail,
  catvodParsePlayList,
  catvodSearch,
  catvodVideoToVideo,
  type CatVodCategory,
  type CatVodVideo,
  type CatVodVideoDetail,
} from '@/services/catvod'

function resolveImgUrl(url: string, baseUrl: string): string {
  if (!url) return ''
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url
  }
  try {
    const base = new URL(baseUrl)
    if (url.startsWith('//')) {
      return base.protocol + url
    }
    if (url.startsWith('/')) {
      return base.origin + url
    }
    return base.origin + '/' + url.replace(/^\.\//, '')
  } catch {
    return url
  }
}

type ViewMode = 'grid' | 'list'
type TabType = 'library' | 'discover'

export const VideosPage: React.FC = () => {
  const navigate = useNavigate()
  const { videos, sources, addVideo, removeVideo, setCurrentVideo, addHistory, setCurrentView, addLocalFile } = useAppStore()
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [tab, setTab] = useState<TabType>('discover')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<CatVodVideo[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')

  const videoSources = sources.filter(
    (s) =>
      (s.type === 'video' || s.type === 'mixed') &&
      s.enabled !== false &&
      (s.config?.apiType === 'catvod' || s.config?.apiType === 'tvbox' || !s.config?.apiType)
  )

  const [categories, setCategories] = useState<CatVodCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('home')
  const [homeVideos, setHomeVideos] = useState<{ [key: string]: CatVodVideo[] }>({})
  const [categoryVideos, setCategoryVideos] = useState<CatVodVideo[]>([])
  const [loadingHome, setLoadingHome] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [detailModal, setDetailModal] = useState<{ item: CatVodVideo; sourceId: string } | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [videoDetail, setVideoDetail] = useState<CatVodVideoDetail | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const filteredVideos = videos.filter((video) =>
    video.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentSourceForDiscover =
    selectedSource === 'all'
      ? videoSources[0]
      : videoSources.find((s) => s.id === selectedSource)

  useEffect(() => {
    if (tab === 'discover' && currentSourceForDiscover) {
      loadHomeContent()
      loadCategories()
    }
  }, [tab, currentSourceForDiscover?.id])

  useEffect(() => {
    if (selectedCategory !== 'home' && currentSourceForDiscover) {
      loadCategoryContent(selectedCategory, 1)
    }
  }, [selectedCategory, currentSourceForDiscover?.id])

  const loadCategories = async () => {
    if (!currentSourceForDiscover) return
    const cats = await catvodGetCategories(currentSourceForDiscover)
    setCategories(cats)
  }

  const loadHomeContent = async () => {
    if (!currentSourceForDiscover) return
    setLoadingHome(true)
    try {
      const allHome: { [key: string]: CatVodVideo[] } = {}
      const activeSources = selectedSource === 'all' ? videoSources.slice(0, 3) : [currentSourceForDiscover]

      for (const source of activeSources) {
        const result = await catvodGetHomeContent(source)
        if (result.list.length > 0) {
          allHome[`${source.id}_推荐`] = result.list.slice(0, 12)
        }
        if (result.categories.length > 0) {
          for (const cat of result.categories.slice(0, 4)) {
            const catContent = await catvodGetCategoryContent(source, cat.type_id, 1)
            if (catContent.list.length > 0) {
              allHome[`${source.id}_${cat.type_name}`] = catContent.list.slice(0, 12)
            }
          }
        }
      }
      setHomeVideos(allHome)
    } finally {
      setLoadingHome(false)
    }
  }

  const loadCategoryContent = async (categoryId: string, pageNum: number) => {
    if (!currentSourceForDiscover) return
    setLoadingCategory(true)
    try {
      const result = await catvodGetCategoryContent(currentSourceForDiscover, categoryId, pageNum)
      if (pageNum === 1) {
        setCategoryVideos(result.list)
      } else {
        setCategoryVideos((prev) => [...prev, ...result.list])
      }
      setHasMore(pageNum < result.pagecount)
      setPage(pageNum)
    } finally {
      setLoadingCategory(false)
    }
  }

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
        : videoSources.filter((s) => s.id === selectedSource)

      if (sourcesToSearch.length === 0) {
        showToast('请先添加视频数据源', 'warning')
        setSearching(false)
        return
      }

      const results: CatVodVideo[] = []
      for (const source of sourcesToSearch.slice(0, 5)) {
        try {
          const list = await catvodSearch(source, searchKeyword)
          list.forEach((item) => {
            results.push({ ...item, _sourceId: source.id, _sourceName: source.name } as any)
          })
        } catch (e) {
          console.error(`搜索源 ${source.name} 失败`)
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

  const handleImportLocalVideo = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    let successCount = 0
    const videoExtensions = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.flv', '.wmv', '.m4v']

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!videoExtensions.includes(ext)) continue

      try {
        const filePath = (window as any).electronAPI ? file.name : URL.createObjectURL(file)
        addVideo({
          name: file.name.replace(/\.[^/.]+$/, ''),
          cover: '',
          intro: `本地视频 · ${(file.size / 1024 / 1024).toFixed(1)} MB`,
          sourceId: 'local',
          videoUrl: filePath,
          playList: [
            {
              name: '默认',
              urls: [{ name: '播放', url: filePath }],
            },
          ],
          remarks: '本地文件',
        })
        addLocalFile({
          name: file.name,
          path: filePath,
          type: 'video',
          size: file.size,
        })
        successCount++
      } catch (e) {
        console.error(e)
      }
    }

    if (successCount > 0) {
      showToast(`成功导入 ${successCount} 个视频`, 'success')
      setTab('library')
    } else {
      showToast('未识别到有效的视频文件', 'warning')
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenDetail = async (item: CatVodVideo, sourceId: string) => {
    const source = sources.find((s) => s.id === sourceId) || videoSources[0]
    if (!source) return

    setDetailModal({ item, sourceId })
    setLoadingDetail(true)
    setVideoDetail(null)

    try {
      const vodId = item.vod_id || (item as any).id
      const detail = vodId ? await catvodGetVideoDetail(source, String(vodId)) : null
      setVideoDetail(detail)
    } catch (e) {
      console.error('加载详情失败')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddToLibrary = () => {
    if (!detailModal) return
    const { item, sourceId } = detailModal
    const source = getSourceById(sourceId)
    const baseUrl = source?.url || ''

    const playList = videoDetail ? catvodParsePlayList(videoDetail) : []
    const videoData = catvodVideoToVideo(
      videoDetail ? { ...videoDetail, vod_pic: videoDetail.vod_pic || item.vod_pic } : item,
      sourceId,
      baseUrl,
      playList
    )

    const exists = videos.find(
      (v) => v.name === videoData.name && v.sourceId === sourceId
    )
    if (exists) {
      showToast('该视频已在库中', 'warning')
      return
    }

    addVideo(videoData)
    showToast('已添加到视频库', 'success')
    setDetailModal(null)
  }

  const handlePlayNow = async () => {
    if (!detailModal) return
    const { item, sourceId } = detailModal
    const source = sources.find((s) => s.id === sourceId) || videoSources[0]
    const baseUrl = source?.url || ''

    let playList = videoDetail ? catvodParsePlayList(videoDetail) : []

    if (playList.length === 0 && source) {
      const vodId = item.vod_id || (item as any).id
      if (vodId) {
        const detail = await catvodGetVideoDetail(source, String(vodId))
        if (detail) {
          playList = catvodParsePlayList(detail)
        }
      }
    }

    const videoForPlay = catvodVideoToVideo(
      videoDetail ? { ...videoDetail, vod_pic: videoDetail.vod_pic || item.vod_pic } : item,
      sourceId,
      baseUrl,
      playList
    )
    addHistory({
      type: 'video',
      itemId: '',
      name: videoForPlay.name,
      cover: videoForPlay.cover,
      progress: 0,
    })
    setCurrentVideo({ ...videoForPlay, id: 'temp_' + Date.now() })
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

  const goToSources = () => {
    setCurrentView('sources')
    navigate('/sources')
  }

  const getSourceById = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId) || currentSourceForDiscover
  }

  const renderVideoCard = (item: CatVodVideo, sourceId: string, index: number) => {
    const source = getSourceById(sourceId)
    const baseUrl = source?.url || ''
    const picUrl = resolveImgUrl(item.vod_pic || '', baseUrl)
    const vodId = item.vod_id || (item as any).id

    return (
    <motion.div
      key={`${sourceId}_${vodId || item.vod_name}_${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02 }}
      className="group"
    >
      <Card hoverable onClick={() => handleOpenDetail(item, sourceId)}>
        <div className="aspect-[2/3] relative bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden rounded-ios-t">
          {picUrl ? (
            <img
              src={picUrl}
              alt={item.vod_name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              onError={(e) => {
                ;(e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ios-gray">
              <Tv2 size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center p-3">
            <Button size="sm" icon={<Play size={14} />} onClick={(e) => { e.stopPropagation(); handleOpenDetail(item, sourceId) }}>
              播放
            </Button>
          </div>
          {item.vod_remarks && (
            <div className="absolute top-2 right-2 bg-ios-blue/90 text-white text-xs px-2 py-0.5 rounded-full">
              {truncate(item.vod_remarks, 12)}
            </div>
          )}
          {item.vod_score && Number(item.vod_score) > 0 && (
            <div className="absolute top-2 left-2 bg-ios-orange/90 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={10} className="fill-current" />
              {item.vod_score}
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm text-black dark:text-white truncate">{item.vod_name || (item as any).name || '未知'}</h3>
          <div className="flex items-center gap-2 mt-1 text-xs text-ios-gray">
            {item.vod_year && (
              <span className="flex items-center gap-1"><Calendar size={10} />{item.vod_year}</span>
            )}
            {item.vod_area && <span className="flex items-center gap-1"><MapPin size={10} />{item.vod_area}</span>}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-ios-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
            <PlaySquare size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">视频中心</h1>
            <p className="text-ios-gray text-sm">
              {videoSources.length} 个数据源 · {videos.length} 个本地视频
            </p>
          </div>
        </div>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as TabType)}
          options={[
            { value: 'library', label: '我的视频库', icon: <Film size={16} /> },
            { value: 'discover', label: '发现', icon: <Search size={16} /> },
          ]}
        />
      </div>

      {tab === 'library' && (
        <>
          <div className="flex gap-3">
            <Input
              placeholder="搜索视频库..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              className="flex-1"
            />
            <Button variant="secondary" icon={<Plus size={18} />} onClick={handleImportLocalVideo}>
              导入本地视频
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mkv,.avi,.mov,.webm,.flv,.wmv,.m4v"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
            </Button>
          </div>

          {filteredVideos.length === 0 ? (
            <EmptyState
              icon={<Film size={48} />}
              title="视频库为空"
              description="导入本地视频，或去发现页面搜索精彩内容"
              action={
                <div className="flex gap-2">
                  <Button onClick={handleImportLocalVideo} icon={<Plus size={16} />}>
                    导入本地视频
                  </Button>
                  <Button variant="secondary" onClick={() => setTab('discover')}>
                    去发现
                  </Button>
                </div>
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-5 gap-4">
              {filteredVideos.map((video, index) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="group"
                >
                  <Card hoverable onClick={() => handlePlayVideo(video)}>
                    <div className="aspect-[2/3] relative bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden rounded-ios-t">
                      {video.cover ? (
                        <img src={video.cover} alt={video.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ios-gray">
                          <Tv2 size={48} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play size={40} className="text-white" />
                      </div>
                      {video.remarks && (
                        <div className="absolute top-2 right-2 bg-ios-blue/90 text-white text-xs px-2 py-0.5 rounded-full">
                          {truncate(video.remarks, 10)}
                        </div>
                      )}
                    </div>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm text-black dark:text-white truncate">{video.name}</h3>
                          {video.year && <p className="text-xs text-ios-gray mt-1">{video.year}</p>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 w-8 h-8 opacity-0 group-hover:opacity-100 text-ios-red hover:text-ios-red"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeVideo(video.id)
                            showToast('已从视频库移除', 'success')
                          }}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredVideos.map((video) => (
                <Card key={video.id} hoverable onClick={() => handlePlayVideo(video)}>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-20 h-28 rounded-ios flex-shrink-0 bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden">
                      {video.cover ? (
                        <img src={video.cover} alt={video.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ios-gray">
                          <Tv2 size={28} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-black dark:text-white">{video.name}</h3>
                      <p className="text-sm text-ios-gray mt-1 line-clamp-2">{video.intro}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-ios-gray">
                        {video.year && <span>{video.year}</span>}
                        {video.area && <span>{video.area}</span>}
                        {video.remarks && <span className="text-ios-blue">{video.remarks}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" icon={<Play size={14} />}>播放</Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-ios-red"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeVideo(video.id)
                          showToast('已移除', 'success')
                        }}
                        icon={<Trash2 size={14} />}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'discover' && (
        <>
          <div className="flex gap-3 items-start flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="搜索电影、电视剧、动漫..."
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
              {videoSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? '搜索中...' : '搜索'}
            </Button>
            {videoSources.length === 0 && (
              <Button variant="secondary" onClick={goToSources} icon={<Plus size={16} />}>
                添加数据源
              </Button>
            )}
          </div>

          {searchResults.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-black dark:text-white">搜索结果 ({searchResults.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setSearchResults([])}>
                  <X size={14} /> 清空
                </Button>
              </div>
              <div className="grid grid-cols-5 gap-4">
                {searchResults.map((item, index) => renderVideoCard(item, (item as any)._sourceId || currentSourceForDiscover?.id || '', index))}
              </div>
            </div>
          ) : (
            <>
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-ios">
                  <button
                    onClick={() => setSelectedCategory('home')}
                    className={[
                      'px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0',
                      selectedCategory === 'home'
                        ? 'bg-ios-blue text-white shadow-sm'
                        : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-black/70 dark:text-white/70 hover:bg-ios-gray5 dark:hover:bg-[#38383A]'
                    ].join(' ')}
                  >
                    🏠 首页推荐
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.type_id}
                      onClick={() => setSelectedCategory(cat.type_id)}
                      className={[
                        'px-4 py-2 rounded-full whitespace-nowrap text-sm font-medium transition-all flex-shrink-0',
                        selectedCategory === cat.type_id
                          ? 'bg-ios-blue text-white shadow-sm'
                          : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-black/70 dark:text-white/70 hover:bg-ios-gray5 dark:hover:bg-[#38383A]'
                      ].join(' ')}
                    >
                      {cat.type_name}
                    </button>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => { loadCategories(); loadHomeContent() }}>
                    <RefreshCw size={14} /> 刷新
                  </Button>
                </div>
              )}

              {loadingHome && selectedCategory === 'home' ? (
                <div className="flex flex-col items-center py-20">
                  <Spinner size="lg" />
                  <p className="mt-4 text-ios-gray">正在加载首页内容...</p>
                </div>
              ) : videoSources.length === 0 ? (
                <EmptyState
                  icon={<Film size={48} />}
                  title="还没有视频数据源"
                  description="先添加CatVod或TVBox数据源，发现海量影视内容"
                  action={
                    <Button onClick={goToSources} icon={<Plus size={16} />}>
                      去添加数据源
                    </Button>
                  }
                />
              ) : selectedCategory === 'home' ? (
                Object.keys(homeVideos).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(homeVideos).map(([key, list]) => (
                      <section key={key}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg text-black dark:text-white flex items-center gap-2">
                            <PlaySquare size={18} className="text-ios-blue" />
                            {key.split('_').slice(1).join('_')}
                          </h3>
                          <Button variant="ghost" size="sm" className="text-ios-blue">
                            查看全部 <ChevronRight size={14} />
                          </Button>
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                          {list.slice(0, 6).map((item, index) =>
                            renderVideoCard(item, key.split('_')[0], index)
                          )}
                        </div>
                      </section>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<RefreshCw size={48} />}
                    title="暂无数据"
                    description="数据源可能没有首页内容，试试搜索或切换其他数据源"
                    action={
                      <Button onClick={loadHomeContent} icon={<RefreshCw size={16} />}>
                        重新加载
                      </Button>
                    }
                  />
                )
              ) : (
                <div className="space-y-4">
                  {loadingCategory ? (
                    <div className="flex items-center py-10"><Spinner /> <span className="ml-3 text-ios-gray">加载中...</span></div>
                  ) : (
                    <>
                      <div className="grid grid-cols-6 gap-4">
                        {categoryVideos.map((item, index) =>
                          renderVideoCard(item, currentSourceForDiscover?.id || '', index)
                        )}
                      </div>
                      {categoryVideos.length > 0 && hasMore && !loadingCategory && (
                        <div className="flex justify-center pt-4">
                          <Button variant="secondary" onClick={() => loadCategoryContent(selectedCategory, page + 1)}>
                            加载更多
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      <Modal
        isOpen={!!detailModal}
        onClose={() => setDetailModal(null)}
        title=""
        size="xl"
      >
        {detailModal && (
          <div>
            {loadingDetail ? (
              <div className="flex flex-col items-center py-16">
                <Spinner size="lg" />
                <p className="mt-4 text-ios-gray">正在加载详情...</p>
              </div>
            ) : (
              <div className="flex gap-6">
                <div className="w-48 flex-shrink-0">
                  <div className="aspect-[2/3] rounded-ios bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden">
                    {(videoDetail?.vod_pic || detailModal.item.vod_pic) ? (
                      <img
                        src={resolveImgUrl(videoDetail?.vod_pic || detailModal.item.vod_pic || '', getSourceById(detailModal.sourceId)?.url || '')}
                        alt={detailModal.item.vod_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ios-gray">
                        <Tv2 size={48} />
                      </div>
                    )}
                  </div>
                  {videoDetail?.vod_score && Number(videoDetail.vod_score) > 0 && (
                    <div className="mt-3 flex items-center gap-2 justify-center">
                      <Star size={16} className="text-ios-orange fill-current" />
                      <span className="font-bold text-lg text-ios-orange">{videoDetail.vod_score}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-black dark:text-white">{detailModal.item.vod_name}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-ios-gray flex-wrap">
                    {videoDetail?.vod_year || detailModal.item.vod_year ? (
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />{videoDetail?.vod_year || detailModal.item.vod_year}
                      </span>
                    ) : null}
                    {videoDetail?.vod_area || detailModal.item.vod_area ? (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />{videoDetail?.vod_area || detailModal.item.vod_area}
                      </span>
                    ) : null}
                    {videoDetail?.vod_director || detailModal.item.vod_director ? (
                      <span className="flex items-center gap-1">
                        <User size={14} />{truncate(videoDetail?.vod_director || detailModal.item.vod_director || '', 20)}
                      </span>
                    ) : null}
                    {(videoDetail?.vod_remarks || detailModal.item.vod_remarks) && (
                      <span className="text-ios-blue">{videoDetail?.vod_remarks || detailModal.item.vod_remarks}</span>
                    )}
                  </div>
                  {(videoDetail?.vod_actor || detailModal.item.vod_actor) && (
                    <div className="mt-3 flex items-start gap-2 text-sm">
                      <Users size={14} className="text-ios-gray mt-0.5 flex-shrink-0" />
                      <span className="text-ios-gray line-clamp-2">
                        {videoDetail?.vod_actor || detailModal.item.vod_actor}
                      </span>
                    </div>
                  )}
                  {(videoDetail?.vod_content || detailModal.item.vod_content) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-black dark:text-white mb-2 flex items-center gap-2">
                        <Info size={14} className="text-ios-blue" />简介
                      </h4>
                      <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed line-clamp-5">
                        {videoDetail?.vod_content || detailModal.item.vod_content}
                      </p>
                    </div>
                  )}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-black dark:text-white mb-3">播放源</h4>
                    {videoDetail ? (
                      <div className="space-y-3 max-h-60 overflow-y-auto scrollbar-ios">
                        {catvodParsePlayList(videoDetail).length > 0 ? (
                          catvodParsePlayList(videoDetail).map((src, idx) => (
                            <div key={idx} className="p-3 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-sm">{src.name}</span>
                                <span className="text-xs text-ios-gray">{src.urls.length} 集</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {src.urls.slice(0, 20).map((u, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 text-xs bg-white dark:bg-[#1C1C1E] rounded text-black/70 dark:text-white/70"
                                  >
                                    {u.name}
                                  </span>
                                ))}
                                {src.urls.length > 20 && (
                                  <span className="px-2 py-1 text-xs bg-white dark:bg-[#1C1C1E] rounded text-ios-gray">
                                    +{src.urls.length - 20}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-ios-gray">暂无播放地址</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios text-sm text-ios-gray">
                        暂无详细信息，可直接播放
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        <ModalFooter>
          <div className="flex justify-end gap-2 w-full">
            <Button variant="secondary" onClick={() => setDetailModal(null)}>
              关闭
            </Button>
            <Button variant="secondary" onClick={handleAddToLibrary} icon={<BookMarked size={16} />}>
              加入视频库
            </Button>
            <Button onClick={handlePlayNow} icon={<Play size={16} />}>
              立即播放
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  )
}
