export default function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-cyan-500/10 py-8 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-slate-600 text-sm">
          &copy; {year} <span className="text-slate-400 font-medium">Salwa Haider</span>. All rights reserved.
        </p>
        <p className="text-slate-700 text-xs">
          Built with <span className="text-slate-500">React</span> + <span className="text-slate-500">TypeScript</span> + <span className="text-slate-500">Tailwind CSS</span>
        </p>
      </div>
    </footer>
  )
}
