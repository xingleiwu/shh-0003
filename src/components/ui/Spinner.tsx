import React from 'react'
import { cn } from '@/utils'

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  color?: 'blue' | 'white' | 'gray'
  className?: string
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', color = 'blue', className }) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  }

  const colors = {
    blue: 'border-ios-blue',
    white: 'border-white',
    gray: 'border-ios-gray',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizes[size],
        colors[color],
        className
      )}
    />
  )
}
