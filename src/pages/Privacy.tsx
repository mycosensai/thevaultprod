import { Diamond } from 'lucide-react'

export default function Privacy() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">PRIVACY POLICY</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="text-xs text-[#8A6E2F]">Last Updated: April 2026</p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 sm:p-12 space-y-8 text-sm text-[#C8BC98] leading-relaxed relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {[
            { title: '1. Information We Collect', text: 'We collect information you provide directly: name, email address, profile information, and item listings. We also collect payment information through Stripe and Coinbase Commerce — The Vault never stores your credit card numbers or cryptocurrency private keys. We collect usage data including IP addresses, browser types, and pages visited to improve our platform.' },
            { title: '2. How We Use Your Information', text: 'We use your information to: provide and improve our services, process transactions, send notifications about your account and listings, facilitate the AI appraisal and ProVerify services, generate blockchain certificates, and comply with legal obligations. We do not sell your personal information to third parties.' },
            { title: '3. AI Appraisal Data', text: 'Photos uploaded for AI appraisal are processed by our systems to generate valuations. We may retain these images to improve our AI models. Images are stored securely and are not shared publicly unless you choose to list the item. You can request deletion of your appraisal data at any time by contacting us.' },
            { title: '4. Payment Information', text: 'All payment processing is handled by Stripe (for card payments) and Coinbase Commerce (for cryptocurrency). The Vault does not store, process, or have access to your payment credentials. We only receive confirmation of payment status from these processors.' },
            { title: '5. Blockchain Data', text: 'When you launch a token, the item name, description, and your wallet address are written to a public Base transaction through Clanker. That data is immutable and publicly visible. Direct Solana checkout payments are also public. Do not include sensitive personal information in item names or descriptions.' },
            { title: '6. Data Security', text: 'We implement industry-standard security measures including HTTPS encryption, secure database connections, rate limiting, and input sanitization. However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.' },
            { title: '7. Third-Party Services', text: 'We use third-party services including OpenAI (for AI appraisals), Stripe (for payments), Coinbase Commerce (for crypto payments), and Solana blockchain infrastructure. Each has its own privacy policy. We are not responsible for the privacy practices of these third parties.' },
            { title: '8. Your Rights', text: 'You have the right to: access the personal information we hold about you, request correction of inaccurate information, request deletion of your data (subject to legal obligations), opt out of marketing communications, and export your data. Contact ratchetkrewelabs@gmail.com to exercise these rights.' },
            { title: '9. Data Retention', text: 'We retain your personal information for as long as your account is active or as needed to provide services. Transaction records are retained for 7 years for tax and legal compliance. You may request deletion of your account and associated data at any time.' },
            { title: '10. Cookies', text: 'We use cookies and similar technologies to maintain your session, remember preferences, and analyze platform usage. You can control cookies through your browser settings. Disabling cookies may affect platform functionality.' },
            { title: '11. Changes to This Policy', text: 'We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Continued use of the platform after changes constitutes acceptance of the updated policy.' },
            { title: '12. Contact Us', text: 'For privacy-related questions or requests, contact us at ratchetkrewelabs@gmail.com.' },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="font-cinzel text-xs tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-3">{section.title}</h2>
              <p>{section.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
