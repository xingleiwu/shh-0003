import React from 'react'
import { cn } from '@/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className,
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block mb-1.5 ios-label">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-ios-gray">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'ios-input',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'ring-2 ring-ios-red/30',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-ios-gray">
            {rightIcon}
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-sm text-ios-red">{error}</p>}
    </div>
  )
}
