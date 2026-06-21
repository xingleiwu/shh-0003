import React, { useState, useRef } from 'react'
import { BookOpen, Plus, Search, Filter, Grid3X3, List, BookMarked, Trash2, Play } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { Modal, ModalFooter } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { fetchUrl, fetchJson } from '@/utils/http'
import { truncate, formatDate, generateId } from '@/utils'
import { parseLocalNovel } from '@/utils/parser'
import { motion } from 'framer-motion'

type ViewMode = 'grid' | 'list'
type TabType = 'shelf' | 'discover'

export const BooksPage: React.FC = () => {
  const { books, sources, addBook, removeBook, setCurrentBook, addHistory, readProgress } = useAppStore()
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

  const novelSources = sources.filter(s => s.type === 'novel' || s.type === 'mixed')

  const filteredBooks = books.filter(book =>
    book.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
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
        ? novelSources
        : novelSources.filter(s => s.id === selectedSource)

      if (sourcesToSearch.length === 0) {
        showToast('请先添加小说数据源', 'warning')
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

          if (Array.isArray(data)) {
            data.forEach((item: any) => {
              results.push({
                ...item,
                sourceId: source.id,
                sourceName: source.name,
              })
            })
          } else if (data.list && Array.isArray(data.list)) {
            data.list.forEach((item: any) => {
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
    try {
      const source = sources.find(s => s.id === book.sourceId)
      const detailUrl = source?.config?.detailUrl || book.bookUrl || book.url

      if (detailUrl) {
        const data = await fetchJson(detailUrl, source?.config?.headers)
        setDetailModal({ ...book, ...data })
      } else {
        setDetailModal(book)
      }
    } catch (error) {
      setDetailModal(book)
    } finally {
      setLoadingDetail(false)
    }
  }

  const handleAddToShelf = (book: any) => {
    const exists = books.find(b => b.bookUrl === (book.bookUrl || book.url))
    if (exists) {
      showToast('该书已在书架中', 'warning')
      return
    }

    addBook({
      name: book.name || book.title,
      author: book.author || '未知',
      cover: book.cover || book.coverUrl || '',
      intro: book.intro || book.desc || '',
      sourceId: book.sourceId,
      bookUrl: book.bookUrl || book.url || '',
      chapters: book.chapters || [],
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

  if (tab === 'discover') {
    return (
      <div className="p-6 space-y-6 animate-fadeIn">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">发现小说</h1>
          <Button variant="secondary" size="sm" icon={<BookMarked size={18} />} onClick={() => setTab('shelf')}>
            我的书架 ({books.length})
          </Button>
        </div>

        <div className="flex gap-3 items-start">
          <div className="flex-1">
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
            {searchResults.map((book, index) => (
              <motion.div
                key={`${book.sourceId}-${book.id || book.name}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hoverable onClick={() => handleViewDetail(book)}>
                  <div className="aspect-[3/4] relative bg-ios-gray6 dark:bg-[#2C2C2E]">
                    {book.cover || book.coverUrl ? (
                      <img
                        src={book.cover || book.coverUrl}
                        alt={book.name || book.title}
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
                      {book.name || book.title}
                    </h3>
                    <p className="text-sm text-ios-gray truncate">{book.author || '未知'}</p>
                    <p className="text-xs text-ios-blue mt-1">{book.sourceName}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<Search size={48} />}
            title="开始搜索"
            description="输入关键词搜索你喜欢的小说"
          />
        )}

        <Modal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          title={loadingDetail ? '加载中...' : detailModal?.name || detailModal?.title}
          size="lg"
        >
          {loadingDetail ? (
            <div className="flex justify-center py-8">
              <Spinner size="lg" />
            </div>
          ) : detailModal && (
            <div className="flex gap-6">
              <div className="w-40 flex-shrink-0">
                <div className="aspect-[3/4] rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E]">
                  {detailModal.cover || detailModal.coverUrl ? (
                    <img
                      src={detailModal.cover || detailModal.coverUrl}
                      alt={detailModal.name}
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
                    {detailModal.name || detailModal.title}
                  </h2>
                  <p className="text-ios-gray mt-1">
                    作者: {detailModal.author || '未知'}
                  </p>
                  <p className="text-sm text-ios-blue mt-1">
                    来源: {detailModal.sourceName}
                  </p>
                </div>

                <div className="p-4 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios max-h-40 overflow-y-auto scrollbar-ios">
                  <h4 className="font-medium text-black dark:text-white mb-2">简介</h4>
                  <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-wrap">
                    {detailModal.intro || detailModal.desc || '暂无简介'}
                  </p>
                </div>

                {detailModal.chapters && detailModal.chapters.length > 0 && (
                  <div>
                    <h4 className="font-medium text-black dark:text-white mb-2">
                      章节列表 ({detailModal.chapters.length}章)
                    </h4>
                    <div className="max-h-32 overflow-y-auto scrollbar-ios space-y-1">
                      {detailModal.chapters.slice(0, 5).map((c: any, i: number) => (
                        <div key={i} className="text-sm text-ios-gray py-1 px-2 rounded hover:bg-ios-gray5 dark:hover:bg-[#38383A]">
                          {c.name || c.title}
                        </div>
                      ))}
                      {detailModal.chapters.length > 5 && (
                        <div className="text-sm text-ios-blue py-1 px-2">
                          ...还有 {detailModal.chapters.length - 5} 章
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <ModalFooter>
                  <Button variant="secondary" onClick={() => setDetailModal(null)}>
                    关闭
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
        <div className="grid grid-cols-5 gap-4">
          {filteredBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
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
          {filteredBooks.map((book, index) => (
            <motion.div
              key={book.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
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
