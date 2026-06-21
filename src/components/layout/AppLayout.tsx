import React, { useEffect } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useAppStore } from '@/store/appStore'

interface AppLayoutProps {
  children: React.ReactNode
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { isDarkMode, setDarkMode } = useAppStore()

  useEffect(() => {
    const initTheme = async () => {
      if (window.electronAPI) {
        const isDark = await window.electronAPI.getTheme()
        setDarkMode(isDark)

        window.electronAPI.on('theme:change', (isDark: boolean) => {
          setDarkMode(isDark)
        })
      }
    }
    initTheme()
  }, [setDarkMode])

  return (
    <div className="flex h-screen w-full overflow-hidden bg-ios-gray6 dark:bg-black text-black dark:text-white">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
