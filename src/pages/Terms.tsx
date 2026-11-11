import { Diamond } from 'lucide-react'
import { COMMISSION_POLICY_SENTENCE, NO_EXTRA_FEES_SENTENCE } from '@/lib/commission-policy'

export default function Terms() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">TERMS OF SERVICE</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="text-xs text-[#8A6E2F]">Last Updated: November 2026</p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 sm:p-12 space-y-8 text-sm text-[#C8BC98] leading-relaxed relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {[
            { title: '1. Acceptance of Terms', text: 'By accessing or using The Vault platform, you agree to be bound by these Terms of Service. If you do not agree, please do not use our services. The Vault is a peer-to-peer marketplace connecting collectors of rare and exclusive items. We do not take possession of, nor do we guarantee, any items listed on the platform.' },
            { title: '2. Eligibility', text: 'You must be at least 18 years old to use The Vault. By using the platform, you represent and warrant that you have the legal capacity to enter into binding contracts. Users under 18 may only use the platform under the supervision of a parent or legal guardian.' },
            { title: '3. Account Registration', text: 'You are responsible for maintaining the confidentiality of your account credentials. You agree to provide accurate and complete information when creating an account. The Vault is not liable for any loss or damage arising from your failure to safeguard your account information.' },
            { title: '4. Buying and Selling', text: 'All transactions on The Vault are conducted directly between buyers and sellers. The Vault serves as a platform facilitator only. We never hold buyer funds. Sellers are responsible for accurately describing items, including condition, provenance, and authenticity. Buyers are responsible for reviewing all item details before purchase.' },
            { title: '5. Fees and Commissions', text: `${COMMISSION_POLICY_SENTENCE} ${NO_EXTRA_FEES_SENTENCE} Commission is collected at the time of sale through our payment processors.` },
            { title: '6. Prohibited Items', text: 'The following may not be listed on The Vault: stolen property, counterfeit items presented as authentic, illegal goods, items that violate intellectual property rights, hazardous materials, live animals, weapons, and any items prohibited by applicable law. We reserve the right to remove any listing without notice.' },
            { title: '7. Authenticity and Provenance', text: 'While The Vault offers AI-powered appraisals and ProVerify expert verification, these services provide professional opinions, not guarantees. The Vault is not responsible for disputes regarding authenticity. Buyers and sellers should conduct their own due diligence. Blockchain certificates are provided as records of verification, not as legal warranties.' },
            { title: '8. Zero Funds Held Policy', text: 'The Vault never holds, custodies, or manages user funds. All payments are processed directly between buyers and sellers through Stripe, Coinbase Commerce, or Solana blockchain transfers. The Vault is not a money services business, escrow service, or financial institution.' },
            { title: '9. Limitation of Liability', text: 'THE VAULT IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE VAULT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNT OF COMMISSION FEES PAID BY YOU IN THE PRECEDING 12 MONTHS.' },
            { title: '10. Dispute Resolution', text: 'Any dispute arising from these Terms shall first be addressed through good faith negotiation. If unresolved, disputes shall be submitted to binding arbitration in accordance with the rules of the American Arbitration Association. Each party shall bear its own costs.' },
            { title: '11. Modifications', text: 'The Vault reserves the right to modify these Terms at any time. Changes will be effective immediately upon posting. Continued use of the platform constitutes acceptance of the modified Terms.' },
            { title: '12. Contact', text: 'For questions about these Terms, contact us at ratchetkrewelabs@gmail.com.' },
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
