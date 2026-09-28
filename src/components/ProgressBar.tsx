export default function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="border-b border-slate-100 bg-white px-6 pb-3.5 pt-4 sm:px-8">
      <div className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, i) => {
          const done = i < current - 1
          const active = i === current - 1
          return (
            <span
              key={i}
              aria-hidden="true"
              className={`h-2 rounded-full transition-all duration-500 ease-out ${
                active
                  ? 'dreams-dot-active w-7 bg-violet-600'
                  : done
                    ? 'w-2 bg-violet-400'
                    : 'w-2 bg-slate-200'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}
