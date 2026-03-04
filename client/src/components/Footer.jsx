import React, { useState } from 'react'
import { BsRobot } from 'react-icons/bs'
import { subscribeToNewsletter } from '../services/newsletter'

import logo from '../assets/image.png'

function Footer() {
  const creators = [
    { name: "Gautam Sharma", href: "https://www.linkedin.com/in/gautam-sharma-188516330?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
    { name: "Vansh Harit", href: "https://www.linkedin.com/in/vansh-harit-5590512b2?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
    { name: "Garv Kathuria", href: "https://www.linkedin.com/in/garv-kathuria-a510503a9?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
    { name: "Diwakar Bhagat", href: "https://www.linkedin.com/in/diwakarbhagat/" },
    { name: "Karan Shakya", href: "https://www.linkedin.com/in/karan-995280330?utm_source=share&utm_campaign=share_via&utm_content=profile&utm_medium=android_app" },
  ]

  const [email, setEmail] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [statusType, setStatusType] = useState("neutral")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault()
    if (isSubmitting) return

    try {
      setIsSubmitting(true)
      setStatusMessage("")

      const result = await subscribeToNewsletter(email, "footer")

      if (result.status === "exists") {
        setStatusType("info")
        setStatusMessage("This email is already subscribed.")
      } else {
        setStatusType("success")
        setStatusMessage("Subscribed successfully. Thank you!")
        setEmail("")
      }
    } catch (error) {
      setStatusType("error")
      setStatusMessage(error?.message || "Failed to subscribe. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <footer className='relative z-10 flex justify-center px-3 sm:px-4 pb-6 sm:pb-10 pt-8 sm:pt-10'>
      <div className='w-full max-w-6xl glass-card p-4 sm:p-6 md:p-8'>
        <div className='flex justify-center items-center gap-3 mb-4'>
          <div className='h-8 w-8 overflow-hidden rounded-lg bg-black text-white shadow-md shadow-black/20'>
            <img src={logo} alt="HireOX Logo" className="h-full w-full object-cover" />
          </div>
          <h2 className='font-semibold text-lg text-slate-100'>HireOX.AI</h2>
        </div>

        <p className='text-slate-400 text-sm leading-relaxed max-w-2xl mx-auto text-center px-1'>
          AI-powered interview preparation platform designed to improve communication skills, technical depth, and professional confidence.
        </p>

        <form
          onSubmit={handleNewsletterSubmit}
          className='mt-6 flex flex-col sm:flex-row gap-3 max-w-xl mx-auto w-full'
        >
          <input
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder='Enter your email for newsletter updates'
            className='w-full sm:flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#5100FF] text-slate-200 placeholder-slate-500'
          />
          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full sm:w-auto px-5 py-3 rounded-xl bg-[#5100FF] text-white hover:opacity-90 transition disabled:opacity-70'
          >
            {isSubmitting ? "Subscribing..." : "Subscribe"}
          </button>
        </form>

        {statusMessage && (
          <p
            className={`text-center text-sm mt-3 ${statusType === "error"
              ? "text-red-400"
              : statusType === "success"
                ? "text-[#A78BFA]"
                : "text-slate-400"
              }`}
          >
            {statusMessage}
          </p>
        )}

        <div className='mt-8 pt-5 border-t border-white/10 text-center text-slate-500 space-y-3'>
          <p className='text-xs sm:text-sm'>All rights reserved © 2026 to HireOX.AI.</p>

          <p className='text-xs sm:text-sm'>Cooked By Excommunicado.</p>

          <div className='mx-auto flex flex-wrap justify-center items-center gap-x-6 gap-y-3 text-xs sm:text-sm w-full max-w-4xl'>
            {creators.map((creator) => (
              <a
                key={creator.name}
                href={creator.href}
                target='_blank'
                rel='noopener'
                className='hover:text-[#A78BFA] underline text-center break-words transition-colors'
                title={creator.name}
              >
                {creator.name}
              </a>
            ))}
          </div>
        </div>

      </div>
    </footer>
  )
}

export default Footer
