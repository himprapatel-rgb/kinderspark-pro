'use client'

type ButtonVariant = 'primary' | 'success' | 'danger' | 'ghost' | 'warning'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  children: React.ReactNode
}

const variantConfig: Record<ButtonVariant, { bg: string; shadow: string; border: string; text: string }> = {
  primary: {
    bg: 'linear-gradient(135deg, #5E5CE6, #7B59FF)',
    shadow: '0 4px 20px rgba(94,92,230,0.4)',
    border: '1px solid rgba(255,255,255,0.18)',
    text: 'text-white font-black',
  },
  success: {
    bg: 'linear-gradient(135deg, #30D158, #27AE7A)',
    shadow: '0 4px 20px rgba(48,209,88,0.35)',
    border: '1px solid rgba(255,255,255,0.18)',
    text: 'text-white font-black',
  },
  danger: {
    bg: 'linear-gradient(135deg, #FF453A, #FF2D55)',
    shadow: '0 4px 20px rgba(255,69,58,0.35)',
    border: '1px solid rgba(255,255,255,0.15)',
    text: 'text-white font-black',
  },
  warning: {
    bg: 'linear-gradient(135deg, #FF9F0A, #FF6B35)',
    shadow: '0 4px 20px rgba(255,159,10,0.35)',
    border: '1px solid rgba(255,255,255,0.18)',
    text: 'text-white font-black',
  },
  ghost: {
    bg: 'rgba(255,255,255,0.08)',
    shadow: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    text: 'text-white/70 font-bold',
  },
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
  const cfg = variantConfig[variant]

  return (
    <button
      disabled={disabled || loading}
      className={`relative overflow-hidden ${cfg.text} ${sizeStyles[size]} transition-all duration-200 active:scale-[0.96] disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
      style={{
        background: cfg.bg,
        boxShadow: cfg.shadow,
        border: cfg.border,
        ...style,
      }}
      {...props}
    >
      {/* Shimmer on hover */}
      {!disabled && !loading && (
        <span
          className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading ? (
          <>
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <span>Loading…</span>
          </>
        ) : children}
      </span>
    </button>
  )
}
