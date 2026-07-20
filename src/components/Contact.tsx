import { useInView } from '../hooks/useInView'

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
  </svg>
)

const links = [
  { label: 'GitHub',   handle: '@salwahaider',        href: 'https://github.com/salwahaider',               icon: <GitHubIcon />,   color: 'hover:border-cyan-400/40 hover:text-cyan-300' },
  { label: 'LinkedIn', handle: 'salwa-haider',         href: 'https://www.linkedin.com/in/salwa-haider/',    icon: <LinkedInIcon />, color: 'hover:border-teal-400/40   hover:text-teal-300'   },
  { label: 'Email',    handle: 'salwamaheen@gmail.com', href: 'mailto:salwamaheen@gmail.com',                icon: <EmailIcon />,    color: 'hover:border-purple-400/40 hover:text-purple-300' },
]

export default function Contact() {
  const { ref, inView } = useInView()

  return (
    <section id="contact" className="relative py-28 px-6">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-1/4 w-[500px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.09) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(94,234,212,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div ref={ref} className="max-w-4xl mx-auto text-center relative z-10">
        <div className={`fade-slide-up ${inView ? 'visible' : ''}`}>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Contact</p>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-4 leading-tight">
            Let's <span className="text-gradient">talk</span>
          </h2>
          <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto mb-14 leading-relaxed">
            Whether it's a job opportunity, a collaboration, or just to say hi — feel free
            to reach out. I actually read my emails.
          </p>
        </div>

        <div className={`fade-slide-up ${inView ? 'visible' : ''} grid sm:grid-cols-3 gap-4 mb-12`}
          style={{ transitionDelay: '200ms' }}>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('mailto') ? undefined : '_blank'}
              rel="noopener noreferrer"
              className={`group glass rounded-2xl p-6 border border-white/5 ${link.color} transition-all duration-300 hover:-translate-y-1 hover:shadow-xl`}
            >
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors duration-300">
                  {link.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{link.label}</p>
                  <p className="text-slate-500 text-xs mt-0.5 break-all">{link.handle}</p>
                </div>
              </div>
            </a>
          ))}
        </div>

        <div className={`fade-slide-up ${inView ? 'visible' : ''}`} style={{ transitionDelay: '350ms' }}>
          <a
            href="mailto:salwamaheen@gmail.com"
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold rounded-2xl transition-all duration-300 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:-translate-y-0.5 text-base"
          >
            <EmailIcon />
            Say hello
          </a>
        </div>
      </div>
    </section>
  )
}
