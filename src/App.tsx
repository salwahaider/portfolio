import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Experience from './components/Experience'
import Projects from './components/Projects'
import Skills from './components/Skills'
import Contact from './components/Contact'
import Footer from './components/Footer'
import GradientDivider from './components/GradientDivider'

export default function App() {
  return (
    <div className="bg-[#06030f] text-white min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <GradientDivider />
        <About />
        <GradientDivider />
        <Experience />
        <GradientDivider />
        <Projects />
        <GradientDivider />
        <Skills />
        <GradientDivider />
        <Contact />
      </main>
      <Footer />
    </div>
  )
}
