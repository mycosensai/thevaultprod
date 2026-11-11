import { Link } from 'react-router'
import { useState, useEffect, useRef } from 'react'
import { trpc } from '@/providers/trpc'
import { COMMISSION_TIERS, commissionBreakdown, formatUsd } from '@/lib/commission-policy'
import {
  Diamond, ArrowRight, Sparkles, ShieldCheck, Clock,
  TrendingUp, Gem, Coins, Landmark, Palette, Watch, Trophy, BookOpen,
  ChevronRight, Loader2
} from 'lucide-react'

/* ═══════════════════════════════════════════
   HERO SECTION
   ═══════════════════════════════════════════ */
function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_30%,rgba(201,168,76,0.06)_0%,transparent_70%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_40%_at_80%_70%,rgba(201,168,76,0.04)_0%,transparent_60%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080808] via-[#0a0800] to-[#080808]" />
      </div>

      {/* Particles */}
      <Particles />

      {/* Corner Ornaments */}
      <div className="absolute top-20 left-10 w-32 h-32 border border-[#C9A84C]/15 border-r-0 border-b-0 hidden lg:block" />
      <div className="absolute top-20 right-10 w-32 h-32 border border-[#C9A84C]/15 border-l-0 border-b-0 hidden lg:block" />
      <div className="absolute bottom-20 left-10 w-32 h-32 border border-[#C9A84C]/15 border-r-0 border-t-0 hidden lg:block" />
      <div className="absolute bottom-20 right-10 w-32 h-32 border border-[#C9A84C]/15 border-l-0 border-t-0 hidden lg:block" />

      {/* Content */}
      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-3 px-5 py-2 border border-[#C9A84C]/25 mb-8 animate-fadeIn">
          <span className="w-1.5 h-1.5 bg-[#C9A84C] rounded-full animate-pulse" />
          <span className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] font-medium">
            Est. 2024 &middot; Elite Collector Exchange &middot; AI-Powered
          </span>
        </div>

        <h1 className="font-cinzel text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-[12px] uppercase leading-[0.9] mb-3 animate-fadeInUp"
          style={{ animationDelay: '0.2s' }}>
          <span className="bg-gradient-to-b from-[#FFD97A] via-[#C9A84C] to-[#8A6E2F] bg-clip-text text-transparent">
            The Vault
          </span>
        </h1>

        <p className="font-cinzel text-xs sm:text-sm tracking-[10px] text-[#C8BC98] uppercase mb-6 animate-fadeInUp"
          style={{ animationDelay: '0.4s' }}>
          Elite Collector Exchange
        </p>

        <div className="flex items-center justify-center gap-4 mb-10 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
          <Diamond className="w-2 h-2 text-[#C9A84C] rotate-45" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
        </div>

        <p className="font-cormorant italic text-lg sm:text-xl md:text-2xl text-[#F5EED8] leading-relaxed max-w-2xl mx-auto mb-12 animate-fadeInUp"
          style={{ animationDelay: '0.6s' }}>
          Have you ever wondered what a pawn shop experience would be like{' '}
          <span className="text-[#E8CB7A] not-italic font-medium">
            without getting completely screwed over on fees and commissions?
          </span>{' '}
          Welcome to the exchange that puts collectors first.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fadeInUp" style={{ animationDelay: '0.8s' }}>
          <Link
            to="/sell"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Start Selling
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/browse"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[11px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] hover:-translate-y-0.5 transition-all duration-300"
          >
            Find Treasures
          </Link>
        </div>
      </div>
    </section>
  )
}

function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles: Array<{
      x: number; y: number; size: number; speedY: number; opacity: number; speedOpacity: number
    }> = []

    for (let i = 0; i < 30; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: Math.random() * 1.5 + 0.5,
        speedY: -(Math.random() * 0.5 + 0.2),
        opacity: Math.random() * 0.5 + 0.2,
        speedOpacity: Math.random() * 0.01 + 0.005,
      })
    }

    let animId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach((p) => {
        p.y += p.speedY
        p.opacity += p.speedOpacity
        if (p.opacity > 0.7 || p.opacity < 0.1) p.speedOpacity *= -1
        if (p.y < -10) p.y = canvas.height + 10

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201, 168, 76, ${p.opacity})`
        ctx.fill()
      })
      animId = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
}

/* ═══════════════════════════════════════════
   MARQUEE
   ═══════════════════════════════════════════ */
function MarqueeSection() {
  const items = [
    ...COMMISSION_TIERS.map((tier) => `${tier.rate}% Commission ${tier.range}`),
    'No Listing Fee',
    'AI-Powered Buyer Matching',
    'Verified Collectors Only',
    'Real-Time Market Pricing',
  ]
  const doubled = [...items, ...items]

  return (
    <div className="bg-[#C9A84C] py-3 overflow-hidden">
      <div className="flex whitespace-nowrap animate-[marquee_40s_linear_infinite]">
        {doubled.map((item, i) => (
          <span key={i} className="inline-flex items-center gap-4 px-8">
            <span className="font-cinzel text-[10px] font-bold tracking-[3px] text-[#080808] uppercase">
              {item}
            </span>
            <Diamond className="w-1.5 h-1.5 text-[#080808] rotate-45 flex-shrink-0" />
          </span>
        ))}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COMMISSION CALCULATOR
   ═══════════════════════════════════════════ */
function CalculatorSection() {
  const [value, setValue] = useState('')

  const numValue = parseFloat(value) || 0
  const { rate, commission, payout } = commissionBreakdown(numValue)
  const tiers = COMMISSION_TIERS.map((tier) => ({
    ...tier,
    active: tier.matches(numValue),
  }))

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_50%,rgba(201,168,76,0.04),transparent)]" />
      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-12">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            Transparent Pricing
          </p>
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px] mb-3">
            Commission Calculator
          </h2>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
          <p className="font-cormorant italic text-base text-[#C8BC98]">
            Know exactly what you keep before you list
          </p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/25 p-8 sm:p-10 relative shadow-[0_0_30px_rgba(201,168,76,0.05)]">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {/* Input */}
          <div className="mb-8">
            <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">
              Item Value
            </label>
            <div className="relative">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 font-cinzel text-xl text-[#C9A84C]">$</span>
              <input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="0"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/25 border-b-2 border-b-[#C9A84C] text-[#F5EED8] font-cinzel text-3xl sm:text-4xl font-semibold py-5 pl-12 pr-6 outline-none focus:border-[#C9A84C] focus:shadow-[0_4px_20px_rgba(201,168,76,0.1)] transition-all placeholder:text-[#C9A84C]/20"
              />
            </div>
          </div>

          {/* Tier indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
            {tiers.map((tier) => (
              <div
                key={tier.range}
                className={`p-4 border transition-all ${
                  tier.active
                    ? 'border-[#C9A84C] bg-[#C9A84C]/6 shadow-[0_0_15px_rgba(201,168,76,0.1)]'
                    : 'border-[#C9A84C]/20 bg-[#1E1E1E]'
                }`}
              >
                {tier.active && <div className="w-full h-0.5 bg-[#C9A84C] -mt-4 mb-3" />}
                <div className="font-cinzel text-lg font-bold text-[#C9A84C]">{tier.rate}%</div>
                <div className="text-[8px] tracking-[1px] text-[#C8BC98] uppercase mt-1 leading-relaxed">
                  {tier.range}<br />{tier.label}
                </div>
              </div>
            ))}
          </div>

          {/* Results */}
          <div className="bg-[#1E1E1E] border border-[#C9A84C]/60 p-6">
            <div className="grid grid-cols-3 gap-2">
              <div className="p-4 bg-[#161616] text-center">
                <div className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-2">Item Value</div>
                <div className="font-cinzel text-base sm:text-lg font-bold text-[#E8CB7A]">
                  ${formatUsd(numValue)}
                </div>
              </div>
              <div className="p-4 bg-[#161616] text-center border border-[#C9A84C]/30">
                <div className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-2">Commission ({rate}%)</div>
                <div className="font-cinzel text-lg sm:text-xl font-bold text-[#FFD97A]">
                  ${formatUsd(commission)}
                </div>
              </div>
              <div className="p-4 bg-[#161616] text-center">
                <div className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-2">You Receive</div>
                <div className="font-cinzel text-base sm:text-lg font-bold text-[#E8CB7A]">
                  ${formatUsd(payout)}
                </div>
              </div>
            </div>
          </div>

          {/* Comparison */}
          {numValue > 0 && (
            <div className="mt-6 p-5 border border-[#C9A84C]/20 bg-[#1E1E1E]">
              <p className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] text-center mb-4">
                Commission Comparison
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-[8px] tracking-[2px] text-[#C8BC98] uppercase mb-1">Christie's</div>
                  <div className="font-cinzel text-sm font-semibold text-red-400">
                    ${(numValue * 0.25).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[2px] text-[#C8BC98] uppercase mb-1">Pawn Shop</div>
                  <div className="font-cinzel text-sm font-semibold text-red-400">
                    ${(numValue * 0.40).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[2px] text-[#C8BC98] uppercase mb-1">eBay</div>
                  <div className="font-cinzel text-sm font-semibold text-red-400">
                    ${(numValue * 0.135).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <div className="text-[8px] tracking-[2px] text-[#C8BC98] uppercase mb-1">The Vault</div>
                  <div className="font-cinzel text-sm font-semibold text-emerald-400">
                    ${commission.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/20 text-center">
                <p className="font-cormorant italic text-sm text-emerald-400">
                  You save an estimated{' '}
                  <strong className="font-cinzel font-bold">
                    ${(numValue * 0.25 - commission).toLocaleString('en-US', { minimumFractionDigits: 0 })}
                  </strong>{' '}
                  compared to auction houses
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   HOW IT WORKS
   ═══════════════════════════════════════════ */
function HowItWorksSection() {
  const steps = [
    {
      num: '01',
      icon: <Sparkles className="w-6 h-6" />,
      title: 'AI Appraisal',
      desc: 'Upload photos and describe your item. Our AI analyzes market data across the internet to give you an accurate price estimate.',
    },
    {
      num: '02',
      icon: <ShieldCheck className="w-6 h-6" />,
      title: 'List Your Item',
      desc: 'Create your listing with no listing fee. Commission is 5% under $1,000, 7% from $1,000 to $10,000, and 5% over $10,000.',
    },
    {
      num: '03',
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'AI Finds Buyers',
      desc: 'Our AI agents scan collector networks and marketplaces to find the ideal buyers for your rare item.',
    },
    {
      num: '04',
      icon: <Clock className="w-6 h-6" />,
      title: 'Close the Deal',
      desc: 'Secure checkout with Stripe. Funds released within 48 hours. You keep the majority, we take our fair commission.',
    },
  ]

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0F0F0F] border-t border-[#C9A84C]/15">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">The Process</p>
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            How The Vault Works
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div
              key={step.num}
              className="group p-8 border border-[#C9A84C]/15 bg-[#161616] hover:border-[#C9A84C] hover:bg-[#1E1E1E] hover:-translate-y-2 hover:shadow-[0_0_30px_rgba(201,168,76,0.1)] transition-all duration-400"
            >
              <div className="font-cinzel text-5xl font-black text-[#C9A84C]/10 mb-4 group-hover:text-[#C9A84C]/20 transition-colors">
                {step.num}
              </div>
              <div className="text-[#C9A84C] mb-4">{step.icon}</div>
              <h3 className="font-cinzel text-xs font-semibold tracking-[2px] uppercase text-[#C9A84C] mb-3">
                {step.title}
              </h3>
              <p className="text-xs leading-relaxed text-[#C8BC98] font-light">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   CATEGORIES
   ═══════════════════════════════════════════ */
function CategoriesSection() {
  const { data: categories } = trpc.categories.list.useQuery()

  const iconMap: Record<string, React.ReactNode> = {
    'diamond': <Gem className="w-10 h-10" />,
    'coins': <Coins className="w-10 h-10" />,
    'landmark': <Landmark className="w-10 h-10" />,
    'palette': <Palette className="w-10 h-10" />,
    'watch': <Watch className="w-10 h-10" />,
    'trophy': <Trophy className="w-10 h-10" />,
    'gem': <Diamond className="w-10 h-10" />,
    'book-open': <BookOpen className="w-10 h-10" />,
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">What We Handle</p>
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Categories of Excellence
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1">
          {(categories || []).map((cat) => (
            <Link
              key={cat.id}
              to={`/browse?category=${cat.slug}`}
              className="group relative h-48 sm:h-56 bg-[#161616] border border-[#C9A84C]/15 flex flex-col items-center justify-center p-6 hover:border-[#C9A84C] transition-all duration-300"
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#C9A84C]/8 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="text-[#C9A84C] mb-4 group-hover:scale-110 group-hover:-translate-y-1 transition-transform relative z-10">
                {iconMap[cat.icon || ''] || <Gem className="w-10 h-10" />}
              </div>
              <h3 className="font-cinzel text-[10px] sm:text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase text-center mb-2 relative z-10">
                {cat.name}
              </h3>
              <p className="text-[10px] text-[#C8BC98] tracking-[1px] relative z-10">
                {cat.listingCount?.toLocaleString()} listings
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   FEATURED LISTINGS
   ═══════════════════════════════════════════ */
function FeaturedListingsSection() {
  const { data: listings, isLoading } = trpc.listings.featured.useQuery()

  const badgeStyles: Record<string, string> = {
    verified: 'border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10',
    new: 'border-emerald-500 text-emerald-400 bg-emerald-500/10',
    hot: 'border-red-500 text-red-400 bg-red-500/10',
    offer: 'border-orange-500 text-orange-400 bg-orange-500/10',
  }

  const categoryIcons: Record<string, React.ReactNode> = {
    'Fine Jewelry': <Gem className="w-16 h-16" />,
    'Rare Coins': <Coins className="w-16 h-16" />,
    'Luxury Watches': <Watch className="w-16 h-16" />,
    'Fine Art': <Palette className="w-16 h-16" />,
    'Antiques': <Landmark className="w-16 h-16" />,
    'Sports Memorabilia': <Trophy className="w-16 h-16" />,
  }

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-[#0F0F0F] border-t border-[#C9A84C]/15">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">Currently Available</p>
          <h2 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Featured in The Vault
          </h2>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {(listings || []).slice(0, 6).map((listing) => (
              <Link
                key={listing.id}
                to={`/listing/${listing.id}`}
                className="group bg-[#161616] border border-[#C9A84C]/15 overflow-hidden hover:border-[#C9A84C] hover:-translate-y-1.5 hover:shadow-[0_24px_60px_rgba(0,0,0,0.5),0_0_30px_rgba(201,168,76,0.1)] transition-all duration-400"
              >
                {/* Image area */}
                <div className="h-44 bg-[#1E1E1E] flex items-center justify-center relative border-b border-[#C9A84C]/15">
                  <div className="text-[#C9A84C]/30 group-hover:text-[#C9A84C]/50 transition-colors">
                    {categoryIcons[listing.category?.name || ''] || <Diamond className="w-16 h-16" />}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#080808]/60" />
                  {listing.badge && listing.badge !== 'none' && (
                    <span className={`absolute top-4 right-4 px-3 py-1 text-[7px] tracking-[2px] uppercase border ${badgeStyles[listing.badge] || badgeStyles.verified}`}>
                      {listing.badge}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div className="p-6">
                  <p className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-2">
                    {listing.category?.name || 'Collection'}
                  </p>
                  <h3 className="font-cinzel text-xs font-semibold tracking-[1px] text-[#F5EED8] mb-3 leading-relaxed line-clamp-2">
                    {listing.title}
                  </h3>
                  <p className="text-[11px] text-[#C8BC98] leading-relaxed mb-5 line-clamp-2 font-light">
                    {listing.description}
                  </p>
                  <div className="flex items-end justify-between pt-4 border-t border-[#C9A84C]/15">
                    <div>
                      <div className="font-cinzel text-lg font-bold text-[#C9A84C]">
                        ${Number(listing.price).toLocaleString('en-US')}
                      </div>
                      <div className="text-[8px] tracking-[1px] text-[#8A6E2F] mt-1">
                        Commission: {listing.commissionRate}%
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#C9A84C] group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            to="/browse"
            className="inline-flex items-center gap-2 px-8 py-3.5 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 hover:shadow-[0_0_20px_rgba(201,168,76,0.15)] transition-all duration-300"
          >
            View All Listings
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   CTA SECTION
   ═══════════════════════════════════════════ */
function CTASection() {
  return (
    <section className="py-28 px-4 sm:px-6 lg:px-8 bg-[#0F0F0F] border-t border-[#C9A84C]/15 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(201,168,76,0.06),transparent)]" />
      <div className="max-w-2xl mx-auto text-center relative">
        <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-4">Join The Vault</p>
        <h2 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-black tracking-[6px] mb-4">
          <span className="bg-gradient-to-b from-[#FFD97A] to-[#C9A84C] bg-clip-text text-transparent">
            Your Collection Deserves Better
          </span>
        </h2>
        <div className="flex items-center justify-center gap-3 mb-6">
          <div className="w-16 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
          <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
          <div className="w-16 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
        </div>
        <p className="font-cormorant italic text-lg sm:text-xl text-[#C8BC98] mb-10">
          Join thousands of collectors who've discovered what fair commission actually feels like.
          Upload your item for an AI appraisal today.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/appraisal"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] hover:-translate-y-0.5 transition-all duration-300"
          >
            <Sparkles className="w-4 h-4" />
            Get AI Appraisal
          </Link>
          <Link
            to="/sell"
            className="inline-flex items-center justify-center gap-2 px-10 py-4 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[11px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all duration-300"
          >
            List an Item
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ═══════════════════════════════════════════
   HOME PAGE
   ═══════════════════════════════════════════ */
export default function Home() {
  return (
    <div>
      <HeroSection />
      <MarqueeSection />
      <CalculatorSection />
      <HowItWorksSection />
      <CategoriesSection />
      <FeaturedListingsSection />
      <CTASection />
    </div>
  )
}
