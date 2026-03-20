'use client'

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'text-white font-black',
  success: 'text-white font-black',
  danger: 'text-white font-black',
  ghost: 'text-white/70 font-bold border border-white/20',
}

const variantBg: Record<ButtonVariant, string> = {
  primary: '#5E5CE6',
  success: '#30D158',
  danger: '#FF453A',
  ghost: 'transparent',
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-2 text-xs rounded-xl',
  md: 'px-4 py-3 text-sm rounded-2xl',
  lg: 'px-6 py-4 text-base rounded-2xl',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={`${variantStyles[variant]} ${sizeStyles[size]} transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      style={{ background: variantBg[variant], ...style }}
      {...props}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          Loading...
        </span>
      ) : children}
    </button>
  )
}
