import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-label font-medium text-neutral-700">{label}</label>
        )}
        <input
          ref={ref}
          className={`w-full px-3.5 py-2.5 rounded-md border text-body-md text-neutral-900 placeholder:text-neutral-400 outline-none transition-colors
            ${error
              ? 'border-red-600 bg-red-50 focus:border-red-600'
              : 'border-neutral-200 bg-white focus:border-purple-600 focus:ring-1 focus:ring-purple-600/20'
            } ${className}`}
          {...props}
        />
        {error && <span className="text-label text-red-600">{error}</span>}
      </div>
    )
  }
)

Input.displayName = 'Input'
export default Input
