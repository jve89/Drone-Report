import Header from './components/Header'
import Footer from './components/Footer'
import Hero from './sections/Hero'
import HowItWorks from './sections/HowItWorks'
import WhatYouGet from './sections/WhatYouGet'
import Pricing from './sections/Pricing'
import IntakeForm from './sections/IntakeForm'

export default function App() {
  return (
    <div className="font-sans">
      <Header />
      <main>
        <section id="hero" className="scroll-mt-24"><Hero /></section>
        <section id="what-you-get" className="scroll-mt-24"><WhatYouGet /></section>
        <section id="how-it-works" className="scroll-mt-24"><HowItWorks /></section>
        <section id="pricing" className="scroll-mt-24"><Pricing /></section>
        <section id="intake" className="scroll-mt-24"><IntakeForm /></section>

        {/* Stubs */}
        <section id="case-studies" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">Case studies coming soon.</section>
        <section id="metrics" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">Metrics coming soon.</section>
        <section id="why-choose-us" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">Why choose us coming soon.</section>
        <section id="faq" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">FAQ coming soon.</section>
        <section id="privacy" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">Privacy coming soon.</section>
        <section id="terms" className="py-12 px-6 max-w-5xl mx-auto text-gray-500">Terms coming soon.</section>
      </main>
      <Footer />
    </div>
  )
}
