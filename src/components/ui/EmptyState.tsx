import React from 'react'
import { cn } from '@/utils'

interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-8 text-center', className)}>
      <div className="w-20 h-20 rounded-full bg-ios-gray6 dark:bg-[#2C2C2E] flex items-center justify-center text-ios-gray mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-black dark:text-white mb-2">{title}</h3>
      {description && (
        <p className="text-ios-gray max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
