import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  List,
  Bookmark,
  BookmarkCheck,
  Sun,
  Moon,
  Type,
  AlignLeft,
  X,
  ArrowLeft,
} from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { List as ListComponent, ListItem } from '@/components/ui/List'
import { fetchUrl, fetchJson } from '@/utils/http'
import type { Book, Chapter } from '@/types'

interface ReaderViewProps {
  book: Book
  onClose: () => void
}

export const ReaderView: React.FC<ReaderViewProps> = ({ book, onClose }) => {
  const { settings, readProgress, setReadProgress, addHistory, sources, updateBook } = useAppStore()
  const { showToast } = useToast()

  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentContent, setCurrentContent] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [showToc, setShowToc] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [scrollPosition, setScrollPosition] = useState(0)
  const [isBookmarked, setIsBookmarked] = useState(false)

  const contentRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const chapters = book.chapters || []
  const currentChapter = chapters[currentChapterIndex]
  const readerSettings = settings.reader

  const loadProgress = readProgress[book.id]

  useEffect(() => {
    if (loadProgress && chapters.length > 0) {
      const chapterIndex = chapters.findIndex((c) => c.id === loadProgress.chapterId)
      if (chapterIndex >= 0) {
        setCurrentChapterIndex(chapterIndex)
      }
    }
  }, [loadProgress, chapters])

  useEffect(() => {
    if (currentChapter) {
      loadChapterContent(currentChapter)
    }
  }, [currentChapterIndex, currentChapter])

  const loadChapterContent = async (chapter: Chapter) => {
    if (chapter.content) {
      setCurrentContent(chapter.content)
      return
    }

    setLoading(true)
    try {
      const source = sources.find((s) => s.id === book.sourceId)
      let content = ''

      if (chapter.url.startsWith('http')) {
        const contentUrl = source?.config?.playUrl || chapter.url
        try {
          const data = await fetchJson(contentUrl, source?.config?.headers)
          if (typeof data === 'string') {
            content = data
          } else if (data.content) {
            content = data.content
          } else if (data.data?.content) {
            content = data.data.content
          } else {
            content = JSON.stringify(data, null, 2)
          }
        } catch {
          content = await fetchUrl(contentUrl, source?.config?.headers)
        }
      } else {
        content = chapter.url
      }

      content = formatContent(content)
      setCurrentContent(content)

      const updatedChapters = [...chapters]
      updatedChapters[currentChapterIndex] = { ...chapter, content }
      updateBook(book.id, { chapters: updatedChapters })
    } catch (error) {
      console.error('加载章节内容失败:', error)
      setCurrentContent('章节内容加载失败，请稍后重试。\n\n错误信息: ' + (error as Error).message)
      showToast('章节加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }

  const formatContent = (content: string): string => {
    let formatted = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    return formatted
  }

  const saveProgress = useCallback(() => {
    if (!contentRef.current || chapters.length === 0) return

    const scrollTop = contentRef.current.scrollTop
    const scrollHeight = contentRef.current.scrollHeight - contentRef.current.clientHeight
    const percentage = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0

    setScrollPosition(scrollTop)

    setReadProgress(book.id, {
      chapterId: chapters[currentChapterIndex]?.id || '',
      position: scrollTop,
      percentage: Math.min(100, Math.max(0, percentage)),
    })

    addHistory({
      type: 'novel',
      itemId: book.id,
      name: book.name,
      cover: book.cover,
      progress: Math.min(100, Math.max(0, percentage)),
    })
  }, [book, chapters, currentChapterIndex, setReadProgress, addHistory])

  useEffect(() => {
    const timer = setTimeout(() => {
      saveProgress()
    }, 1000)
    return () => clearTimeout(timer)
  }, [scrollPosition, saveProgress])

  const goToChapter = (index: number) => {
    if (index >= 0 && index < chapters.length) {
      setCurrentChapterIndex(index)
      setShowToc(false)
      if (contentRef.current) {
        contentRef.current.scrollTop = 0
      }
    }
  }

  const goToPrev = () => goToChapter(currentChapterIndex - 1)
  const goToNext = () => goToChapter(currentChapterIndex + 1)

  const handleScroll = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      setShowControls(false)
    }, 3000)

    if (contentRef.current) {
      setScrollPosition(contentRef.current.scrollTop)
    }
  }

  const toggleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    showToast(isBookmarked ? '已取消书签' : '已添加书签', 'success')
  }

  const handleContentClick = (e: React.MouseEvent) => {
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = e.clientX - rect.left
    const width = rect.width

    if (x < width * 0.25) {
      goToPrev()
    } else if (x > width * 0.75) {
      goToNext()
    } else {
      setShowControls(!showControls)
    }
  }

  const fontSizeOptions = [14, 16, 18, 20, 22, 24, 28]
  const bgColors = [
    { name: '护眼米黄', value: '#F8F4E6' },
    { name: '纯净白色', value: '#FFFFFF' },
    { name: '深色模式', value: '#1C1C1E' },
    { name: '墨绿背景', value: '#E8F5E9' },
    { name: '淡蓝背景', value: '#E3F2FD' },
  ]

  const readerStyle: React.CSSProperties = {
    fontSize: `${readerSettings.fontSize}px`,
    lineHeight: readerSettings.lineHeight,
    letterSpacing: `${readerSettings.letterSpacing}px`,
    fontFamily: readerSettings.fontFamily,
    backgroundColor: readerSettings.backgroundColor,
    color: readerSettings.backgroundColor === '#1C1C1E' ? '#FFFFFF' : readerSettings.textColor,
    maxWidth: `${readerSettings.pageWidth}px`,
    padding: '40px 32px',
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: readerSettings.backgroundColor }}>
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="flex items-center justify-between px-4 py-3 border-b border-black/10 dark:border-white/10"
            style={{ backgroundColor: readerSettings.backgroundColor }}
          >
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={onClose} icon={<ArrowLeft size={20} />}>
                返回
              </Button>
              <div className="ml-2">
                <h2 className="font-semibold text-black dark:text-white">{book.name}</h2>
                <p className="text-xs text-ios-gray">
                  {currentChapter?.name || '加载中...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={toggleBookmark}>
                {isBookmarked ? (
                  <BookmarkCheck size={20} className="text-ios-blue" />
                ) : (
                  <Bookmark size={20} />
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowToc(true)} icon={<List size={20} />} />
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} icon={<Settings size={20} />} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto mx-auto w-full scrollbar-ios cursor-pointer"
        onScroll={handleScroll}
        onClick={handleContentClick}
      >
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-ios-gray">正在加载章节内容...</p>
          </div>
        ) : (
          <div className="mx-auto" style={readerStyle}>
            <h1 className="text-2xl font-bold mb-8 text-center">{currentChapter?.name}</h1>
            <div className="space-y-4">
              {currentContent.split('\n\n').map((paragraph, index) => (
                <p
                  key={index}
                  className="indent-8 text-justify"
                  style={{ marginBottom: `${readerSettings.paragraphSpacing}px` }}
                >
                  {paragraph}
                </p>
              ))}
            </div>

            <div className="mt-12 pt-8 border-t border-black/10 dark:border-white/10">
              <div className="flex justify-between items-center">
                <Button
                  variant="secondary"
                  onClick={goToPrev}
                  disabled={currentChapterIndex === 0}
                  icon={<ChevronLeft size={18} />}
                >
                  上一章
                </Button>
                <span className="text-ios-gray text-sm">
                  {currentChapterIndex + 1} / {chapters.length}
                </span>
                <Button
                  onClick={goToNext}
                  disabled={currentChapterIndex === chapters.length - 1}
                  icon={<ChevronRight size={18} />}
                  iconPosition="right"
                >
                  下一章
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="px-4 py-3 border-t border-black/10 dark:border-white/10"
            style={{ backgroundColor: readerSettings.backgroundColor }}
          >
            <div className="max-w-3xl mx-auto">
              <div className="flex items-center gap-3 text-sm text-ios-gray">
                <span className="flex-shrink-0">进度</span>
                <input
                  type="range"
                  min="0"
                  max={chapters.length - 1}
                  value={currentChapterIndex}
                  onChange={(e) => goToChapter(parseInt(e.target.value))}
                  className="flex-1 h-1 bg-ios-gray3 rounded-full appearance-none cursor-pointer accent-ios-blue"
                />
                <span className="flex-shrink-0 w-16 text-right">
                  {((currentChapterIndex / Math.max(1, chapters.length - 1)) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={showToc} onClose={() => setShowToc(false)} title="目录" size="md">
        <div className="max-h-96 overflow-y-auto scrollbar-ios">
          <ListComponent>
            {chapters.map((chapter, index) => (
              <ListItem
                key={chapter.id || index}
                onClick={() => goToChapter(index)}
                className={currentChapterIndex === index ? 'bg-ios-blue/10' : ''}
              >
                <div className="flex items-center justify-between w-full">
                  <span
                    className={
                      currentChapterIndex === index ? 'text-ios-blue font-medium' : 'text-black dark:text-white'
                    }
                  >
                    {chapter.name}
                  </span>
                  {currentChapterIndex === index && (
                    <span className="text-xs text-ios-blue">当前</span>
                  )}
                </div>
              </ListItem>
            ))}
          </ListComponent>
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="阅读设置" size="md">
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white mb-3">
              <Type size={18} />
              字体大小
            </label>
            <div className="flex flex-wrap gap-2">
              {fontSizeOptions.map((size) => (
                <button
                  key={size}
                  onClick={() => useAppStore.getState().updateReaderSettings({ fontSize: size })}
                  className={`px-4 py-2 rounded-ios text-sm transition-all ${
                    readerSettings.fontSize === size
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-black dark:text-white hover:bg-ios-gray5 dark:hover:bg-[#38383A]'
                  }`}
                >
                  {size}px
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white mb-3">
              <AlignLeft size={18} />
              行高
            </label>
            <input
              type="range"
              min="1.4"
              max="2.5"
              step="0.1"
              value={readerSettings.lineHeight}
              onChange={(e) =>
                useAppStore.getState().updateReaderSettings({ lineHeight: parseFloat(e.target.value) })
              }
              className="w-full h-1 bg-ios-gray3 rounded-full appearance-none cursor-pointer accent-ios-blue"
            />
            <div className="text-xs text-ios-gray mt-1 text-right">{readerSettings.lineHeight.toFixed(1)}</div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white mb-3">
              <Sun size={18} />
              背景颜色
            </label>
            <div className="flex flex-wrap gap-2">
              {bgColors.map((color) => (
                <button
                  key={color.value}
                  onClick={() => {
                    useAppStore.getState().updateReaderSettings({
                      backgroundColor: color.value,
                      textColor: color.value === '#1C1C1E' ? '#FFFFFF' : '#333333',
                    })
                    if (color.value === '#1C1C1E') {
                      useAppStore.getState().setDarkMode(true)
                    }
                  }}
                  className={`px-4 py-2 rounded-ios text-sm transition-all flex items-center gap-2 ${
                    readerSettings.backgroundColor === color.value
                      ? 'ring-2 ring-ios-blue'
                      : 'hover:ring-1 hover:ring-ios-gray3'
                  }`}
                  style={{ backgroundColor: color.value, color: color.value === '#1C1C1E' ? '#FFF' : '#333' }}
                >
                  {color.value === '#1C1C1E' ? <Moon size={14} /> : <Sun size={14} />}
                  {color.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-black dark:text-white mb-3">
              页面宽度
            </label>
            <input
              type="range"
              min="600"
              max="900"
              step="20"
              value={readerSettings.pageWidth}
              onChange={(e) =>
                useAppStore.getState().updateReaderSettings({ pageWidth: parseInt(e.target.value) })
              }
              className="w-full h-1 bg-ios-gray3 rounded-full appearance-none cursor-pointer accent-ios-blue"
            />
            <div className="text-xs text-ios-gray mt-1 text-right">{readerSettings.pageWidth}px</div>
          </div>
        </div>
      </Modal>
    </div>
  )
}
