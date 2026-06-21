import React, { useState, useMemo } from 'react'
import { Tv, Search, Plus, Play, Trash2, Radio } from 'lucide-react'
import { useAppStore } from '@/store/appStore'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { groupBy } from '@/utils'
import { motion, AnimatePresence } from 'framer-motion'

export const LivePage: React.FC = () => {
  const { liveChannels, removeLiveChannel, setCurrentLiveChannel, addHistory } = useAppStore()
  const { showToast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<string>('all')

  const groupedChannels = useMemo(() => {
    return groupBy(liveChannels, 'group')
  }, [liveChannels])

  const groups = ['all', ...Object.keys(groupedChannels)]

  const filteredChannels = useMemo(() => {
    let channels = liveChannels

    if (selectedGroup !== 'all') {
      channels = channels.filter(c => c.group === selectedGroup)
    }

    if (searchQuery) {
      channels = channels.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return channels
  }, [liveChannels, selectedGroup, searchQuery])

  const handlePlayChannel = (channel: any) => {
    addHistory({
      type: 'live',
      itemId: channel.id,
      name: channel.name,
      cover: channel.logo || '',
      progress: 0,
    })
    setCurrentLiveChannel(channel)
  }

  return (
    <div className="flex h-full animate-fadeIn">
      <div className="w-56 border-r border-ios-gray5 dark:border-[#38383A] p-4 overflow-y-auto scrollbar-ios flex-shrink-0">
        <h2 className="text-lg font-semibold text-black dark:text-white mb-4">频道分类</h2>
        <div className="space-y-1">
          {groups.map((group) => (
            <button
              key={group}
              onClick={() => setSelectedGroup(group)}
              className={[
                'w-full flex items-center justify-between px-3 py-2 rounded-ios text-left transition-all',
                selectedGroup === group
                  ? 'bg-ios-blue text-white'
                  : 'hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E] text-black/70 dark:text-white/70'
              ].join(' ')}
            >
              <span className="flex items-center gap-2">
                <Radio size={16} />
                {group === 'all' ? '全部频道' : group}
              </span>
              <span className="text-xs">
                {group === 'all' ? liveChannels.length : groupedChannels[group]?.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto scrollbar-ios">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-black dark:text-white">
            {selectedGroup === 'all' ? '全部直播' : selectedGroup}
          </h1>
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索频道..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={18} />}
              className="w-64"
            />
            <Button variant="secondary" icon={<Plus size={18} />}>
              导入直播源
            </Button>
          </div>
        </div>

        {filteredChannels.length === 0 ? (
          <EmptyState
            icon={<Tv size={48} />}
            title="暂无直播频道"
            description="导入直播源开始观看电视直播"
            action={
              <Button>
                导入直播源
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {filteredChannels.map((channel, index) => (
              <motion.div
                key={channel.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.02 }}
                className="group"
              >
                <Card hoverable onClick={() => handlePlayChannel(channel)}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-14 h-14 rounded-ios bg-ios-gray6 dark:bg-[#2C2C2E] flex items-center justify-center flex-shrink-0 overflow-hidden">
                        {channel.logo ? (
                          <img src={channel.logo} alt={channel.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Tv size={24} className="text-ios-gray" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-black dark:text-white truncate">{channel.name}</h3>
                        <p className="text-xs text-ios-gray mt-1">{channel.group}</p>
                        <p className="text-xs text-ios-blue mt-1">
                          {channel.urls.length} 个源
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <Button
                        size="sm"
                        fullWidth
                        onClick={(e) => {
                          e.stopPropagation()
                          handlePlayChannel(channel)
                        }}
                        icon={<Play size={14} />}
                      >
                        播放
                      </Button>
                      <Button
                        size="sm"
                        fullWidth
                        variant="ghost"
                        className="text-ios-red"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeLiveChannel(channel.id)
                          showToast('已移除频道', 'success')
                        }}
                        icon={<Trash2 size={14} />}
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
    </div>
  )
}
