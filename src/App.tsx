import React, { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/appStore'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { BooksPage } from '@/pages/BooksPage'
import { VideosPage } from '@/pages/VideosPage'
import { LivePage } from '@/pages/LivePage'
import { SourcesPage } from '@/pages/SourcesPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { ReaderView } from '@/components/reader/ReaderView'
import { VideoPlayerView } from '@/components/player/VideoPlayerView'
import { LivePlayerView } from '@/components/player/LivePlayerView'

const pathToView: Record<string, any> = {
  '/': 'home',
  '/books': 'books',
  '/videos': 'videos',
  '/live': 'live',
  '/sources': 'sources',
  '/settings': 'settings',
}

const viewToPath: Record<string, string> = {
  home: '/',
  books: '/books',
  videos: '/videos',
  live: '/live',
  sources: '/sources',
  settings: '/settings',
}

export const App: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentBook, currentVideo, currentLiveChannel, liveChannels, isDarkMode, setDarkMode, settings, currentView, setCurrentView } = useAppStore()

  useEffect(() => {
    const view = pathToView[location.pathname]
    if (view && view !== currentView) {
      setCurrentView(view)
    }
  }, [location.pathname])

  useEffect(() => {
    const path = viewToPath[currentView]
    if (path && path !== location.pathname) {
      navigate(path)
    }
  }, [currentView])

  useEffect(() => {
    const applyTheme = () => {
      const root = document.documentElement
      if (settings.theme === 'dark' || (settings.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        root.classList.add('dark')
        setDarkMode(true)
      } else {
        root.classList.remove('dark')
        setDarkMode(false)
      }
    }

    applyTheme()

    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleThemeChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleThemeChange)
      return () => mediaQuery.removeEventListener('change', handleThemeChange)
    }
  }, [settings.theme, setDarkMode])

  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [isDarkMode])

  const handleCloseReader = () => {
    useAppStore.getState().setCurrentBook(null)
  }

  const handleCloseVideo = () => {
    useAppStore.getState().setCurrentVideo(null)
  }

  const handleCloseLive = () => {
    useAppStore.getState().setCurrentLiveChannel(null)
  }

  const pageVariants = {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
  }

  const pageTransition = {
    type: 'tween',
    ease: 'anticipate',
    duration: 0.3,
  }

  return (
    <div className="h-full w-full bg-ios-gray6 dark:bg-[#000000] text-black dark:text-white overflow-hidden">
      <AppLayout>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route
              path="/"
              element={
                <motion.div
                  key="home"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <HomePage />
                </motion.div>
              }
            />
            <Route
              path="/books"
              element={
                <motion.div
                  key="books"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <BooksPage />
                </motion.div>
              }
            />
            <Route
              path="/videos"
              element={
                <motion.div
                  key="videos"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <VideosPage />
                </motion.div>
              }
            />
            <Route
              path="/live"
              element={
                <motion.div
                  key="live"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <LivePage />
                </motion.div>
              }
            />
            <Route
              path="/sources"
              element={
                <motion.div
                  key="sources"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <SourcesPage />
                </motion.div>
              }
            />
            <Route
              path="/settings"
              element={
                <motion.div
                  key="settings"
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  variants={pageVariants}
                  transition={pageTransition}
                  className="h-full overflow-y-auto scrollbar-ios"
                >
                  <SettingsPage />
                </motion.div>
              }
            />
          </Routes>
        </AnimatePresence>
      </AppLayout>

      <AnimatePresence>
        {currentBook && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ReaderView book={currentBook} onClose={handleCloseReader} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentVideo && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <VideoPlayerView video={currentVideo} onClose={handleCloseVideo} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentLiveChannel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <LivePlayerView
              channel={currentLiveChannel}
              channels={liveChannels}
              onClose={handleCloseLive}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
