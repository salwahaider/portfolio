import { useState, useEffect } from 'react'

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

const roles = [
  'Full-Stack Engineer',
  'Java Developer',
  'React Developer',
  'Spring Boot Enthusiast',
  'GT OMSCS Student',
]

export default function Hero() {
  const [roleIndex, setRoleIndex] = useState(0)
  const [visible,   setVisible]   = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setRoleIndex(i => (i + 1) % roles.length); setVisible(true) }, 320)
    }, 2800)
    return () => clearInterval(id)
  }, [])

  return (
    <section id="home" className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden dot-grid">

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full animate-float"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.14) 0%, transparent 70%)', filter: 'blur(60px)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full animate-float-slow"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(60px)' }} />
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-16">

        {/* Left: text */}
        <div className="flex-1 text-left">
          <p className="animate-in text-slate-500 text-sm font-light mb-4 tracking-widest uppercase">
            Hey, I'm
          </p>

          <h1 className="animate-in-delay-1 text-7xl md:text-8xl font-black tracking-tight mb-5 leading-none">
            <span className="block text-white">Salwa</span>
            <span className="block text-gradient-animated">Haider.</span>
          </h1>

          <div className="animate-in-delay-2 h-8 flex items-center mb-6 overflow-hidden">
            <p
              key={roleIndex}
              className="text-base md:text-lg font-medium text-slate-400 tracking-wide"
              style={{
                animation: visible ? 'roleFadeIn 0.32s ease-out forwards' : 'none',
                opacity: visible ? undefined : 0,
              }}
            >
              {roles[roleIndex]}
            </p>
          </div>

          <p className="animate-in-delay-2 text-slate-400 text-base md:text-lg max-w-md mb-9 leading-relaxed">
            Senior SWE at <span className="text-white font-medium">JPMorgan Chase</span>,
            building Kubernetes tooling at scale. I also ship personal projects with{' '}
            <span className="text-teal-300 font-medium">React</span> and{' '}
            <span className="text-violet-300 font-medium">Spring Boot</span>, and I'm working
            toward my M.S. in CS at Georgia Tech.
          </p>

          <div className="animate-in-delay-3 flex flex-wrap items-center gap-4 mb-9">
            <a href="#projects"
              className="group px-7 py-3.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold rounded-xl transition-all duration-300 shadow-xl shadow-cyan-500/30 hover:shadow-cyan-500/50 hover:-translate-y-0.5">
              See my projects
              <span className="ml-2 group-hover:translate-x-1 inline-block transition-transform">→</span>
            </a>
            <a href="mailto:salwamaheen@gmail.com"
              className="px-7 py-3.5 glass text-slate-300 hover:text-white font-semibold rounded-xl transition-all duration-300 hover:border-violet-400/40 hover:-translate-y-0.5">
              Say hello
            </a>
          </div>

          <div className="animate-in-delay-3 flex items-center gap-4">
            <a href="https://github.com/salwahaider" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-slate-400 hover:text-cyan-300 hover:border-cyan-400/30 transition-all duration-300 text-sm">
              <GitHubIcon /> GitHub
            </a>
            <a href="https://www.linkedin.com/in/salwa-haider/" target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 glass rounded-xl text-slate-400 hover:text-teal-300 hover:border-teal-400/30 transition-all duration-300 text-sm">
              <LinkedInIcon /> LinkedIn
            </a>
          </div>
        </div>

        {/* Right: photo */}
        <div className="animate-in-delay-2 flex-shrink-0 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-3 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.3), rgba(59,130,246,0.2))', filter: 'blur(20px)' }} />

            <img
              src="/salwahaider.JPG"
              alt="Salwa Haider"
              className="relative w-72 h-80 md:w-80 md:h-96 rounded-3xl object-cover border border-cyan-500/20"
            />
          </div>
        </div>

      </div>

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-slate-700 animate-bounce">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </div>
    </section>
  )
}
