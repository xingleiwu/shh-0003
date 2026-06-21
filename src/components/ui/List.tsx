import React from 'react'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/utils'

interface ListProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  inset?: boolean
}

export const List: React.FC<ListProps> = ({ children, title, inset, className, ...props }) => {
  return (
    <div className={cn(inset && 'mx-4', className)} {...props}>
      {title && <h3 className="text-sm font-medium text-ios-gray mb-2 px-4 uppercase">{title}</h3>}
      <div className="ios-list">{children}</div>
    </div>
  )
}

interface ListItemProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  label?: string
  subtitle?: string
  value?: React.ReactNode
  action?: React.ReactNode
  showChevron?: boolean
  destructive?: boolean
  onClick?: () => void
  children?: React.ReactNode
}

export const ListItem: React.FC<ListItemProps> = ({
  icon,
  label,
  subtitle,
  value,
  action,
  showChevron,
  destructive,
  onClick,
  className,
  children,
  ...props
}) => {
  return (
    <div
      className={cn(
        'ios-list-item',
        onClick && 'cursor-pointer hover:bg-ios-gray6 dark:hover:bg-[#2C2C2E]',
        className
      )}
      onClick={onClick}
      {...props}
    >
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && (
              <div className="flex-shrink-0 w-10 h-10 rounded-ios flex items-center justify-center bg-ios-gray6 dark:bg-[#2C2C2E] text-ios-blue">
                {icon}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={cn('font-medium truncate', destructive && 'text-ios-red')}>{label}</p>
              {subtitle && <p className="text-sm text-ios-gray truncate">{subtitle}</p>}
            </div>
          </div>
          {value && <div className="text-ios-gray ml-3">{value}</div>}
          {action && <div className="ml-3">{action}</div>}
          {showChevron && <ChevronRight size={20} className="text-ios-gray3 ml-1 flex-shrink-0" />}
        </>
      )}
    </div>
  )
}
