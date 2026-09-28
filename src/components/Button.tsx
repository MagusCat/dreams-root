export function Button({ className = '', disabled, children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      disabled={disabled}
      className={`flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3 font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-violet-700 active:bg-violet-800 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none ${className}`}
    >
      {children}
    </button>
  )
}

