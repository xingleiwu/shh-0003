import React, { useState, useRef, useEffect } from 'react'
import { BookOpen, Plus, Search, Filter, Grid3X3, List, BookMarked, Trash2, Play, ChevronRight, X } from 'lucide-react'
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

export const BooksPage: React.FC = () => {
  const {
    books,
    sources,
    addBook,
    removeBook,
    setCurrentBook,
    addHistory,
    readProgress,
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
  const [homeBooks, setHomeBooks] = useState<CatVodBook[]>([])
  const [categoryBooks, setCategoryBooks] = useState<CatVodBook[]>([])
  const [loadingHome, setLoadingHome] = useState(false)
  const [loadingCategory, setLoadingCategory] = useState(false)
  const [categoryPage, setCategoryPage] = useState(1)
  const [hasMoreCategory, setHasMoreCategory] = useState(true)
  const [discoverMode, setDiscoverMode] = useState<'home' | 'category' | 'search'>('home')

  const novelSources = sources.filter(s =>
    (s.type === 'novel' || s.type === 'mixed') &&
    (s.config?.apiType === 'catvod' || s.config?.apiType === 'yuedu' || !s.config?.apiType)
  )
  const enabledNovelSources = novelSources.filter(s => s.enabled)

  const filteredBooks = books.filter(book =>
    book.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (tab === 'discover' && categories.length === 0) {
      loadDiscoverHome()
    }
  }, [tab])

  const loadDiscoverHome = async () => {
    if (enabledNovelSources.length === 0) return

    setLoadingHome(true)
    setDiscoverMode('home')
    setSelectedCategory('home')
    try {
      const allCategories: CatVodCategory[] = []
      const allBooks: CatVodBook[] = []
      const seen = new Set<string>()

      for (const source of enabledNovelSources) {
        const result = await catvodGetHomeContent(source)
        result.categories.forEach(cat => {
          const key = `${cat.type_id}_${cat.type_name}`
          if (!seen.has(key)) {
            seen.add(key)
            allCategories.push({ ...cat, _sourceId: source.id } as any)
          }
        })
        result.books.forEach(book => {
          allBooks.push({ ...book, _sourceId: source.id, _sourceName: source.name } as any)
        })
      }

      setCategories([{ type_id: 'home', type_name: '推荐' }, ...allCategories])
      setHomeBooks(allBooks)
    } catch (error) {
      console.error('加载发现页失败:', error)
    } finally {
      setLoadingHome(false)
    }
  }

  const loadCategoryContent = async (categoryId: string) => {
    if (categoryId === 'home') {
      setDiscoverMode('home')
      setSelectedCategory('home')
      return
    }

    setLoadingCategory(true)
    setDiscoverMode('category')
    setSelectedCategory(categoryId)
    setCategoryPage(1)
    setHasMoreCategory(true)
    setCategoryBooks([])

    try {
      const allBooks: CatVodBook[] = []

      for (const source of enabledNovelSources) {
        const result = await catvodGetCategoryContent(source, categoryId, 1)
        result.list.forEach(item => {
          const book = item as any
          allBooks.push({
            book_id: book.book_id || book.vod_id || '',
            book_name: book.book_name || book.vod_name || '',
            book_pic: book.book_pic || book.vod_pic || '',
            book_author: book.book_author || book.vod_director || '',
            book_desc: book.book_desc || book.vod_content || '',
            _sourceId: source.id,
            _sourceName: source.name,
          } as any)
        })
      }

      setCategoryBooks(allBooks)
      if (allBooks.length < 20) setHasMoreCategory(false)
    } catch (error) {
      console.error('加载分类内容失败:', error)
    } finally {
      setLoadingCategory(false)
    }
  }

  const loadMoreCategory = async () => {
    if (!hasMoreCategory || loadingCategory) return
    const nextPage = categoryPage + 1
    setLoadingCategory(true)

    try {
      const allBooks: CatVodBook[] = [...categoryBooks]

      for (const source of enabledNovelSources) {
        const result = await catvodGetCategoryContent(source, selectedCategory, nextPage)
        result.list.forEach(item => {
          const book = item as any
          allBooks.push({
            book_id: book.book_id || book.vod_id || '',
            book_name: book.book_name || book.vod_name || '',
            book_pic: book.book_pic || book.vod_pic || '',
            book_author: book.book_author || book.vod_director || '',
            book_desc: book.book_desc || book.vod_content || '',
            _sourceId: source.id,
            _sourceName: source.name,
          } as any)
        })
      }

      setCategoryBooks(allBooks)
      setCategoryPage(nextPage)
    } catch (error) {
      console.error('加载更多失败:', error)
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
    setDiscoverMode('search')

    try {
      const sourcesToSearch = selectedSource === 'all'
        ? enabledNovelSources
        : enabledNovelSources.filter(s => s.id === selectedSource)

      const results: any[] = []
      const promises = sourcesToSearch.map(async (source) => {
        try {
          const list = await catvodSearch(source, searchKeyword, 1)
          list.forEach((item: any) => {
            results.push({
              book_id: item.book_id || item.vod_id || '',
              book_name: item.book_name || item.vod_name || '',
              book_pic: item.book_pic || item.vod_pic || '',
              book_author: item.book_author || item.vod_director || '',
              book_desc: item.book_desc || item.vod_content || '',
              sourceId: source.id,
              sourceName: source.name,
            })
          })
        } catch (error) {
          console.error(`搜索数据源 ${source.name} 失败:`, error)
        }
      })

      await Promise.all(promises)

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

  const handleViewDetail = async (book: any) => {
    setLoadingDetail(true)
    setDetailModal({ ...book })
    try {
      const sourceId = book._sourceId || book.sourceId
      const source = sources.find(s => s.id === sourceId)
      const bookId = book.book_id || book.bookUrl || book.id

      if (source && bookId) {
        const { book: detailBook, chapters } = await catvodGetBookDetail(source, bookId)
        if (detailBook) {
            setDetailModal((prev: any) => ({
              ...prev,
              ...detailBook,
              chapters,
            }))
          }
      }
    } catch (error) {
      console.error('获取书籍详情失败:', error)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddToShelf = (book: any) => {
    const sourceId = book._sourceId || book.sourceId || 'local'
    const bookUrl = book.book_id || book.bookUrl || ''

    const exists = books.some(b =>
      (b.bookUrl && b.bookUrl === bookUrl) ||
      (b.name === (book.book_name || book.name) && b.author === (book.book_author || book.author || '未知'))
    )
    if (exists) {
      showToast('该书已在书架中', 'warning')
      return
    }

    const chapters = book.chapters?.map((c: any, idx: number) => ({
      id: c.chapter_id || `${bookUrl}_${idx}`,
      name: c.chapter_name || c.name || `第${idx + 1}章`,
      url: c.url || c.chapter_id || '',
      content: c.content || '',
    })) || []

    addBook({
      name: book.book_name || book.name,
      author: book.book_author || book.author || '未知',
      cover: book.book_pic || book.cover || book.coverUrl || '',
      intro: book.book_desc || book.intro || book.desc || '',
      sourceId,
      bookUrl,
      chapters,
      category: book.type_name,
    })
    showToast('已添加到书架', 'success')
    setDetailModal(null)
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

  const handleReadDiscoverBook = async (book: any) => {
    const sourceId = book._sourceId || book.sourceId
    const source = sources.find(s => s.id === sourceId)
    const bookId = book.book_id || book.bookUrl

    let chapters: any[] = []
    if (source && bookId) {
      const result = await catvodGetBookDetail(source, bookId)
      chapters = result.chapters.map((c, idx) => ({
        id: c.chapter_id || `${bookId}_${idx}`,
        name: c.chapter_name,
        url: c.chapter_id,
        content: '',
      }))
    }

    const newBook: any = {
      id: `tmp_${Date.now()}`,
      name: book.book_name || book.name,
      author: book.book_author || book.author || '未知',
      cover: book.book_pic || book.cover || '',
      intro: book.book_desc || book.desc || '',
      sourceId,
      bookUrl: bookId,
      chapters,
      addedAt: Date.now(),
    }

    addHistory({
      type: 'novel',
      itemId: newBook.id,
      name: newBook.name,
      cover: newBook.cover,
      progress: 0,
    })
    setCurrentBook(newBook)
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

  const renderBookCard = (book: any, index: number, onClick: () => void) => (
    <motion.div
      key={`${book._sourceId || book.sourceId || 'local'}-${book.book_id || book.id || book.name}-${index}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.6) }}
    >
      <Card hoverable onClick={onClick}>
        <div className="aspect-[3/4] relative bg-ios-gray6 dark:bg-[#2C2C2E]">
          {book.book_pic || book.cover || book.coverUrl ? (
            <img
              src={book.book_pic || book.cover || book.coverUrl}
              alt={book.book_name || book.name || book.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ios-gray">
              <BookOpen size={48} />
            </div>
          )}
        </div>
        <CardContent className="p-3">
          <h3 className="font-medium text-black dark:text-white truncate">
            {book.book_name || book.name || book.title}
          </h3>
          <p className="text-sm text-ios-gray truncate">{book.book_author || book.author || '未知'}</p>
          {(book._sourceName || book.sourceName) && (
            <p className="text-xs text-ios-blue mt-1">{book._sourceName || book.sourceName}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )

  if (tab === 'discover') {
    return (
      <div className="p-6 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">发现小说</h1>
          <Button variant="secondary" size="sm" icon={<BookMarked size={18} />} onClick={() => setTab('shelf')}>
            我的书架 ({books.length})
          </Button>
        </div>

        <div className="flex gap-3 items-start flex-wrap">
          <div className="flex-1 min-w-64">
            <Input
              placeholder="搜索书名、作者..."
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              leftIcon={<Search size={18} />}
              rightIcon={
                searching ? <Spinner size="sm" /> : undefined
              }
            />
          </div>
          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="ios-input w-48"
          >
            <option value="all">全部数据源</option>
            {novelSources.map(s => (
              <option key={s.id} value={s.id}>{s.name}{!s.enabled ? ' (禁用)' : ''}</option>
            ))}
          </select>
          <Button onClick={handleSearch} disabled={searching}>
            {searching ? '搜索中...' : '搜索'}
          </Button>
          <Button variant="secondary" icon={<Plus size={18} />} onClick={handleImportLocalNovel}>
            导入本地
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.epub"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {enabledNovelSources.length === 0 ? (
          <EmptyState
            icon={<BookOpen size={48} />}
            title="请先添加小说数据源"
            description="前往数据源页面添加CatVod或阅读APP格式的书源"
            action={
              <Button onClick={() => useAppStore.getState().setCurrentView('sources')}>
                去添加
              </Button>
            }
          />
        ) : discoverMode === 'home' ? (
          <div className="space-y-6">
            <div className="bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios p-4 overflow-x-auto scrollbar-ios">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => (
                  <button
                    key={cat.type_id}
                    onClick={() => cat.type_id === 'home' ? loadDiscoverHome() : loadCategoryContent(cat.type_id)}
                    className={[
                      'px-4 py-2 rounded-ios whitespace-nowrap text-sm font-medium transition-all',
                      selectedCategory === cat.type_id
                        ? 'bg-ios-blue text-white'
                        : 'bg-white dark:bg-[#1C1C1E] text-black/70 dark:text-white/70 hover:bg-ios-blue/10 dark:hover:bg-ios-blue/20'
                    ].join(' ')}
                  >
                    {cat.type_name}
                  </button>
                ))}
              </div>
            </div>

            {loadingHome ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner size="lg" />
                <p className="mt-4 text-ios-gray">正在加载推荐内容...</p>
              </div>
            ) : homeBooks.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black dark:text-white">热门推荐</h2>
                  <span className="text-sm text-ios-gray">{homeBooks.length} 本</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {homeBooks.map((book, idx) => renderBookCard(book, idx, () => handleViewDetail(book)))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Search size={48} />}
                title="暂无推荐内容"
                description="尝试切换分类或使用搜索功能"
              />
            )}
          </div>
        ) : discoverMode === 'category' ? (
          <div className="space-y-6">
            <div className="bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios p-4 overflow-x-auto scrollbar-ios">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => (
                  <button
                    key={cat.type_id}
                    onClick={() => cat.type_id === 'home' ? loadDiscoverHome() : loadCategoryContent(cat.type_id)}
                    className={[
                      'px-4 py-2 rounded-ios whitespace-nowrap text-sm font-medium transition-all',
                      selectedCategory === cat.type_id
                        ? 'bg-ios-blue text-white'
                        : 'bg-white dark:bg-[#1C1C1E] text-black/70 dark:text-white/70 hover:bg-ios-blue/10 dark:hover:bg-ios-blue/20'
                    ].join(' ')}
                  >
                    {cat.type_name}
                  </button>
                ))}
              </div>
            </div>

            {loadingCategory && categoryBooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner size="lg" />
                <p className="mt-4 text-ios-gray">正在加载分类内容...</p>
              </div>
            ) : categoryBooks.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black dark:text-white">
                    {categories.find(c => c.type_id === selectedCategory)?.type_name || '分类内容'}
                  </h2>
                  <span className="text-sm text-ios-gray">{categoryBooks.length} 本</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {categoryBooks.map((book, idx) => renderBookCard(book, idx, () => handleViewDetail(book)))}
                </div>
                {hasMoreCategory && (
                  <div className="mt-8 text-center">
                    <Button
                      variant="secondary"
                      onClick={loadMoreCategory}
                      disabled={loadingCategory}
                      icon={loadingCategory ? <Spinner size="sm" /> : <ChevronRight size={18} />}
                    >
                      {loadingCategory ? '加载中...' : '加载更多'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Search size={48} />}
                title="该分类暂无内容"
                description="尝试其他分类或使用搜索"
              />
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios p-4 overflow-x-auto scrollbar-ios">
              <div className="flex gap-2 min-w-max">
                {categories.map((cat) => (
                  <button
                    key={cat.type_id}
                    onClick={() => cat.type_id === 'home' ? loadDiscoverHome() : loadCategoryContent(cat.type_id)}
                    className={[
                      'px-4 py-2 rounded-ios whitespace-nowrap text-sm font-medium transition-all',
                      selectedCategory === cat.type_id
                        ? 'bg-ios-blue text-white'
                        : 'bg-white dark:bg-[#1C1C1E] text-black/70 dark:text-white/70 hover:bg-ios-blue/10 dark:hover:bg-ios-blue/20'
                    ].join(' ')}
                  >
                    {cat.type_name}
                  </button>
                ))}
              </div>
            </div>

            {searching ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Spinner size="lg" />
                <p className="mt-4 text-ios-gray">正在搜索中...</p>
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-black dark:text-white">
                    搜索结果: "{searchKeyword}"
                  </h2>
                  <span className="text-sm text-ios-gray">{searchResults.length} 条</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {searchResults.map((book, idx) => renderBookCard(book, idx, () => handleViewDetail(book)))}
                </div>
              </div>
            ) : (
              <EmptyState
                icon={<Search size={48} />}
                title="没有找到结果"
                description="试试其他关键词"
              />
            )}
          </div>
        )}

        <Modal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          title={loadingDetail ? '加载中...' : detailModal?.book_name || detailModal?.name || detailModal?.title}
          size="lg"
        >
          {loadingDetail && !detailModal?.chapters ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : detailModal && (
            <div className="flex gap-6">
              <div className="w-40 flex-shrink-0">
                <div className="aspect-[3/4] rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E]">
                  {detailModal.book_pic || detailModal.cover || detailModal.coverUrl ? (
                    <img
                      src={detailModal.book_pic || detailModal.cover || detailModal.coverUrl}
                      alt={detailModal.book_name || detailModal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-ios-gray">
                      <BookOpen size={48} />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="text-xl font-bold text-black dark:text-white">
                    {detailModal.book_name || detailModal.name || detailModal.title}
                  </h2>
                  <p className="text-ios-gray mt-1">
                    作者: {detailModal.book_author || detailModal.author || '未知'}
                  </p>
                  <p className="text-sm text-ios-blue mt-1">
                    来源: {detailModal._sourceName || detailModal.sourceName || '未知'}
                  </p>
                  {detailModal.type_name && (
                    <p className="text-xs text-ios-gray mt-1">
                      分类: {detailModal.type_name}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios max-h-40 overflow-y-auto scrollbar-ios">
                  <h4 className="font-medium text-black dark:text-white mb-2">简介</h4>
                  <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-wrap">
                    {detailModal.book_desc || detailModal.intro || detailModal.desc || '暂无简介'}
                  </p>
                </div>

                {detailModal.chapters && detailModal.chapters.length > 0 && (
                  <div>
                    <h4 className="font-medium text-black dark:text-white mb-2">
                      章节列表 ({detailModal.chapters.length}章)
                    </h4>
                    <div className="max-h-40 overflow-y-auto scrollbar-ios space-y-1 border border-ios-gray5 dark:border-[#38383A] rounded-ios p-2">
                      {detailModal.chapters.slice(0, 8).map((c: any, i: number) => (
                        <div key={i} className="text-sm text-ios-gray py-1.5 px-3 rounded hover:bg-ios-gray5 dark:hover:bg-[#38383A]">
                          {c.chapter_name || c.name || `第${i + 1}章`}
                        </div>
                      ))}
                      {detailModal.chapters.length > 8 && (
                        <div className="text-sm text-ios-blue py-1.5 px-3 text-center">
                          ...还有 {detailModal.chapters.length - 8} 章
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <ModalFooter>
                  <Button variant="secondary" onClick={() => setDetailModal(null)}>
                    关闭
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => handleReadDiscoverBook(detailModal)}
                    icon={<Play size={18} />}
                  >
                    立即阅读
                  </Button>
                  <Button onClick={() => handleAddToShelf(detailModal)} icon={<BookMarked size={18} />}>
                    加入书架
                  </Button>
                </ModalFooter>
              </div>
            </div>
          )}
        </Modal>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-black dark:text-white">我的书架</h1>
        <div className="flex items-center gap-3">
          <SegmentedControl
            value={tab}
            onChange={(v) => setTab(v as TabType)}
            options={[
              { value: 'shelf', label: '书架', icon: <BookMarked size={16} /> },
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
          placeholder="搜索书架中的书籍..."
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
      </div>

      {filteredBooks.length === 0 ? (
        <EmptyState
          icon={<BookOpen size={48} />}
          title="书架空空如也"
          description="去发现页面搜索喜欢的小说，或者导入本地小说"
          action={
            <Button onClick={() => setTab('discover')}>
              去发现
            </Button>
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
                <div className="aspect-[3/4] relative bg-ios-gray6 dark:bg-[#2C2C2E]">
                  {book.cover ? (
                    <img
                      src={book.cover}
                      alt={book.name}
                      className="w-full h-full object-cover"
                    />
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
                  <h3 className="font-medium text-black dark:text-white truncate">{book.name}</h3>
                  <p className="text-sm text-ios-gray truncate">{book.author}</p>
                  <p className="text-xs text-ios-gray mt-1">
                    {formatDate(book.addedAt)}
                  </p>
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
              <Card hoverable>
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
                      onClick={() => {
                        removeBook(book.id)
                        showToast('已从书架移除', 'success')
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
