import React from 'react'
import { BookOpen, PlaySquare, Tv, Database, TrendingUp, Clock, Star, Plus } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatDate, truncate } from '@/utils'
import { motion } from 'framer-motion'

export const HomePage: React.FC = () => {
  const { books, videos, liveChannels, sources, history, setCurrentView, setCurrentBook, setCurrentVideo, setCurrentLiveChannel, addHistory } = useAppStore()

  const stats = [
    { label: '小说', value: books.length, icon: <BookOpen size={24} />, color: 'from-blue-500 to-cyan-500', view: 'books' },
    { label: '视频', value: videos.length, icon: <PlaySquare size={24} />, color: 'from-purple-500 to-pink-500', view: 'videos' },
    { label: '直播', value: liveChannels.length, icon: <Tv size={24} />, color: 'from-orange-500 to-red-500', view: 'live' },
    { label: '数据源', value: sources.length, icon: <Database size={24} />, color: 'from-green-500 to-emerald-500', view: 'sources' },
  ]

  const recentHistory = history.slice(0, 6)

  const handleHistoryClick = (item: any) => {
    if (item.type === 'novel') {
      const book = books.find(b => b.id === item.itemId)
      if (book) setCurrentBook(book)
    } else if (item.type === 'video') {
      const video = videos.find(v => v.id === item.itemId)
      if (video) setCurrentVideo(video)
    } else if (item.type === 'live') {
      const channel = liveChannels.find(c => c.id === item.itemId)
      if (channel) setCurrentLiveChannel(channel)
    }
  }

  return (
    <div className="p-6 space-y-8 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-black dark:text-white">欢迎回来 👋</h1>
          <p className="text-ios-gray mt-1">继续你的阅读之旅</p>
        </div>
        <Button icon={<Plus size={18} />} onClick={() => setCurrentView('sources')}>
          添加数据源
        </Button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card hoverable onClick={() => setCurrentView(stat.view as any)}>
              <CardContent className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-ios-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white shadow-lg`}>
                  {stat.icon}
                </div>
                <div>
                  <p className="text-2xl font-bold text-black dark:text-white">{stat.value}</p>
                  <p className="text-sm text-ios-gray">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
              <Clock size={20} className="text-ios-blue" />
              最近阅读
            </h2>
            <Button variant="link" size="sm" onClick={() => setCurrentView('books')}>
              查看全部
            </Button>
          </div>

          {recentHistory.length === 0 ? (
            <EmptyState
              icon={<TrendingUp size={32} />}
              title="暂无阅读记录"
              description="开始阅读你的第一本书或观看第一个视频吧"
              action={
                <Button onClick={() => setCurrentView('sources')}>
                  添加数据源
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {recentHistory.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card hoverable onClick={() => handleHistoryClick(item)}>
                    <CardContent className="flex items-center gap-4 p-4">
                      <div className="w-16 h-20 rounded-ios overflow-hidden bg-ios-gray6 dark:bg-[#2C2C2E] flex-shrink-0">
                        {item.cover ? (
                          <img src={item.cover} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ios-gray">
                            {item.type === 'novel' && <BookOpen size={24} />}
                            {item.type === 'video' && <PlaySquare size={24} />}
                            {item.type === 'live' && <Tv size={24} />}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-semibold text-black dark:text-white truncate">{item.name}</h3>
                          <span className={`ios-badge ${
                            item.type === 'novel' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' :
                            item.type === 'video' ? 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' :
                            'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400'
                          }`}>
                            {item.type === 'novel' ? '小说' : item.type === 'video' ? '视频' : '直播'}
                          </span>
                        </div>
                        <p className="text-sm text-ios-gray mt-1">
                          {formatDate(item.updatedAt)}
                        </p>
                        {item.progress > 0 && (
                          <div className="mt-2">
                            <div className="w-full bg-ios-gray5 dark:bg-[#38383A] rounded-full h-1.5">
                              <div
                                className="bg-ios-blue h-full rounded-full transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                            <p className="text-xs text-ios-gray mt-1">已完成 {item.progress.toFixed(0)}%</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-black dark:text-white flex items-center gap-2">
            <Star size={20} className="text-ios-orange" />
            快捷操作
          </h2>
          <div className="space-y-3">
            {[
              { label: '导入小说', icon: <BookOpen size={20} />, view: 'books', color: 'bg-blue-500' },
              { label: '导入视频', icon: <PlaySquare size={20} />, view: 'videos', color: 'bg-purple-500' },
              { label: '导入直播', icon: <Tv size={20} />, view: 'live', color: 'bg-orange-500' },
              { label: '管理数据源', icon: <Database size={20} />, view: 'sources', color: 'bg-green-500' },
            ].map((action) => (
              <Card key={action.label} hoverable onClick={() => setCurrentView(action.view as any)}>
                <CardContent className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-ios ${action.color} flex items-center justify-center text-white`}>
                    {action.icon}
                  </div>
                  <span className="font-medium text-black dark:text-white">{action.label}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="ios-card p-4 mt-6">
            <h3 className="font-semibold text-black dark:text-white mb-3">使用说明</h3>
            <div className="space-y-2 text-sm text-ios-gray">
              <p>1. 点击「导入」按钮添加数据源</p>
              <p>2. 支持网络接口和本地文件</p>
              <p>3. 数据源格式：CatVod、TVBox、阅读APP、IPTV</p>
              <p>4. 点击侧边栏切换不同模块</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
