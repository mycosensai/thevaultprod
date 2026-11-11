import { Link } from 'react-router'
import { Diamond, ShieldCheck, Globe, Users, Award } from 'lucide-react'
import { COMMISSION_TIERS, NO_EXTRA_FEES_SENTENCE } from '@/lib/commission-policy'

export default function About() {
  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-6">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl font-bold text-[#F5EED8] tracking-[6px] mb-4">ABOUT THE VAULT</h1>
          <div className="w-16 h-px bg-[#C9A84C] mx-auto mb-6" />
          <p className="font-cormorant italic text-xl text-[#C8BC98] max-w-2xl mx-auto leading-relaxed">
            The elite collector exchange reimagined for the modern era.
          </p>
        </div>

        {/* Story */}
        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 sm:p-12 mb-12 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />
          <h2 className="font-cinzel text-lg font-bold text-[#C9A84C] tracking-[4px] mb-6">OUR STORY</h2>
          <div className="space-y-4 text-[#C8BC98] text-sm leading-relaxed">
            <p>The Vault was born from a simple frustration: the world of rare collectibles, fine art, and luxury goods has been dominated by opaque auction houses, exploitative pawn shops, and platforms that treat collectors like transactions rather than partners.</p>
            <p>We asked ourselves: what would a collector-first marketplace look like? One where the commission structure rewards higher-value sales, where AI can appraise your treasures with museum-grade accuracy, and where blockchain certification proves authenticity forever.</p>
            <p>That vision became The Vault — the most technologically advanced collector exchange in the world.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Globe, label: 'Countries Served', value: '40+' },
            { icon: ShieldCheck, label: 'Items Verified', value: '12,000+' },
            { icon: Users, label: 'Active Collectors', value: '8,500+' },
            { icon: Award, label: 'Expert Network', value: '200+' },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#161616] border border-[#C9A84C]/15 p-6 text-center">
              <stat.icon className="w-5 h-5 text-[#C9A84C] mx-auto mb-3" />
              <div className="font-cinzel text-2xl font-bold text-[#FFD97A] mb-1">{stat.value}</div>
              <div className="text-[10px] tracking-[2px] uppercase text-[#8A6E2F]">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
          {[
            { title: 'AI-Powered Appraisals', desc: 'Upload photos and receive instant market analysis powered by GPT-4o, trained on millions of comparable sales.' },
            { title: 'ProVerify Expert Network', desc: '12 world-class specialists grade your items on authenticity, value, and condition — just like Antiques Roadshow.' },
            { title: 'Blockchain Certification', desc: 'Every verified item receives a permanent Solana blockchain certificate with smart contract and token ID.' },
            { title: 'Zero Funds Held', desc: 'We never touch your money. All transactions are peer-to-peer. Wallet-to-wallet. Direct and secure.' },
            { title: 'AI Outreach Engine', desc: 'Our AI works 24/7 to find verified professional buyers for your items, delivering 5+ qualified leads.' },
            { title: 'Multi-Currency Payments', desc: 'Pay with Stripe (card), Coinbase Commerce (BTC, ETH, SOL, USDC), or direct Solana wallet transfers.' },
          ].map((feature) => (
            <div key={feature.title} className="bg-[#161616] border border-[#C9A84C]/15 p-6">
              <h3 className="font-cinzel text-xs tracking-[3px] uppercase text-[#C9A84C] font-semibold mb-3">{feature.title}</h3>
              <p className="text-xs text-[#C8BC98] leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* Commission Highlight */}
        <div className="bg-[#161616] border border-[#C9A84C]/20 p-8 text-center mb-12 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />
          <h2 className="font-cinzel text-lg font-bold text-[#C9A84C] tracking-[4px] mb-4">COMMISSION STRUCTURE</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mt-6">
            {COMMISSION_TIERS.map((tier) => (
              <div key={tier.range}>
                <div className="font-cinzel text-3xl font-bold text-[#FFD97A]">{tier.rate}%</div>
                <div className="text-[10px] tracking-[2px] uppercase text-[#8A6E2F] mt-1">{tier.range}</div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#8A6E2F] mt-6 italic">
            {NO_EXTRA_FEES_SENTENCE} The lowest fees in the luxury collectibles market. We make our money on volume, not margins.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link to="/browse" className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all">
            Start Exploring
          </Link>
        </div>
      </div>
    </div>
  )
}
