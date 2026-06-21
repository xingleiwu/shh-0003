import React from 'react'
import { cn } from '@/utils'

interface ProgressBarProps {
  value: number
  max?: number
  color?: 'blue' | 'green' | 'orange' | 'red'
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = 'blue',
  showLabel,
  size = 'md',
  className,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100)

  const colors = {
    blue: 'bg-ios-blue',
    green: 'bg-ios-green',
    orange: 'bg-ios-orange',
    red: 'bg-ios-red',
  }

  const heights = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-between mb-1">
        {showLabel && (
          <span className="text-sm text-ios-gray">{percentage.toFixed(1)}%</span>
        )}
      </div>
      <div className={cn('w-full bg-ios-gray5 dark:bg-[#38383A] rounded-full overflow-hidden', heights[size])}>
        <div
          className={cn('h-full rounded-full transition-all duration-300', colors[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
