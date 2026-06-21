import React, { useState, useRef, useEffect } from 'react'
import { BookOpen, Plus, Search, Filter, Grid3X3, List, BookMarked, Trash2, Play, ChevronRight, X, RefreshCw, Calendar, User } from 'lucide-react'
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
import { truncate, formatDate, generateId } from '@/utils'
import { parseLocalNovel } from '@/utils/parser'
import {
  catvodGetCategories,
  catvodGetHomeContent,
  catvodGetCategoryContent,
  catvodSearch,
  catvodGetBookDetail,
  catvodBookToBook,
  type CatVodCategory,
  type CatVodBook,
} from '@/services/catvod'
import { motion } from 'framer-motion'

type ViewMode = 'grid' | 'list'
type TabType = 'shelf' | 'discover'

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

export const BooksPage: React.FC = () => {
  const navigate = useNavigate()
  const {
    books,
    sources,
    addBook,
    removeBook,
    setCurrentBook,
    addHistory,
    readProgress,
    setCurrentView,
    addLocalFile,
  } = useAppStore()
  const { showToast } = useToast()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [tab, setTab] = useState<TabType>('shelf')
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [detailModal, setDetailModal] = useState<any>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<CatVodCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('home')
  const [homeBooks, setHomeBooks] = useState<{ [key: string]: any[] }>({})
  const [categoryBooks, setCategoryBooks] = useState<any[]>([])
  const [loadingHome, setLoadingHome] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const novelSources = sources.filter(s =>
    (s.type === 'novel' || s.type === 'mixed') &&
    (s.config?.apiType === 'catvod' || s.config?.apiType === 'yuedu' || s.config?.apiType === 'custom' || !s.config?.apiType)
  )
  const enabledNovelSources = novelSources.filter(s => s.enabled !== false)

  const filteredBooks = books.filter(book =>
    book.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const currentSourceForDiscover =
    selectedSource === 'all'
      ? enabledNovelSources[0]
      : enabledNovelSources.find((s) => s.id === selectedSource)

  const getSourceById = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId) || currentSourceForDiscover
  }

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
      const allHome: { [key: string]: any[] } = {}
      const activeSources = selectedSource === 'all' ? enabledNovelSources.slice(0, 3) : [currentSourceForDiscover]

      for (const source of activeSources) {
        const result = await catvodGetHomeContent(source)
        const list = result.books.length > 0 ? result.books : result.list
        if (list.length > 0) {
          allHome[`${source.id}_推荐`] = list.slice(0, 12)
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
      setHomeBooks(allHome)
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
        setCategoryBooks(result.list)
      } else {
        setCategoryBooks((prev) => [...prev, ...result.list])
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

    if (enabledNovelSources.length === 0) {
      showToast('请先添加并启用小说数据源', 'warning')
      return
    }

    setSearching(true)
    setSearchResults([])

    try {
      const sourcesToSearch = selectedSource === 'all'
        ? enabledNovelSources
        : enabledNovelSources.filter(s => s.id === selectedSource)

      const results: any[] = []
      for (const source of sourcesToSearch.slice(0, 5)) {
        try {
          const list = await catvodSearch(source, searchKeyword)
          list.forEach((item: any) => {
            results.push({ ...item, _sourceId: source.id, _sourceName: source.name })
          })
        } catch (e) {
          console.error(`搜索源 ${source.name} 失败`)
        }
      }

      setSearchResults(results)
      if (results.length === 0) {
        showToast('未找到相关书籍', 'info')
      } else {
        showToast(`找到 ${results.length} 本相关书籍`, 'success')
      }
    } catch (error) {
      showToast(`搜索失败: ${(error as Error).message}`, 'error')
    } finally {
      setSearching(false)
    }
  }

  const handleViewDetail = async (item: any, sourceId: string) => {
    const source = getSourceById(sourceId)
    if (!source) return

    setDetailModal({ item, sourceId })
    setLoadingDetail(true)

    try {
      const bookId = item.book_id || item.vod_id || (item as any).id
      if (bookId) {
        const { book: detailBook, chapters } = await catvodGetBookDetail(source, String(bookId))
        if (detailBook) {
          setDetailModal({ item: detailBook, sourceId, chapters })
        }
      }
    } catch (e) {
      console.error('加载详情失败')
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddToShelf = () => {
    if (!detailModal) return
    const { item, sourceId } = detailModal
    const source = getSourceById(sourceId)
    const baseUrl = source?.url || ''

    const chapters = detailModal.chapters?.map((c: any, idx: number) => ({
      id: c.chapter_id || `${item.book_id || item.id}_${idx}`,
      name: c.chapter_name || c.name || `第${idx + 1}章`,
      url: c.url || c.chapter_id || '',
      content: c.content || '',
    })) || []

    const bookData = catvodBookToBook(item, sourceId, baseUrl, chapters)

    const exists = books.some(b =>
      b.name === bookData.name && b.author === bookData.author
    )
    if (exists) {
      showToast('该书已在书架中', 'warning')
      return
    }

    addBook(bookData)
    showToast('已添加到书架', 'success')
    setDetailModal(null)
  }

  const handleReadNow = async () => {
    if (!detailModal) return
    const { item, sourceId } = detailModal
    const source = getSourceById(sourceId)
    const baseUrl = source?.url || ''

    let chapters: any[] = detailModal.chapters || []

    if (chapters.length === 0 && source) {
      const bookId = item.book_id || item.vod_id || (item as any).id
      if (bookId) {
        const result = await catvodGetBookDetail(source, String(bookId))
        chapters = result.chapters
      }
    }

    const bookForRead = catvodBookToBook(item, sourceId, baseUrl, chapters)
    addHistory({
      type: 'novel',
      itemId: '',
      name: bookForRead.name,
      cover: bookForRead.cover,
      progress: 0,
    })
    setCurrentBook({ ...bookForRead, id: 'temp_' + Date.now() })
  }

  const handleReadBook = (book: any) => {
    addHistory({
      type: 'novel',
      itemId: book.id,
      name: book.name,
      cover: book.cover,
      progress: readProgress[book.id]?.percentage || 0,
    })
    setCurrentBook(book)
  }

  const handleImportLocalNovel = () => {
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
        if (!file.name.toLowerCase().endsWith('.txt') && !file.name.toLowerCase().endsWith('.epub')) {
          failCount++
          continue
        }

        const content = await file.text()
        const parsed = parseLocalNovel(file.name, content)

        if (parsed.chapters.length === 0) {
          failCount++
          continue
        }

        const exists = books.some(b => b.name === parsed.name && b.author === parsed.author)
        if (exists) {
          failCount++
          continue
        }

        const filePath = (window as any).electronAPI ? file.name : URL.createObjectURL(file)
        addBook({
          name: parsed.name,
          author: parsed.author,
          cover: '',
          intro: `本地导入：${file.name} · 共 ${parsed.chapters.length} 章`,
          sourceId: 'local',
          bookUrl: '',
          chapters: parsed.chapters,
        })
        addLocalFile({
          name: file.name,
          path: filePath,
          type: 'novel',
          size: file.size,
        })

        successCount++
      } catch (error) {
        console.error(`导入文件 ${file.name} 失败:`, error)
        failCount++
      }
    }

    if (successCount > 0) {
      showToast(`成功导入 ${successCount} 本小说${failCount > 0 ? `，${failCount} 本失败` : ''}`, 'success')
    } else if (failCount > 0) {
      showToast(`导入失败，${failCount} 个文件无法识别或已存在`, 'error')
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const goToSources = () => {
    setCurrentView('sources')
    navigate('/sources')
  }

  const renderBookCard = (item: any, sourceId: string, index: number) => {
    const source = getSourceById(sourceId)
    const baseUrl = source?.url || ''
    const picUrl = resolveImgUrl(item.book_pic || item.vod_pic || item.cover || '', baseUrl)
    const bookName = item.book_name || item.vod_name || item.name || item.title || '未知'
    const bookAuthor = item.book_author || item.vod_director || item.author || '未知'

    return (
    <motion.div
      key={`${sourceId}_${item.book_id || item.vod_id || item.id || bookName}_${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6) }}
      className="group"
    >
      <Card hoverable onClick={() => handleViewDetail(item, sourceId)}>
        <div className="aspect-[3/4] relative bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden">
          {picUrl ? (
            <img
              src={picUrl}
              alt={bookName}
              className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ios-gray">
              <BookOpen size={48} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end justify-center p-3">
            <Button size="sm" icon={<Play size={14} />} onClick={(e) => { e.stopPropagation(); handleViewDetail(item, sourceId) }}>
              阅读
            </Button>
          </div>
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-sm text-black dark:text-white truncate">{bookName}</h3>
          <p className="text-xs text-ios-gray mt-1 truncate">{bookAuthor}</p>
        </CardContent>
      </Card>
    </motion.div>
  )
}

  const getDetailItem = () => detailModal?.item || detailModal
  const getDetailSourceId = () => detailModal?.sourceId || ''

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-ios-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md">
            <BookOpen size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-black dark:text-white">阅读中心</h1>
            <p className="text-ios-gray text-sm">
              {enabledNovelSources.length} 个数据源 · {books.length} 本书
            </p>
          </div>
        </div>
        <SegmentedControl
          value={tab}
          onChange={(v) => setTab(v as TabType)}
          options={[
            { value: 'shelf', label: '我的书架', icon: <BookMarked size={16} /> },
            { value: 'discover', label: '发现', icon: <Search size={16} /> },
          ]}
        />
      </div>

      {tab === 'shelf' && (
        <>
          <div className="flex gap-3">
            <Input
              placeholder="搜索书架..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              className="flex-1"
            />
            <Button variant="secondary" icon={<Plus size={18} />} onClick={handleImportLocalNovel}>
              导入本地小说
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.epub"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="ghost" size="sm" onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}>
              {viewMode === 'grid' ? <List size={18} /> : <Grid3X3 size={18} />}
            </Button>
          </div>

          {filteredBooks.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={48} />}
              title="书架空空如也"
              description="去发现页面搜索喜欢的小说，或者导入本地小说"
              action={
                <div className="flex gap-2">
                  <Button onClick={handleImportLocalNovel} icon={<Plus size={16} />}>
                    导入本地小说
                  </Button>
                  <Button variant="secondary" onClick={() => setTab('discover')}>
                    去发现
                  </Button>
                </div>
              }
            />
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.05, 0.6) }}
                  className="group"
                >
                  <Card hoverable onClick={() => handleReadBook(book)}>
                    <div className="aspect-[3/4] relative bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden">
                      {book.cover ? (
                        <img src={book.cover} alt={book.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-ios-gray">
                          <BookOpen size={48} />
                        </div>
                      )}
                      {readProgress[book.id] && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm p-2">
                          <div className="w-full bg-white/30 rounded-full h-1">
                            <div
                              className="bg-ios-green h-full rounded-full"
                              style={{ width: `${readProgress[book.id].percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-white mt-1">
                            {readProgress[book.id].percentage.toFixed(0)}%
                          </p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Play size={32} className="text-white" />
                      </div>
                    </div>
                    <CardContent className="p-3">
                      <h3 className="font-medium text-sm text-black dark:text-white truncate">{book.name}</h3>
                      <p className="text-xs text-ios-gray truncate mt-1">{book.author}</p>
                    </CardContent>
                  </Card>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeBook(book.id)
                      showToast('已从书架移除', 'success')
                    }}
                    className="mt-2 w-full p-2 text-ios-red text-sm opacity-0 group-hover:opacity-100 transition-all hover:bg-ios-red/10 rounded-ios flex items-center justify-center gap-1"
                  >
                    <Trash2 size={16} />
                    移除
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBooks.map((book, index) => (
                <motion.div
                  key={book.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.5) }}
                >
                  <Card hoverable onClick={() => handleReadBook(book)}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-16 h-20 rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E] flex-shrink-0">
                        {book.cover ? (
                          <img src={book.cover} alt={book.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ios-gray">
                            <BookOpen size={24} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-black dark:text-white">{book.name}</h3>
                        <p className="text-sm text-ios-gray">{book.author}</p>
                        <p className="text-sm text-ios-gray mt-1 line-clamp-2">
                          {truncate(book.intro, 100)}
                        </p>
                        {readProgress[book.id] && (
                          <div className="mt-2 flex items-center gap-3">
                            <div className="flex-1">
                              <div className="w-full bg-ios-gray5 dark:bg-[#38383A] rounded-full h-1.5">
                                <div
                                  className="bg-ios-green h-full rounded-full"
                                  style={{ width: `${readProgress[book.id].percentage}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-xs text-ios-gray">
                              {readProgress[book.id].percentage.toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => handleReadBook(book)} icon={<Play size={16} />}>
                          阅读
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-ios-red"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeBook(book.id)
                            showToast('已移除', 'success')
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
        </>
      )}

      {tab === 'discover' && (
        <>
          <div className="flex gap-3 items-start flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="搜索书名、作者..."
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
              {enabledNovelSources.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? '搜索中...' : '搜索'}
            </Button>
            {enabledNovelSources.length === 0 && (
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
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {searchResults.map((item, index) => renderBookCard(item, (item as any)._sourceId || currentSourceForDiscover?.id || '', index))}
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
                        ? 'bg-ios-green text-white shadow-sm'
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
                          ? 'bg-ios-green text-white shadow-sm'
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
              ) : enabledNovelSources.length === 0 ? (
                <EmptyState
                  icon={<BookOpen size={48} />}
                  title="还没有小说数据源"
                  description="先添加CatVod或阅读APP格式的数据源，发现海量小说内容"
                  action={
                    <Button onClick={goToSources} icon={<Plus size={16} />}>
                      去添加数据源
                    </Button>
                  }
                />
              ) : selectedCategory === 'home' ? (
                Object.keys(homeBooks).length > 0 ? (
                  <div className="space-y-8">
                    {Object.entries(homeBooks).map(([key, list]) => (
                      <section key={key}>
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold text-lg text-black dark:text-white flex items-center gap-2">
                            <BookOpen size={18} className="text-ios-green" />
                            {key.split('_').slice(1).join('_')}
                          </h3>
                          <Button variant="ghost" size="sm" className="text-ios-green">
                            查看全部 <ChevronRight size={14} />
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                          {list.slice(0, 6).map((item, index) =>
                            renderBookCard(item, key.split('_')[0], index)
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                        {categoryBooks.map((item, index) =>
                          renderBookCard(item, currentSourceForDiscover?.id || '', index)
                        )}
                      </div>
                      {categoryBooks.length > 0 && hasMore && !loadingCategory && (
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
                <div className="w-40 flex-shrink-0">
                  <div className="aspect-[3/4] rounded-ios bg-ios-gray6 dark:bg-[#2C2C2E] overflow-hidden">
                    {resolveImgUrl(
                      getDetailItem()?.book_pic || getDetailItem()?.vod_pic || getDetailItem()?.cover || '',
                      getSourceById(getDetailSourceId())?.url || ''
                    ) ? (
                      <img
                        src={resolveImgUrl(
                          getDetailItem()?.book_pic || getDetailItem()?.vod_pic || getDetailItem()?.cover || '',
                          getSourceById(getDetailSourceId())?.url || ''
                        )}
                        alt={getDetailItem()?.book_name || getDetailItem()?.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-ios-gray">
                        <BookOpen size={48} />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-black dark:text-white">
                    {getDetailItem()?.book_name || getDetailItem()?.vod_name || getDetailItem()?.name || '未知'}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-ios-gray flex-wrap">
                    {getDetailItem()?.book_author || getDetailItem()?.vod_director || getDetailItem()?.author ? (
                      <span className="flex items-center gap-1">
                        <User size={14} />{getDetailItem()?.book_author || getDetailItem()?.vod_director || getDetailItem()?.author}
                      </span>
                    ) : null}
                    {getDetailItem()?.type_name && (
                      <span>{getDetailItem().type_name}</span>
                    )}
                  </div>
                  {(getDetailItem()?.book_desc || getDetailItem()?.vod_content || getDetailItem()?.intro || getDetailItem()?.desc) && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-black dark:text-white mb-2">简介</h4>
                      <p className="text-sm text-black/70 dark:text-white/70 leading-relaxed line-clamp-5">
                        {getDetailItem()?.book_desc || getDetailItem()?.vod_content || getDetailItem()?.intro || getDetailItem()?.desc}
                      </p>
                    </div>
                  )}
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-black dark:text-white mb-3">章节目录</h4>
                    {detailModal.chapters && detailModal.chapters.length > 0 ? (
                      <div className="space-y-3 max-h-48 overflow-y-auto scrollbar-ios">
                        <div className="p-3 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-sm">共 {detailModal.chapters.length} 章</span>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {detailModal.chapters.slice(0, 30).map((c: any, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-1 text-xs bg-white dark:bg-[#1C1C1E] rounded text-black/70 dark:text-white/70"
                              >
                                {c.chapter_name || c.name || `第${i + 1}章`}
                              </span>
                            ))}
                            {detailModal.chapters.length > 30 && (
                              <span className="px-2 py-1 text-xs bg-white dark:bg-[#1C1C1E] rounded text-ios-gray">
                                +{detailModal.chapters.length - 30}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-ios-gray">暂无章节信息</p>
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
            <Button variant="secondary" onClick={handleAddToShelf} icon={<BookMarked size={16} />}>
              加入书架
            </Button>
            <Button onClick={handleReadNow} icon={<Play size={16} />}>
              立即阅读
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </div>
  )
}
