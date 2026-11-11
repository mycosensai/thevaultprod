import { useState } from 'react'
import { Diamond, ChevronDown } from 'lucide-react'
import { COMMISSION_POLICY_SENTENCE, NO_EXTRA_FEES_SENTENCE } from '@/lib/commission-policy'

const faqs = [
  {
    q: 'How does The Vault work?',
    a: 'The Vault is a peer-to-peer marketplace for rare and exclusive collectibles. Sellers list items with detailed descriptions and photos. Buyers can purchase directly using Stripe, cryptocurrency via Coinbase Commerce, or direct Solana wallet transfers. Every transaction is between buyer and seller — The Vault never holds your funds.'
  },
  {
    q: 'What categories of items can I sell?',
    a: 'We specialize in: Fine Jewelry, Coins & Currency, Fine Art, Watches & Timepieces, Antiques & Estate, Sports Memorabilia, and Rare Books. If your item falls outside these categories, contact us and we may be able to accommodate it.'
  },
  {
    q: 'How much does it cost to sell?',
    a: `Our commission is the lowest in the industry. ${COMMISSION_POLICY_SENTENCE} ${NO_EXTRA_FEES_SENTENCE}`
  },
  {
    q: 'What is ProVerify?',
    a: 'ProVerify is our expert verification system, similar to Antiques Roadshow. When you submit an item, 12 world-class specialists review it and score authenticity, value, and condition on a scale of 1-100. You receive a comprehensive consensus report and a blockchain certificate of authenticity.'
  },
  {
    q: 'How does the AI Appraisal work?',
    a: 'Upload clear photos of your item and our AI (powered by GPT-4o) analyzes them against millions of comparable internet sales, auction results, and market data. You receive an instant price estimate with confidence score, market analysis, and recommended listing price.'
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept three payment methods: (1) Credit/Debit cards via Stripe Checkout, (2) Cryptocurrency (BTC, ETH, SOL, USDC, DOGE, LTC) via Coinbase Commerce, and (3) Direct Solana wallet transfers via Phantom, Soul, or Robinhood wallets.'
  },
  {
    q: 'Is my payment information secure?',
    a: 'Absolutely. We never store or process your payment details. All card payments go through Stripe\'s secure infrastructure. Crypto payments are processed by Coinbase Commerce. Wallet transfers are peer-to-peer on the Solana blockchain. We cannot access your funds at any point.'
  },
  {
    q: 'What is the AI Outreach Engine?',
    a: 'When you get an item professionally reviewed through ProVerify, our AI automatically begins a 24/7 outreach campaign to find verified professional buyers interested in your specific item. It continues on a feedback loop until at least 5 interested leads are found, which are then delivered to you.'
  },
  {
    q: 'What is blockchain certification?',
    a: 'A seller can launch a token for a listing on Base through Clanker. The seller signs with their own wallet. The token and its liquidity stay in a Uniswap v4 pool that cannot have liquidity removed. Older certificate records that were not signed on Base are labeled as legacy records.'
  },
  {
    q: 'How do returns work?',
    a: 'Returns are handled between buyer and seller directly. We recommend all sellers provide accurate descriptions and photos. If an item is significantly not as described, contact us within 14 days of delivery and we will mediate a resolution.'
  },
  {
    q: 'Do you hold my funds?',
    a: 'Never. The Vault operates on a zero-funds-held policy. All payments go directly from buyer to seller. We only collect our commission through the payment processor at the time of transaction.'
  },
  {
    q: 'How can I contact support?',
    a: 'Email us anytime at ratchetkrewelabs@gmail.com. We aim to respond within 24 hours. For urgent matters, use the Support page to submit a ticket.'
  },
]

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(null)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">FAQ</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="font-cormorant italic text-lg text-[#C8BC98]">Everything you need to know about The Vault.</p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-[#161616] border border-[#C9A84C]/15">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-[#C9A84C]/5 transition-colors"
              >
                <span className="text-sm text-[#F5EED8] font-medium pr-4">{faq.q}</span>
                <ChevronDown className={`w-4 h-4 text-[#C9A84C] flex-shrink-0 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && (
                <div className="px-5 pb-5">
                  <p className="text-xs text-[#C8BC98] leading-relaxed border-t border-[#C9A84C]/10 pt-4">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center bg-[#161616] border border-[#C9A84C]/20 p-8">
          <h3 className="font-cinzel text-sm tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-3">Still have questions?</h3>
          <p className="text-xs text-[#C8BC98] mb-6">Our support team is ready to help.</p>
          <a href="mailto:ratchetkrewelabs@gmail.com" className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all">
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}
