import { useInView } from '../hooks/useInView'

export default function About() {
  const { ref, inView } = useInView()

  return (
    <section id="about" className="relative py-16 md:py-28 px-6">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)', filter: 'blur(60px)' }}
        />
      </div>

      <div ref={ref} className="max-w-6xl mx-auto">
        <div className={`fade-slide-up ${inView ? 'visible' : ''}`}>
          <p className="text-cyan-400 text-sm font-semibold tracking-widest uppercase mb-3">About</p>
          <h2 className="text-3xl md:text-5xl font-black text-white mb-10 md:mb-16 leading-tight">
            A bit about <span className="text-gradient">me</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-14 items-start">
          {/* Bio */}
          <div
            className={`fade-slide-up ${inView ? 'visible' : ''} space-y-5 text-slate-400 text-base leading-relaxed`}
            style={{ transitionDelay: '150ms' }}
          >
            <p>
              I'm a Senior Software Engineer at{' '}
              <span className="text-white font-medium">JPMorgan Chase</span>, where I've been
              since 2021. My day-to-day involves building and shipping features across the full
              stack — APIs, frontend, databases, the works.
            </p>
            <p>
              I graduated Cum Laude from{' '}
              <span className="text-white font-medium">UT Dallas</span> with a B.S. in Software
              Engineering, then interned at Textron Systems before joining JPMC full-time. A few
              years in, I started my M.S. in CS at{' '}
              <span className="text-white font-medium">Georgia Tech</span> on the side — because
              there's always more to learn.
            </p>
            <p>
              Outside of work I build things for fun —{' '}
              <span className="text-cyan-300 font-medium">TripSync</span> came from genuinely
              struggling to plan a group trip. I like building things that solve a real problem,
              even if that problem is just mine.
            </p>
          </div>

          {/* What I focus on */}
          <div
            className={`fade-slide-up ${inView ? 'visible' : ''} space-y-4`}
            style={{ transitionDelay: '300ms' }}
          >
            <p className="text-slate-500 text-sm uppercase tracking-widest font-medium mb-6">
              What I focus on
            </p>

            {[
              {
                label: 'Backend systems',
                desc: 'REST APIs, Spring Boot, auth, async patterns. I like understanding what happens under the hood.',
              },
              {
                label: 'Frontend that works',
                desc: 'React + TypeScript. Clean state management, good UX, no unnecessary complexity.',
              },
              {
                label: 'Shipping to production',
                desc: 'Docker, CI/CD, Railway, Vercel. Getting things live and keeping them stable.',
              },
              {
                label: 'Learning in public',
                desc: "I take on side projects to explore things I don't get to touch at work — new patterns, new stacks.",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="glass rounded-2xl p-5 hover:border-cyan-500/25 transition-all duration-300 hover:-translate-y-0.5 cursor-default"
              >
                <p className="text-white font-semibold text-sm mb-1.5">{item.label}</p>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
