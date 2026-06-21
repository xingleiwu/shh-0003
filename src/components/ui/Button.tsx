import React from 'react'
import { cn } from '@/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  size?: 'sm' | 'md' | 'lg'
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  fullWidth,
  className,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active-scale rounded-ios focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary: 'bg-ios-blue text-white hover:bg-ios-blue/90 focus:ring-ios-blue/30',
    secondary:
      'bg-ios-gray6 dark:bg-[#2C2C2E] text-ios-blue hover:bg-ios-gray5 dark:hover:bg-[#38383A]',
    danger: 'bg-ios-red text-white hover:bg-ios-red/90 focus:ring-ios-red/30',
    ghost: 'bg-transparent text-ios-blue hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E]',
    link: 'bg-transparent text-ios-blue hover:underline p-0',
  }

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }

  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className
      )}
      {...props}
    >
      {icon && iconPosition === 'left' && icon}
      {children}
      {icon && iconPosition === 'right' && icon}
    </button>
  )
}
