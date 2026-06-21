import React, { useRef } from 'react'
import {
  Home,
  BookOpen,
  PlaySquare,
  Tv,
  Database,
  Settings,
  History,
  BookMarked,
  Folder,
  Plus,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/utils'
import { useToast } from '@/components/ui/Toast'
import { parseSourceContent } from '@/utils/parser'
import { parseLocalNovel } from '@/utils/parser'

type ViewType = 'home' | 'books' | 'videos' | 'live' | 'sources' | 'settings'

const navItems: { id: ViewType; label: string; icon: React.ReactNode }[] = [
  { id: 'home', label: '首页', icon: <Home size={20} /> },
  { id: 'books', label: '小说', icon: <BookOpen size={20} /> },
  { id: 'videos', label: '视频', icon: <PlaySquare size={20} /> },
  { id: 'live', label: '直播', icon: <Tv size={20} /> },
  { id: 'sources', label: '数据源', icon: <Database size={20} /> },
  { id: 'settings', label: '设置', icon: <Settings size={20} /> },
]

export const Sidebar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    books,
    videos,
    liveChannels,
    sources,
    history,
    addBook,
    addVideo,
    addLiveChannel,
    importSources,
    setCurrentBook,
    setCurrentVideo,
    setCurrentLiveChannel,
    addHistory,
    readProgress,
  } = useAppStore()
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stats = {
    books: books.length,
    videos: videos.length,
    live: liveChannels.length,
    sources: sources.length,
    history: history.length,
  }

  const recentHistory = history.slice(0, 3)

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    let successCount = 0
    let failCount = 0

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      try {
        const content = await file.text()
        const nameLower = file.name.toLowerCase()

        if (nameLower.endsWith('.txt') || nameLower.endsWith('.epub')) {
          const parsed = parseLocalNovel(file.name, content)
          if (parsed.chapters.length > 0) {
            const exists = books.some(b => b.name === parsed.name && b.author === parsed.author)
            if (!exists) {
              addBook({
                name: parsed.name,
                author: parsed.author,
                cover: '',
                intro: `本地导入：${file.name} · 共 ${parsed.chapters.length} 章`,
                sourceId: 'local',
                bookUrl: '',
                chapters: parsed.chapters,
              })
              successCount++
            } else {
              failCount++
            }
          } else {
            addVideo({
              name: file.name.replace(/\.[^/.]+$/, ''),
              cover: '',
              intro: '本地视频文件',
              sourceId: 'local',
              videoUrl: file.name,
              playList: [],
              category: '本地视频',
            })
            successCount++
          }
        } else if (nameLower.endsWith('.m3u') || nameLower.endsWith('.m3u8') || nameLower.endsWith('.json')) {
          const result = await parseSourceContent(file.name, content)
          if (result.liveChannels.length > 0) {
            result.liveChannels.forEach(channel => {
              const exists = liveChannels.some(c => c.name === channel.name && c.url === channel.url)
              if (!exists) {
                addLiveChannel(channel)
              }
            })
            successCount += result.liveChannels.length
          }
          if (result.sources.length > 0) {
            importSources(result.sources)
            successCount += result.sources.length
          }
          if (result.liveChannels.length === 0 && result.sources.length === 0) {
            failCount++
          }
        } else {
          failCount++
        }
      } catch (error) {
        console.error(`处理文件 ${file.name} 失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      showToast(`成功导入 ${successCount} 项${failCount > 0 ? `，${failCount} 项失败` : ''}`, 'success')
    } else if (failCount > 0) {
      showToast(`导入失败，${failCount} 个文件无法识别`, 'error')
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleHistoryClick = (item: any) => {
    if (item.type === 'novel') {
      const book = books.find(b => b.id === item.itemId)
      if (book) {
        addHistory({
          type: 'novel',
          itemId: book.id,
          name: book.name,
          cover: book.cover,
          progress: readProgress[book.id]?.percentage || 0,
        })
        setCurrentBook(book)
      } else {
        showToast('书籍不存在，可能已被删除', 'warning')
      }
    } else if (item.type === 'video') {
      const video = videos.find(v => v.id === item.itemId)
      if (video) {
        setCurrentVideo(video)
      } else {
        showToast('视频不存在，可能已被删除', 'warning')
      }
    } else if (item.type === 'live') {
      const channel = liveChannels.find(c => c.id === item.itemId)
      if (channel) {
        setCurrentLiveChannel(channel)
      } else {
        showToast('频道不存在，可能已被删除', 'warning')
      }
    }
  }

  return (
    <aside className="w-64 h-full flex flex-col bg-ios-grouped-background dark:bg-ios-grouped-backgroundDark border-r border-ios-gray5 dark:border-[#38383A]">
      <div className="h-14 flex items-center px-5 title-bar-drag">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-ios-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <BookMarked size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-semibold text-base text-black dark:text-white leading-tight">ReaderHub</h1>
            <p className="text-xs text-ios-gray">阅读聚合</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-ios py-2 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentView(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-ios text-left transition-all duration-150 group',
                currentView === item.id
                  ? 'bg-ios-blue text-white shadow-sm'
                  : 'text-black/70 dark:text-white/70 hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E]'
              )}
            >
              <span className={cn(currentView === item.id ? 'text-white' : 'text-ios-blue group-hover:text-ios-blue')}>
                {item.icon}
              </span>
              <span className="font-medium flex-1">{item.label}</span>
              {stats[item.id as keyof typeof stats] > 0 && (
                <span
                  className={cn(
                    'text-xs font-medium px-2 py-0.5 rounded-full',
                    currentView === item.id
                      ? 'bg-white/20 text-white'
                      : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-ios-gray'
                  )}
                >
                  {stats[item.id as keyof typeof stats]}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-6 px-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-medium text-ios-gray uppercase tracking-wider">最近阅读</h3>
            <span className="text-xs text-ios-gray">{stats.history}</span>
          </div>
          <div className="space-y-1">
            {recentHistory.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <History size={24} className="mx-auto text-ios-gray3 mb-2" />
                <p className="text-xs text-ios-gray">暂无阅读记录</p>
              </div>
            ) : (
              recentHistory.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleHistoryClick(item)}
                  className={cn(
                    'w-full flex items-center gap-2 px-2 py-2 rounded-ios text-left transition-all',
                    'hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] cursor-pointer'
                  )}
                >
                  <div className="w-10 h-10 rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E] flex-shrink-0">
                    {item.cover ? (
                      <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ios-gray">
                        {item.type === 'novel' && <BookOpen size={18} />}
                        {item.type === 'video' && <PlaySquare size={18} />}
                        {item.type === 'live' && <Tv size={18} />}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black dark:text-white truncate">{item.name}</p>
                    <p className="text-xs text-ios-gray">
                      {item.progress > 0 ? `已读 ${item.progress.toFixed(0)}%` : '继续阅读'}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-6 px-3">
          <h3 className="text-xs font-medium text-ios-gray uppercase tracking-wider mb-2">本地文件</h3>
          <button
            onClick={handleImportClick}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-ios text-left transition-all hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-ios-blue cursor-pointer"
          >
            <Folder size={20} />
            <span className="font-medium">导入本地文件</span>
            <Plus size={16} className="ml-auto" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".txt,.epub,.m3u,.m3u8,.json,.mp4,.mkv,.avi,.mov"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      </div>

      <div className="p-3 border-t border-ios-gray5 dark:border-[#38383A]">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center text-white text-sm font-semibold">
            R
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-black dark:text-white truncate">ReaderHub</p>
            <p className="text-xs text-ios-gray">v1.0.0</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
