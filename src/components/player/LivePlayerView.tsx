import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  List,
  ArrowLeft,
  RefreshCw,
  Tv2,
} from 'lucide-react'
import Hls from 'hls.js'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { List as ListComponent, ListItem } from '@/components/ui/List'
import type { LiveChannel, LiveGroup } from '@/types'

interface LivePlayerViewProps {
  channel: LiveChannel
  channels: LiveChannel[]
  onClose: () => void
}

export const LivePlayerView: React.FC<LivePlayerViewProps> = ({ channel, channels, onClose }) => {
  const { settings, addHistory, liveChannels } = useAppStore()
  const { showToast } = useToast()

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [currentChannel, setCurrentChannel] = useState<LiveChannel>(channel)
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [volume, setVolume] = useState(settings.player.defaultVolume / 100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showChannelList, setShowChannelList] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const currentUrl = currentChannel.urls[currentUrlIndex]

  const groups = React.useMemo(() => {
    const groupMap = new Map<string, LiveChannel[]>()
    channels.forEach((ch) => {
      const group = ch.group || '未分类'
      if (!groupMap.has(group)) {
        groupMap.set(group, [])
      }
      groupMap.get(group)!.push(ch)
    })
    return Array.from(groupMap.entries()).map(([name, channels]) => ({ name, channels }))
  }, [channels])

  useEffect(() => {
    if (currentUrl && videoRef.current) {
      loadStream(currentUrl)
    }
  }, [currentUrl])

  const loadStream = useCallback((url: string) => {
    const video = videoRef.current
    if (!video) return

    setLoading(true)
    setError(null)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 10,
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        if (settings.player.autoPlay) {
          video.play().catch(() => {
            setIsPlaying(false)
            setLoading(false)
          })
        }
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error:', data)
        if (data.fatal) {
          setError('直播流加载失败，正在尝试切换线路...')
          switchToNextLine()
        }
      })
    } else {
      video.src = url
      video.load()
      setLoading(false)
      if (settings.player.autoPlay) {
        video.play().catch(() => {
          setIsPlaying(false)
        })
      }
    }
  }, [settings.player.autoPlay])

  const switchToNextLine = useCallback(() => {
    if (currentUrlIndex < currentChannel.urls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1)
      showToast('已切换到备用线路', 'info')
    } else {
      setError('所有线路都无法播放，请尝试其他频道')
      showToast('所有线路都无法播放', 'error')
    }
  }, [currentUrlIndex, currentChannel.urls.length, showToast])

  const refreshStream = () => {
    if (currentUrl) {
      loadStream(currentUrl)
      showToast('正在刷新直播流...', 'info')
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleWaiting = () => setLoading(true)
    const handlePlaying = () => {
      setLoading(false)
      setError(null)
    }
    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }
    const handleError = () => {
      setError('播放出错，正在重试...')
      setTimeout(() => switchToNextLine(), 2000)
    }

    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('volumechange', handleVolumeChange)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('volumechange', handleVolumeChange)
      video.removeEventListener('error', handleError)
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [switchToNextLine])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {
        showToast('无法播放直播', 'error')
      })
    }
  }

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    setVolume(Math.max(0, Math.min(1, pos)))
    setIsMuted(false)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return

    if (!isFullscreen) {
      if (container.requestFullscreen) {
        container.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const handleMouseMove = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current)
    }
    setShowControls(true)
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
      }, 3000)
    }
  }

  const selectChannel = (ch: LiveChannel) => {
    setCurrentChannel(ch)
    setCurrentUrlIndex(0)
    setShowChannelList(false)
    addHistory({
      type: 'live',
      itemId: ch.id,
      name: ch.name,
      cover: ch.logo || '',
      progress: 0,
    })
  }

  const changeChannel = (direction: 'prev' | 'next') => {
    const currentIndex = channels.findIndex((c) => c.id === currentChannel.id)
    if (currentIndex >= 0) {
      const newIndex =
        direction === 'next'
          ? (currentIndex + 1) % channels.length
          : (currentIndex - 1 + channels.length) % channels.length
      selectChannel(channels[newIndex])
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => Math.max(0, v - 0.1))
          break
        case 'ArrowLeft':
          changeChannel('prev')
          break
        case 'ArrowRight':
          changeChannel('next')
          break
        case 'f':
          toggleFullscreen()
          break
        case 'm':
          toggleMute()
          break
        case 'r':
          refreshStream()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, isFullscreen, currentChannel, channels])

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-black flex flex-col"
      onMouseMove={handleMouseMove}
    >
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={onClose} icon={<ArrowLeft size={20} className="text-white" />}>
                  <span className="text-white">返回</span>
                </Button>
                <div className="flex items-center gap-3">
                  {currentChannel.logo && (
                    <img
                      src={currentChannel.logo}
                      alt={currentChannel.name}
                      className="w-10 h-10 rounded-ios object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <h2 className="font-semibold text-white">{currentChannel.name}</h2>
                    <p className="text-xs text-white/60">
                      {currentChannel.group || '未分类'} · 线路 {currentUrlIndex + 1}/
                      {currentChannel.urls.length}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={refreshStream}>
                  <RefreshCw size={20} className="text-white" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowChannelList(true)}>
                  <List size={20} className="text-white" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings size={20} className="text-white" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex items-center justify-center" onClick={togglePlay}>
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onClick={(e) => e.stopPropagation()}
          playsInline
        />

        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30">
            <Spinner size="lg" />
            <p className="mt-4 text-white">正在加载直播流...</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
            <Tv2 size={48} className="text-white/60 mb-4" />
            <p className="text-white text-lg mb-2">{error}</p>
            <div className="flex gap-2">
              <Button onClick={refreshStream} icon={<RefreshCw size={16} />}>
                刷新
              </Button>
              <Button variant="secondary" onClick={() => setShowChannelList(true)}>
                切换频道
              </Button>
            </div>
          </div>
        )}

        {!isPlaying && !loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-white/30 transition-all">
              <Play size={40} className="text-white ml-1" />
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
            className="absolute bottom-0 left-0 right-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-4 pt-12 pb-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={togglePlay}>
                  {isPlaying ? (
                    <Pause size={24} className="text-white" />
                  ) : (
                    <Play size={24} className="text-white" />
                  )}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => changeChannel('prev')}>
                  <ArrowLeft size={20} className="text-white" />
                </Button>

                <Button variant="ghost" size="sm" onClick={() => changeChannel('next')}>
                  <ArrowLeft size={20} className="text-white rotate-180" />
                </Button>

                <div className="flex items-center gap-2 ml-2 group">
                  <Button variant="ghost" size="sm" onClick={toggleMute}>
                    {isMuted || volume === 0 ? (
                      <VolumeX size={20} className="text-white" />
                    ) : (
                      <Volume2 size={20} className="text-white" />
                    )}
                  </Button>
                  <div
                    className="w-0 group-hover:w-24 overflow-hidden transition-all duration-300 h-1.5 bg-white/30 rounded-full cursor-pointer relative"
                    onClick={handleVolumeClick}
                  >
                    <div
                      className="h-full bg-white rounded-full"
                      style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                    />
                  </div>
                  <span className="text-white text-sm w-10">
                    {Math.round((isMuted ? 0 : volume) * 100)}%
                  </span>
                </div>

                <div className="ml-4 px-3 py-1 bg-ios-green/80 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  <span className="text-white text-xs font-medium">直播中</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-white text-sm mr-4">
                  线路 {currentUrlIndex + 1}/{currentChannel.urls.length}
                </div>
                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                  {isFullscreen ? (
                    <Minimize size={20} className="text-white" />
                  ) : (
                    <Maximize size={20} className="text-white" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Modal isOpen={showChannelList} onClose={() => setShowChannelList(false)} title="频道列表" size="lg">
        <div className="max-h-[60vh] overflow-y-auto scrollbar-ios">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="mb-4">
              <h4 className="font-medium text-ios-gray mb-2 px-2 sticky top-0 bg-white dark:bg-[#1C1C1E] py-2 z-10">
                {group.name} ({group.channels.length})
              </h4>
              <ListComponent>
                {group.channels.map((ch) => (
                  <ListItem
                    key={ch.id}
                    onClick={() => selectChannel(ch)}
                    className={currentChannel.id === ch.id ? 'bg-ios-blue/10' : ''}
                  >
                    <div className="flex items-center gap-3 w-full">
                      {ch.logo && (
                        <img
                          src={ch.logo}
                          alt={ch.name}
                          className="w-8 h-8 rounded object-cover flex-shrink-0"
                          onError={(e) => {
                            ;(e.target as HTMLImageElement).style.display = 'none'
                          }}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <span
                          className={
                            currentChannel.id === ch.id
                              ? 'text-ios-blue font-medium'
                              : 'text-black dark:text-white'
                          }
                        >
                          {ch.name}
                        </span>
                        {ch.group && (
                          <p className="text-xs text-ios-gray truncate">{ch.group}</p>
                        )}
                      </div>
                      {currentChannel.id === ch.id && (
                        <span className="text-xs text-ios-blue flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-ios-green rounded-full animate-pulse" />
                          播放中
                        </span>
                      )}
                      {ch.urls.length > 1 && (
                        <span className="text-xs text-ios-gray">{ch.urls.length}线路</span>
                      )}
                    </div>
                  </ListItem>
                ))}
              </ListComponent>
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="播放设置" size="sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              播放线路
            </label>
            <div className="space-y-2">
              {currentChannel.urls.map((url, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentUrlIndex(index)}
                  className={`w-full px-4 py-3 rounded-ios text-left transition-all ${
                    currentUrlIndex === index
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-black dark:text-white hover:bg-ios-gray5 dark:hover:bg-[#38383A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>线路 {index + 1}</span>
                    {currentUrlIndex === index && <span className="text-xs">当前</span>}
                  </div>
                  <p className="text-xs opacity-60 mt-1 truncate">{url}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              音量: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume * 100}
              onChange={(e) => {
                const v = parseInt(e.target.value) / 100
                setVolume(v)
                useAppStore.getState().updatePlayerSettings({ defaultVolume: v * 100 })
              }}
              className="w-full h-1 bg-ios-gray3 rounded-full appearance-none cursor-pointer accent-ios-blue"
            />
          </div>

          <div className="pt-4 border-t border-ios-gray5 dark:border-[#38383A]">
            <p className="text-xs text-ios-gray">
              快捷键: 空格(播放/暂停) · ←→(切换频道) · ↑↓(音量) · F(全屏) · M(静音) · R(刷新)
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
