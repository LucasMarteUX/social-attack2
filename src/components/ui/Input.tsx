import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label className="text-label font-medium text-ink-muted">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-xl border text-body-md text-ink bg-surface placeholder:text-ink-faint outline-none transition-all
            ${error
              ? 'border-red-500/60 bg-red-500/[0.06] focus:border-red-500 focus:ring-2 focus:ring-red-500/15'
              : 'border-line/[0.1] focus:border-accent/40 focus:ring-2 focus:ring-accent/12'
            } ${className}`}
          {...props}
        />
        {error && <span className="text-label text-red-400">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
