import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipBack,
  SkipForward,
  Settings,
  List,
  ArrowLeft,
  X,
  ChevronDown,
} from 'lucide-react'
import Hls from 'hls.js'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Spinner } from '@/components/ui/Spinner'
import { List as ListComponent, ListItem } from '@/components/ui/List'
import type { Video, PlaySource, PlayUrl } from '@/types'

interface VideoPlayerViewProps {
  video: Video
  onClose: () => void
}

export const VideoPlayerView: React.FC<VideoPlayerViewProps> = ({ video, onClose }) => {
  const { settings, addHistory } = useAppStore()
  const { showToast } = useToast()

  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(settings.player.defaultVolume / 100)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0)
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0)
  const [buffered, setBuffered] = useState(0)

  const playList = video.playList || []
  const currentSource = playList[currentSourceIndex]
  const currentUrl = currentSource?.urls[currentUrlIndex]

  const playerSettings = settings.player

  useEffect(() => {
    if (currentUrl && videoRef.current) {
      loadVideo(currentUrl.url)
    }
  }, [currentUrl])

  const loadVideo = useCallback((url: string) => {
    const video = videoRef.current
    if (!video) return

    setLoading(true)

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    if (url.includes('.m3u8') && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })
      hlsRef.current = hls
      hls.loadSource(url)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false)
        if (playerSettings.autoPlay) {
          video.play().catch(() => setIsPlaying(false))
        }
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error('HLS fatal error:', data)
          showToast('视频加载失败，尝试切换线路', 'error')
          switchToNextLine()
        }
      })
    } else {
      video.src = url
      video.load()
      setLoading(false)
      if (playerSettings.autoPlay) {
        video.play().catch(() => setIsPlaying(false))
      }
    }
  }, [playerSettings.autoPlay, showToast])

  const switchToNextLine = () => {
    if (currentSource && currentUrlIndex < currentSource.urls.length - 1) {
      setCurrentUrlIndex(currentUrlIndex + 1)
    } else if (currentSourceIndex < playList.length - 1) {
      setCurrentSourceIndex(currentSourceIndex + 1)
      setCurrentUrlIndex(0)
    }
  }

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime)
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1))
      }
    }

    const handleLoadedMetadata = () => {
      setDuration(video.duration)
      setLoading(false)
    }

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleWaiting = () => setLoading(true)
    const handlePlaying = () => setLoading(false)
    const handleEnded = () => {
      setIsPlaying(false)
      if (currentSource && currentUrlIndex < currentSource.urls.length - 1) {
        setCurrentUrlIndex(currentUrlIndex + 1)
      } else if (currentSourceIndex < playList.length - 1) {
        setCurrentSourceIndex(currentSourceIndex + 1)
        setCurrentUrlIndex(0)
      }
    }

    const handleVolumeChange = () => {
      setVolume(video.volume)
      setIsMuted(video.muted)
    }

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('playing', handlePlaying)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('volumechange', handleVolumeChange)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('playing', handlePlaying)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('volumechange', handleVolumeChange)
      if (hlsRef.current) {
        hlsRef.current.destroy()
      }
    }
  }, [currentSource, currentUrlIndex, currentSourceIndex, playList.length])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted])

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate
    }
  }, [playbackRate])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return

    if (isPlaying) {
      video.pause()
    } else {
      video.play().catch(() => {
        showToast('无法播放视频', 'error')
      })
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pos = (e.clientX - rect.left) / rect.width
    const newTime = pos * duration

    if (videoRef.current) {
      videoRef.current.currentTime = newTime
      setCurrentTime(newTime)
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

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(
        0,
        Math.min(duration, videoRef.current.currentTime + seconds)
      )
    }
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '00:00'
    const hours = Math.floor(time / 3600)
    const minutes = Math.floor((time % 3600) / 60)
    const seconds = Math.floor(time % 60)
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
  }

  const selectSource = (sourceIndex: number, urlIndex: number = 0) => {
    setCurrentSourceIndex(sourceIndex)
    setCurrentUrlIndex(urlIndex)
    setShowPlaylist(false)
  }

  const playbackRates = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]

  useEffect(() => {
    addHistory({
      type: 'video',
      itemId: video.id,
      name: video.name,
      cover: video.cover,
      progress: duration > 0 ? (currentTime / duration) * 100 : 0,
    })
  }, [video, currentTime, duration, addHistory])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          skip(-10)
          break
        case 'ArrowRight':
          skip(10)
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume((v) => Math.min(1, v + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume((v) => Math.max(0, v - 0.1))
          break
        case 'f':
          toggleFullscreen()
          break
        case 'm':
          toggleMute()
          break
        case 'Escape':
          if (isFullscreen) {
            toggleFullscreen()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlaying, isFullscreen])

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
                <div>
                  <h2 className="font-semibold text-white">{video.name}</h2>
                  <p className="text-xs text-white/60">
                    {currentSource?.name || '默认'} · {currentUrl?.name || '线路' + (currentUrlIndex + 1)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={() => setShowPlaylist(true)}>
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

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Spinner size="lg" />
          </div>
        )}

        {!isPlaying && !loading && (
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
            <div className="mb-3">
              <div
                className="h-1.5 bg-white/30 rounded-full cursor-pointer group relative"
                onClick={handleSeek}
              >
                <div
                  className="h-full bg-white/40 rounded-full absolute top-0 left-0"
                  style={{ width: `${(buffered / duration) * 100}%` }}
                />
                <div
                  className="h-full bg-ios-blue rounded-full relative"
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={togglePlay}>
                  {isPlaying ? (
                    <Pause size={24} className="text-white" />
                  ) : (
                    <Play size={24} className="text-white" />
                  )}
                </Button>

                <Button variant="ghost" size="sm" onClick={() => skip(-10)}>
                  <SkipBack size={20} className="text-white" />
                </Button>

                <Button variant="ghost" size="sm" onClick={() => skip(10)}>
                  <SkipForward size={20} className="text-white" />
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
                </div>

                <span className="text-white text-sm ml-2">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative group">
                  <Button variant="ghost" size="sm">
                    <span className="text-white text-sm">{playbackRate}x</span>
                  </Button>
                  <div className="absolute bottom-full right-0 mb-2 bg-[#2C2C2E] rounded-ios overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                    {playbackRates.map((rate) => (
                      <button
                        key={rate}
                        onClick={() => setPlaybackRate(rate)}
                        className={`px-4 py-2 text-sm w-full text-left transition-colors ${
                          playbackRate === rate
                            ? 'bg-ios-blue text-white'
                            : 'text-white hover:bg-white/10'
                        }`}
                      >
                        {rate}x
                      </button>
                    ))}
                  </div>
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

      <Modal isOpen={showPlaylist} onClose={() => setShowPlaylist(false)} title="播放列表" size="md">
        <div className="max-h-96 overflow-y-auto scrollbar-ios space-y-4">
          {playList.map((source, sourceIndex) => (
            <div key={sourceIndex}>
              <h4 className="font-medium text-black dark:text-white mb-2 px-2">{source.name}</h4>
              <ListComponent>
                {source.urls.map((url, urlIndex) => (
                  <ListItem
                    key={urlIndex}
                    onClick={() => selectSource(sourceIndex, urlIndex)}
                    className={
                      currentSourceIndex === sourceIndex && currentUrlIndex === urlIndex
                        ? 'bg-ios-blue/10'
                        : ''
                    }
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={
                          currentSourceIndex === sourceIndex && currentUrlIndex === urlIndex
                            ? 'text-ios-blue font-medium'
                            : 'text-black dark:text-white'
                        }
                      >
                        {url.name}
                      </span>
                      {currentSourceIndex === sourceIndex && currentUrlIndex === urlIndex && (
                        <span className="text-xs text-ios-blue">播放中</span>
                      )}
                    </div>
                  </ListItem>
                ))}
              </ListComponent>
            </div>
          ))}
          {playList.length === 0 && (
            <div className="text-center text-ios-gray py-8">
              暂无播放列表
            </div>
          )}
        </div>
      </Modal>

      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="播放设置" size="sm">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              播放速度
            </label>
            <div className="flex flex-wrap gap-2">
              {playbackRates.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setPlaybackRate(rate)}
                  className={`px-4 py-2 rounded-ios text-sm transition-all ${
                    playbackRate === rate
                      ? 'bg-ios-blue text-white'
                      : 'bg-ios-gray6 dark:bg-[#2C2C2E] text-black dark:text-white hover:bg-ios-gray5 dark:hover:bg-[#38383A]'
                  }`}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-black dark:text-white mb-3">
              默认音量: {Math.round(volume * 100)}%
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
              快捷键: 空格(播放/暂停) · ←→(快进/退) · ↑↓(音量) · F(全屏) · M(静音)
            </p>
          </div>
        </div>
      </Modal>
    </div>
  )
}
