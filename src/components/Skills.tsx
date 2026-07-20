import { useInView } from '../hooks/useInView'

const categories = [
  {
    label: 'Languages',
    color: 'cyan',
    skills: ['Java', 'Python', 'TypeScript', 'JavaScript', 'HTML & CSS', 'C#', 'C++'],
  },
  {
    label: 'Frameworks & Cloud',
    color: 'teal',
    skills: ['Spring Boot', 'React', 'Angular', 'Node.js', 'Kubernetes', 'AWS', 'Azure', 'MySQL'],
  },
  {
    label: 'Observability',
    color: 'purple',
    skills: ['Grafana', 'Dynatrace', 'Splunk', 'Elasticsearch', 'Kibana'],
  },
  {
    label: 'Tools & Workflow',
    color: 'cyan',
    skills: ['GitHub', 'Bitbucket', 'Jira', 'Postman', 'OpenAPI', 'CI/CD', 'Agile', 'Azure DevOps'],
  },
  {
    label: 'Testing & Infrastructure',
    color: 'indigo',
    skills: ['JUnit', 'Locust', 'Docker', 'Maven', 'Android Studio'],
  },
  {
    label: 'Concepts',
    color: 'fuchsia',
    skills: ['Microservices', 'REST APIs', 'ETL Pipelines', 'System Design', 'OOP', 'MVC'],
  },
]

const colorMap: Record<string, { pill: string; label: string; dot: string }> = {
  violet:  { pill: 'bg-cyan-500/10   text-cyan-300   border-cyan-500/20   hover:bg-cyan-500/20',     label: 'text-cyan-400',  dot: 'bg-cyan-400'    },
  teal:    { pill: 'bg-teal-500/10   text-teal-300   border-teal-500/20   hover:bg-teal-500/20',     label: 'text-teal-400',    dot: 'bg-teal-400'    },
  purple:  { pill: 'bg-purple-500/10 text-purple-300 border-purple-500/20 hover:bg-purple-500/20',   label: 'text-purple-400',  dot: 'bg-purple-400'  },
  cyan:    { pill: 'bg-cyan-500/10   text-cyan-300   border-cyan-500/20   hover:bg-cyan-500/20',     label: 'text-cyan-400',    dot: 'bg-cyan-400'    },
  indigo:  { pill: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/20',   label: 'text-indigo-400',  dot: 'bg-indigo-400'  },
  fuchsia: { pill: 'bg-fuchsia-500/10 text-fuchsia-300 border-fuchsia-500/20 hover:bg-fuchsia-500/20', label: 'text-fuchsia-400', dot: 'bg-fuchsia-400' },
}

export default function Skills() {
  const { ref, inView } = useInView()

  return (
    <section id="skills" className="relative py-16 md:py-28 px-6">
      <div className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(167,139,250,0.2), rgba(94,234,212,0.2), transparent)' }} />
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse, rgba(6,182,212,0.05) 0%, transparent 70%)', filter: 'blur(50px)' }} />

      <div ref={ref} className="max-w-6xl mx-auto">
        <div className={`fade-slide-up ${inView ? 'visible' : ''}`}>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">Skills</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-4 leading-tight">
            What I <span className="text-gradient">work with</span>
          </h2>
          <p className="text-slate-500 mb-16 text-base max-w-md">
            The stack I reach for, and the tools I've learned the hard way.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat, i) => {
            const c = colorMap[cat.color]
            return (
              <div
                key={cat.label}
                className={`fade-slide-up ${inView ? 'visible' : ''} glass rounded-2xl p-6 hover:border-cyan-500/20 transition-all duration-300 hover:-translate-y-0.5`}
                style={{ transitionDelay: `${i * 70}ms` }}
              >
                <div className="flex items-center gap-2.5 mb-4">
                  <span className={`w-2 h-2 rounded-full ${c.dot}`} />
                  <span className={`text-xs font-bold tracking-widest uppercase ${c.label}`}>{cat.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.skills.map((skill) => (
                    <span
                      key={skill}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-default transition-colors duration-200 ${c.pill}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
