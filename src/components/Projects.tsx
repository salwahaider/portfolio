import { useInView } from '../hooks/useInView'
import { useState, useEffect, useRef, type MouseEvent } from 'react'

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
  </svg>
)

const ExternalLinkIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
  </svg>
)

// ─── TripSync slideshow ───────────────────────────────────────────────────────
const TRIPSYNC_SLIDES = [
  { src: '/screenshots/tripsync-signin.png',         label: 'Sign In'              },
  { src: '/screenshots/tripsync-trips.png',           label: 'My Trips'             },
  { src: '/screenshots/tripsync-mytrip.png',          label: 'Trip Dashboard'       },
  { src: '/screenshots/tripsync-heatmap.png',         label: 'Availability Heatmap' },
  { src: '/screenshots/tripsync-invitefriends.png',   label: 'Invite Friends'       },
  { src: '/screenshots/tripsync-flightsearch.png',    label: 'Flight Search'        },
  { src: '/screenshots/tripsync-syncarrival.png',     label: 'Sync Arrivals'        },
  { src: '/screenshots/tripsync-minigroupexpense.png',label: 'Split Costs'          },
  { src: '/screenshots/tripsync-groupexpense.png',         label: 'Group Expenses'       },
  { src: '/screenshots/tripsync-destination-voting.png',   label: 'Destination Voting'   },
]

const TRIPSYNC_GRADIENTS = [
  'from-cyan-950 via-blue-950 to-indigo-950',
  'from-blue-950 via-cyan-950 to-indigo-950',
  'from-indigo-950 via-blue-950 to-cyan-950',
  'from-cyan-950 via-indigo-950 to-blue-950',
  'from-blue-950 via-indigo-950 to-cyan-950',
]

function TripSyncSlideshow() {
  const [slideIdx, setSlideIdx]   = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlideIdx(i => (i + 1) % TRIPSYNC_SLIDES.length)
    }, 2000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleImgError = (i: number) => setImgErrors(prev => ({ ...prev, [i]: true }))

  return (
    <>
      {TRIPSYNC_SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-br ${TRIPSYNC_GRADIENTS[i % TRIPSYNC_GRADIENTS.length]}`}
          style={{ opacity: i === slideIdx ? 1 : 0 }}
        >
          {!imgErrors[i] && (
            <img src={slide.src} alt={slide.label} className="w-full h-full object-cover object-top" onError={() => handleImgError(i)} />
          )}
          {imgErrors[i] && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-cyan-400/40 text-xs tracking-widest uppercase">{slide.label}</p>
            </div>
          )}
        </div>
      ))}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#06030f] via-[#06030f]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
        <p className="text-white text-sm font-semibold mb-2.5 drop-shadow">{TRIPSYNC_SLIDES[slideIdx].label}</p>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {TRIPSYNC_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setSlideIdx(i) }}
              className={`h-1 rounded-full transition-all duration-300 ${i === slideIdx ? 'bg-cyan-400 w-5' : 'bg-white/25 w-1'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Bridge Game slideshow ───────────────────────────────────────────────────
const BRIDGE_SLIDES = [
  { src: '/screenshots/bridge-lobby.png', label: 'Game Lobby'     },
  { src: '/screenshots/bridge-join.png',  label: 'Joining Players' },
  { src: '/screenshots/bridge-game.png',  label: 'Live Gameplay'  },
]

const BRIDGE_GRADIENTS = [
  'from-emerald-950 via-green-950 to-teal-950',
  'from-green-950 via-emerald-950 to-cyan-950',
  'from-teal-950 via-green-950 to-emerald-950',
]

function BridgeSlideshow() {
  const [slideIdx, setSlideIdx]   = useState(0)
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({})
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlideIdx(i => (i + 1) % BRIDGE_SLIDES.length)
    }, 2200)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const handleImgError = (i: number) => setImgErrors(prev => ({ ...prev, [i]: true }))

  return (
    <>
      {BRIDGE_SLIDES.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-700 bg-gradient-to-br ${BRIDGE_GRADIENTS[i % BRIDGE_GRADIENTS.length]}`}
          style={{ opacity: i === slideIdx ? 1 : 0 }}
        >
          {!imgErrors[i] && (
            <img src={slide.src} alt={slide.label} className="w-full h-full object-cover object-top" onError={() => handleImgError(i)} />
          )}
          {imgErrors[i] && (
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-emerald-400/40 text-xs tracking-widest uppercase">{slide.label}</p>
            </div>
          )}
        </div>
      ))}
      <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-[#06030f] via-[#06030f]/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 right-0 p-5 pointer-events-none">
        <p className="text-white text-sm font-semibold mb-2.5 drop-shadow">{BRIDGE_SLIDES[slideIdx].label}</p>
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {BRIDGE_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setSlideIdx(i) }}
              className={`h-1 rounded-full transition-all duration-300 ${i === slideIdx ? 'bg-emerald-400 w-5' : 'bg-white/25 w-1'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
// ─────────────────────────────────────────────────────────────────────────────

interface Project {
  title: string
  tagline: string
  desc: string
  tech: string[]
  gradient: string
  features: string[]
  github?: string
  live?: string
  accent: 'cyan' | 'teal' | 'emerald'
  slideshow?: boolean
  slideshowType?: 'tripsync' | 'bridge'
}

const tagStyles: Record<string, string> = {
  cyan:    'bg-cyan-500/8    text-cyan-300    border-cyan-500/20',
  teal:    'bg-teal-500/8    text-teal-300    border-teal-500/20',
  emerald: 'bg-emerald-500/8 text-emerald-300 border-emerald-500/20',
}

const dotStyles: Record<string, string> = {
  cyan:    'bg-cyan-400',
  teal:    'bg-teal-400',
  emerald: 'bg-emerald-400',
}

const projects: Project[] = [
  {
    title: 'TripSync',
    tagline: 'Collaborative travel planning',
    desc: 'A full-stack app where groups plan trips together — shared itinerary, destination voting, availability heatmap, split costs, and ideas board.',
    tech: ['React 19', 'TypeScript', 'Spring Boot', 'PostgreSQL', 'JWT', 'Tailwind CSS', 'Docker', 'Vercel', 'Railway'],
    gradient: 'from-cyan-500 via-blue-500 to-indigo-600',
    accent: 'cyan',
    slideshow: true,
    slideshowType: 'tripsync',
    features: [
      'Shared itinerary & trip dashboard',
      'Group availability heatmap',
      'Destination voting & ideas board',
      'Split cost & budget tracking',
      'JWT auth via Spring Security',
      'Deployed: Vercel + Railway',
    ],
    live: 'https://trip-sync-eosin.vercel.app/',
  },
  {
    title: 'Call Bridge',
    tagline: 'Real-time multiplayer card game',
    desc: 'An online version of the South Asian trick-taking card game Call Bridge — play with friends anywhere via shareable room codes. Built with Node.js and Socket.io for real-time multiplayer.',
    tech: ['Node.js', 'Express', 'Socket.io', 'HTML/CSS', 'JavaScript', 'Render'],
    gradient: 'from-emerald-500 via-green-500 to-teal-600',
    accent: 'emerald',
    slideshow: true,
    slideshowType: 'bridge',
    features: [
      '4-player real-time multiplayer via WebSockets',
      'Shareable room codes for private games',
      'Bidding system with animated scroll wheel',
      'Spades trump suit enforcement',
      'Live score tracking & in-game chat',
      'Mobile-friendly, deployed on Render',
    ],
    github: 'https://github.com/salwahaider/call-bridge',
    live: 'https://e-ekfx.onrender.com',
  },
]

function handle3DMove(e: MouseEvent<HTMLDivElement>) {
  const card = e.currentTarget
  const rect = card.getBoundingClientRect()
  const x = (e.clientX - rect.left) / rect.width  - 0.5
  const y = (e.clientY - rect.top)  / rect.height - 0.5
  card.style.transform = `perspective(1000px) rotateY(${x * 7}deg) rotateX(${-y * 7}deg) translateZ(10px)`
}

function handle3DLeave(e: MouseEvent<HTMLDivElement>) {
  e.currentTarget.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)'
}

export default function Projects() {
  const { ref, inView }             = useInView()
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  return (
    <section id="projects" className="relative py-16 md:py-28 px-6">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)', filter: 'blur(60px)' }} />

      <div ref={ref} className="max-w-6xl mx-auto">
        <div className={`fade-slide-up ${inView ? 'visible' : ''}`}>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Projects</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            Things I've <span className="text-gradient">built</span>
          </h2>
          <p className="text-slate-500 mb-16 text-base max-w-md">
            Side projects I made because I wanted them to exist.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {projects.map((project, i) => {
            const isHovered    = hoveredIdx === i
            const showSlideshow = project.slideshow && isHovered

            return (
              <div
                key={project.title}
                className={`fade-slide-up ${inView ? 'visible' : ''} card-3d relative glass rounded-3xl overflow-hidden border border-white/5 flex flex-col cursor-pointer`}
                style={{ transitionDelay: `${i * 150}ms`, minHeight: '480px' }}
                onMouseMove={handle3DMove}
                onMouseLeave={(e) => { handle3DLeave(e); setHoveredIdx(null) }}
                onMouseEnter={() => setHoveredIdx(i)}
                onClick={(e) => {
                  if ((e.target as HTMLElement).closest('a, button')) return
                  const url = project.live ?? project.github
                  if (url) window.open(url, '_blank', 'noopener,noreferrer')
                }}
              >
                {/* Gradient top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${project.gradient} flex-shrink-0`} />

                {/* Slideshow overlay */}
                {project.slideshow && (
                  <div
                    className="absolute inset-0 z-20 transition-opacity duration-400"
                    style={{ opacity: showSlideshow ? 1 : 0, pointerEvents: showSlideshow ? 'auto' : 'none' }}
                  >
                    {project.slideshowType === 'bridge' ? <BridgeSlideshow /> : <TripSyncSlideshow />}
                  </div>
                )}

                {/* Card content */}
                <div
                  className="p-7 flex flex-col flex-1 transition-opacity duration-300"
                  style={{ opacity: showSlideshow ? 0 : 1 }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold text-white">{project.title}</h3>
                      <p className="text-slate-500 text-sm mt-0.5">{project.tagline}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {project.github && (
                        <a href={project.github} target="_blank" rel="noopener noreferrer"
                          className="p-2 glass rounded-xl text-slate-500 hover:text-white transition-all duration-200">
                          <GitHubIcon />
                        </a>
                      )}
                      {project.live && (
                        <a href={project.live} target="_blank" rel="noopener noreferrer"
                          className="p-2 glass rounded-xl text-slate-500 hover:text-cyan-300 transition-all duration-200">
                          <ExternalLinkIcon />
                        </a>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-400 text-sm leading-relaxed mb-6">{project.desc}</p>

                  {project.slideshow && (
                    <p className="text-cyan-400/60 text-xs mb-4 italic">Hover to preview the UI</p>
                  )}

                  <ul className="space-y-2 mb-6 flex-1">
                    {project.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <span className={`mt-1.5 w-1 h-1 rounded-full shrink-0 ${dotStyles[project.accent]}`} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap gap-2 pt-5 border-t border-white/5">
                    {project.tech.map((t) => (
                      <span key={t} className={`px-2.5 py-1 rounded-lg text-xs font-medium border ${tagStyles[project.accent]}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className={`fade-slide-up ${inView ? 'visible' : ''} mt-10 text-center`} style={{ transitionDelay: '500ms' }}>
          <a href="https://github.com/salwahaider" target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 glass rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-all duration-200 hover:border-cyan-400/30">
            <GitHubIcon /> View all on GitHub
          </a>
        </div>
      </div>
    </section>
  )
}
