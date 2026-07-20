import { useState } from 'react'
import { useInView } from '../hooks/useInView'

type Tab = 'Experience' | 'Education' | 'Extracurricular'

interface Entry {
  title: string
  org: string
  date: string
  location: string
  points: string[]
  accent: string
}

const content: Record<Tab, Entry[]> = {
  Experience: [
    {
      title: 'Senior Software Engineer',
      org: 'JPMorgan Chase & Co.',
      date: 'Feb 2021 — Present',
      location: 'Plano, TX',
      accent: 'violet',
      points: [
        'Architected and built GKP-Service from scratch — a Java microservice with two endpoints (one serving Wolverine, one running an ETL batch job to populate the database hourly with Kubernetes data) — enabling Wolverine\'s full Kubernetes feature set for thousands of users and opening cross-team collaboration opportunities firm-wide.',
        'Leading development of One-Touch Repave for GKP-Service, enabling users to clone Kubernetes namespace configurations to a target cluster with a single action; built Java foundation and sanity tests, with planned enhancements for pre-clone resource validation and granular status logging.',
        'Led team delivery of Token as a Service, centralizing token generation across all backend microservices and eliminating duplicated auth logic firm-wide.',
        'Designed group-based scheduling for Wolverine, enabling thousands of users to define task groups with parallel/sequential/cross-group dependencies for complex failover workflows.',
        'Developed Lightswitch+, automating Kubernetes scaling via cron schedules — 1,000+ API calls/hr across 5,000+ users; saved the firm $5M in 2024.',
        'Built fully automated service update pipeline; led resiliency initiatives and KT sessions; built hygiene automation app (Java Spring / Angular / MariaDB) with Grafana + Dynatrace observability.',
        'Achieved 80%+ test coverage, reducing user-reported issues by 20%; improved seal ID onboarding by 80%; deployed across dev/UAT/prod on GAIA.',
      ],
    },
    {
      title: 'Software Engineer Intern',
      org: 'Textron Systems',
      date: 'Jun 2020 — Aug 2020',
      location: 'Sterling, VA',
      accent: 'teal',
      points: [
        'Automated HTTP API tests via Postman for SeeGEO; built Docker/Python/Locust endpoints; deployed on Azure, AWS, and on-premises infrastructure.',
        'Indexed NGINX logs into Elasticsearch with real-time Kibana dashboards; worked in Agile/CI-CD environment using Azure DevOps.',
      ],
    },
  ],

  Education: [
    {
      title: 'M.S. Computer Science',
      org: 'Georgia Institute of Technology',
      date: 'Expected 2027',
      location: 'Online (OMSCS)',
      accent: 'teal',
      points: [
        'Focus areas: AI Ethics & Society, Information Security, Human-Computer Interaction, Health Informatics.',
        'Coursework includes Software Development Process, Digital Health Equity, Intro to Cognitive Science, and more.',
        'Pursuing part-time alongside a full-time Senior SWE role at JPMorgan Chase.',
      ],
    },
    {
      title: 'B.S. Software Engineering — Cum Laude',
      org: 'University of Texas at Dallas',
      date: 'December 2020',
      location: 'Richardson, TX',
      accent: 'purple',
      points: [
        'Graduated Cum Laude.',
        'Award of Excellence for Best Executive Officer — Bangladeshi Student Organization, 2019.',
      ],
    },
  ],

  Extracurricular: [
    {
      title: 'Flow Monster Winner',
      org: 'Software Engineer Program Training — JPMorgan Chase & Co.',
      date: '2021',
      location: 'Plano, TX',
      accent: 'violet',
      points: [
        'Recognized as Flow Monster Winner in the JPMorgan Chase Software Engineer Program Training cohort.',
      ],
    },
    {
      title: 'Award of Excellence — Best Executive Officer',
      org: 'Bangladeshi Student Organization — UT Dallas',
      date: '2019',
      location: 'Richardson, TX',
      accent: 'fuchsia',
      points: [
        'Received the Award of Excellence for Best Executive Officer for contributions to the Bangladeshi Student Organization at UT Dallas.',
      ],
    },
  ],
}

const accentColors: Record<string, { dot: string; border: string; badge: string }> = {
  violet:  { dot: 'bg-cyan-400',    border: 'border-l-cyan-500',    badge: 'text-cyan-400'  },
  teal:    { dot: 'bg-teal-400',    border: 'border-l-teal-500',    badge: 'text-teal-400'    },
  purple:  { dot: 'bg-purple-400',  border: 'border-l-purple-500',  badge: 'text-purple-400'  },
  fuchsia: { dot: 'bg-fuchsia-400', border: 'border-l-fuchsia-500', badge: 'text-fuchsia-400' },
}

const TABS: Tab[] = ['Experience', 'Education', 'Extracurricular']

export default function Experience() {
  const [activeTab, setActiveTab] = useState<Tab>('Experience')
  const [fading,    setFading]    = useState(false)
  const { ref, inView } = useInView()

  const switchTab = (tab: Tab) => {
    if (tab === activeTab) return
    setFading(true)
    setTimeout(() => {
      setActiveTab(tab)
      setFading(false)
    }, 180)
  }

  const entries = content[activeTab]

  return (
    <section id="experience" className="relative py-28 px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute right-0 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(94,234,212,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
      </div>

      <div ref={ref} className="max-w-6xl mx-auto">
        <div className={`fade-slide-up ${inView ? 'visible' : ''}`}>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Background</p>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-12 leading-tight">
            Where I've <span className="text-gradient">been</span>
          </h2>
        </div>

        {/* Tab buttons */}
        <div className={`fade-slide-up ${inView ? 'visible' : ''} flex flex-wrap gap-3 mb-10`} style={{ transitionDelay: '100ms' }}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => switchTab(tab)}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 overflow-hidden ${
                  isActive
                    ? 'text-white border border-cyan-400/30'
                    : 'text-slate-500 hover:text-slate-300 glass hover:border-cyan-500/20'
                }`}
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(180deg, rgba(6,182,212,0.25), rgba(59,130,246,0.15), rgba(6,182,212,0.25))',
                        backgroundSize: '100% 200%',
                        animation: 'tabFlow 2.5s linear infinite',
                      }
                    : undefined
                }
              >
                {tab}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div
          className={`fade-slide-up ${inView ? 'visible' : ''} space-y-4`}
          style={{
            transitionDelay: '200ms',
            opacity: fading ? 0 : 1,
            transform: fading ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.18s ease, transform 0.18s ease',
          }}
        >
          {entries.map((entry, i) => {
            const colors = accentColors[entry.accent] ?? accentColors.violet
            return (
              <div
                key={`${activeTab}-${i}`}
                className={`glass rounded-2xl p-6 border-l-2 ${colors.border} hover:border-l-cyan-400 transition-all duration-300 hover:-translate-y-0.5`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-white font-bold text-lg leading-tight">{entry.title}</h3>
                    <p className={`text-sm font-medium mt-0.5 ${colors.badge}`}>{entry.org}</p>
                  </div>
                  <div className="flex flex-col sm:items-end gap-1 shrink-0">
                    <span className="text-slate-400 text-xs font-medium bg-white/5 px-3 py-1 rounded-full">
                      {entry.date}
                    </span>
                    <span className="text-slate-600 text-xs">{entry.location}</span>
                  </div>
                </div>

                <ul className="space-y-2">
                  {entry.points.map((point, j) => (
                    <li key={j} className="flex items-start gap-3 text-slate-400 text-sm leading-relaxed">
                      <span className={`mt-2 w-1 h-1 rounded-full shrink-0 ${colors.dot}`} />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
