import React from 'react'
import { cn } from '@/utils'

interface TabsProps {
  value: string
  onChange: (value: string) => void
  tabs: { id: string; label: string; icon?: React.ReactNode }[]
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({ value, onChange, tabs, className }) => {
  return (
    <div className={cn('flex gap-1 p-1 bg-ios-gray6 dark:bg-[#2C2C2E] rounded-ios', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[10px] font-medium text-sm transition-all',
            value === tab.id
              ? 'bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-sm'
              : 'text-ios-gray dark:text-ios-gray2 hover:text-black dark:hover:text-white'
          )}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}
