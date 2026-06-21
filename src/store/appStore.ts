import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Source,
  Book,
  Video,
  LiveChannel,
  LocalFile,
  Settings,
  ReadProgress,
  HistoryItem,
} from '@/types'

interface AppState {
  sources: Source[]
  books: Book[]
  videos: Video[]
  liveChannels: LiveChannel[]
  localFiles: LocalFile[]
  settings: Settings
  readProgress: Record<string, ReadProgress>
  history: HistoryItem[]
  currentView: 'home' | 'books' | 'videos' | 'live' | 'sources' | 'settings'
  currentBook: Book | null
  currentVideo: Video | null
  currentLiveChannel: LiveChannel | null
  isDarkMode: boolean

  addSource: (source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>) => void
  updateSource: (id: string, source: Partial<Source>) => void
  removeSource: (id: string) => void

  addBook: (book: Omit<Book, 'id' | 'addedAt'>) => void
  updateBook: (id: string, book: Partial<Book>) => void
  removeBook: (id: string) => void

  addVideo: (video: Omit<Video, 'id' | 'addedAt'>) => void
  updateVideo: (id: string, video: Partial<Video>) => void
  removeVideo: (id: string) => void

  addLiveChannel: (channel: Omit<LiveChannel, 'id'>) => void
  removeLiveChannel: (id: string) => void

  addLocalFile: (file: Omit<LocalFile, 'id' | 'addedAt'>) => void
  removeLocalFile: (id: string) => void

  updateSettings: (settings: Partial<Settings>) => void
  updateReaderSettings: (settings: Partial<Settings['reader']>) => void
  updatePlayerSettings: (settings: Partial<Settings['player']>) => void
  updateNetworkSettings: (settings: Partial<Settings['network']>) => void

  setReadProgress: (bookId: string, progress: Omit<ReadProgress, 'bookId' | 'updatedAt'>) => void
  addHistory: (item: Omit<HistoryItem, 'id' | 'updatedAt'>) => void
  clearHistory: () => void

  setCurrentView: (view: AppState['currentView']) => void
  setCurrentBook: (book: Book | null) => void
  setCurrentVideo: (video: Video | null) => void
  setCurrentLiveChannel: (channel: LiveChannel | null) => void
  setDarkMode: (isDark: boolean) => void

  importSources: (sources: Source[]) => void
}

const defaultSettings: Settings = {
  theme: 'system',
  reader: {
    fontSize: 18,
    lineHeight: 1.8,
    letterSpacing: 0.5,
    fontFamily: '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif',
    backgroundColor: '#F8F4E6',
    textColor: '#333333',
    paragraphSpacing: 16,
    pageWidth: 720,
    flipMode: 'page',
  },
  player: {
    autoPlay: true,
    defaultVolume: 70,
    enableHardwareDecoding: true,
    skipIntro: 0,
    skipEnding: 0,
  },
  network: {
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    timeout: 30000,
    retryCount: 3,
  },
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sources: [],
      books: [],
      videos: [],
      liveChannels: [],
      localFiles: [],
      settings: defaultSettings,
      readProgress: {},
      history: [],
      currentView: 'home',
      currentBook: null,
      currentVideo: null,
      currentLiveChannel: null,
      isDarkMode: false,

      addSource: (source) =>
        set((state) => ({
          sources: [
            ...state.sources,
            {
              ...source,
              id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            },
          ],
        })),

      updateSource: (id, source) =>
        set((state) => ({
          sources: state.sources.map((s) =>
            s.id === id ? { ...s, ...source, updatedAt: Date.now() } : s
          ),
        })),

      removeSource: (id) =>
        set((state) => ({
          sources: state.sources.filter((s) => s.id !== id),
        })),

      addBook: (book) =>
        set((state) => ({
          books: [
            ...state.books,
            {
              ...book,
              id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              addedAt: Date.now(),
            },
          ],
        })),

      updateBook: (id, book) =>
        set((state) => ({
          books: state.books.map((b) => (b.id === id ? { ...b, ...book } : b)),
        })),

      removeBook: (id) =>
        set((state) => ({
          books: state.books.filter((b) => b.id !== id),
        })),

      addVideo: (video) =>
        set((state) => ({
          videos: [
            ...state.videos,
            {
              ...video,
              id: `vid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              addedAt: Date.now(),
            },
          ],
        })),

      updateVideo: (id, video) =>
        set((state) => ({
          videos: state.videos.map((v) => (v.id === id ? { ...v, ...video } : v)),
        })),

      removeVideo: (id) =>
        set((state) => ({
          videos: state.videos.filter((v) => v.id !== id),
        })),

      addLiveChannel: (channel) =>
        set((state) => ({
          liveChannels: [
            ...state.liveChannels,
            {
              ...channel,
              id: `live_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          ],
        })),

      removeLiveChannel: (id) =>
        set((state) => ({
          liveChannels: state.liveChannels.filter((c) => c.id !== id),
        })),

      addLocalFile: (file) =>
        set((state) => ({
          localFiles: [
            ...state.localFiles,
            {
              ...file,
              id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              addedAt: Date.now(),
            },
          ],
        })),

      removeLocalFile: (id) =>
        set((state) => ({
          localFiles: state.localFiles.filter((f) => f.id !== id),
        })),

      updateSettings: (settings) =>
        set((state) => ({
          settings: { ...state.settings, ...settings },
        })),

      updateReaderSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            reader: { ...state.settings.reader, ...settings },
          },
        })),

      updatePlayerSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            player: { ...state.settings.player, ...settings },
          },
        })),

      updateNetworkSettings: (settings) =>
        set((state) => ({
          settings: {
            ...state.settings,
            network: { ...state.settings.network, ...settings },
          },
        })),

      setReadProgress: (bookId, progress) =>
        set((state) => ({
          readProgress: {
            ...state.readProgress,
            [bookId]: {
              ...progress,
              bookId,
              updatedAt: Date.now(),
            },
          },
        })),

      addHistory: (item) =>
        set((state) => {
          const existingIndex = state.history.findIndex((h) => h.itemId === item.itemId)
          const newHistory = [...state.history]

          if (existingIndex >= 0) {
            newHistory.splice(existingIndex, 1)
          }

          newHistory.unshift({
            ...item,
            id: `hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            updatedAt: Date.now(),
          })

          return { history: newHistory.slice(0, 100) }
        }),

      clearHistory: () => set({ history: [] }),

      setCurrentView: (view) => set({ currentView: view }),
      setCurrentBook: (book) => set({ currentBook: book }),
      setCurrentVideo: (video) => set({ currentVideo: video }),
      setCurrentLiveChannel: (channel) => set({ currentLiveChannel: channel }),
      setDarkMode: (isDark) => set({ isDarkMode: isDark }),

      importSources: (sources) =>
        set((state) => {
          const newSources = sources.map((s) => ({
            ...s,
            id: `src_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }))
          return { sources: [...state.sources, ...newSources] }
        }),
    }),
    {
      name: 'reader-hub-storage',
      partialize: (state) => ({
        sources: state.sources,
        books: state.books,
        videos: state.videos,
        liveChannels: state.liveChannels,
        localFiles: state.localFiles,
        settings: state.settings,
        readProgress: state.readProgress,
        history: state.history,
      }),
    }
  )
)
