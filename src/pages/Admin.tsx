import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '@/hooks/useAuth'
import { trpc } from '@/providers/trpc'
import {
  Diamond, Users, ShoppingBag, BarChart3, Activity,
  Loader2, ArrowLeft, TrendingUp, DollarSign, Package, Mail
} from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const { isAuthenticated, isAdmin, isLoading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !isAdmin)) {
      navigate('/')
    }
  }, [isAuthenticated, isAdmin, authLoading, navigate])

  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.useQuery(undefined, {
    enabled: isAdmin,
  })
  const { data: tickets } = trpc.support.list.useQuery(undefined, {
    enabled: isAdmin,
  })

  if (authLoading || statsLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (!isAdmin) return null

  const statCards = [
    { label: 'Total Users', value: stats?.counts.users || 0, icon: <Users className="w-5 h-5" />, color: 'text-blue-400' },
    { label: 'Listings', value: stats?.counts.listings || 0, icon: <Package className="w-5 h-5" />, color: 'text-[#C9A84C]' },
    { label: 'Appraisals', value: stats?.counts.appraisals || 0, icon: <BarChart3 className="w-5 h-5" />, color: 'text-purple-400' },
    { label: 'Transactions', value: stats?.counts.transactions || 0, icon: <TrendingUp className="w-5 h-5" />, color: 'text-emerald-400' },
    { label: 'AI Agent Runs', value: stats?.counts.agentRuns || 0, icon: <Activity className="w-5 h-5" />, color: 'text-orange-400' },
    { label: 'Revenue', value: `$${(stats?.revenue || 0).toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, color: 'text-[#FFD97A]' },
  ]

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-3"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Site
            </Link>
            <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">
              Admin Dashboard
            </h1>
          </div>
          <div className="w-10 h-10 border border-[#C9A84C] rotate-45 flex items-center justify-center">
            <Diamond className="w-4 h-4 text-[#C9A84C] -rotate-45" />
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-10">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="bg-[#161616] border border-[#C9A84C]/15 p-5 hover:border-[#C9A84C]/40 transition-all"
            >
              <div className={`${card.color} mb-3`}>{card.icon}</div>
              <div className="font-cinzel text-lg font-bold text-[#F5EED8] mb-1">{card.value}</div>
              <div className="text-[8px] tracking-[2px] uppercase text-[#8A6E2F]">{card.label}</div>
            </div>
          ))}
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/15 p-6 mb-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-cinzel text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase">Support tickets</h2>
            <Mail className="w-4 h-4 text-[#8A6E2F]" />
          </div>
          <div className="space-y-3">
            {(tickets || []).map((ticket) => (
              <div key={ticket.id} className="p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-[#F5EED8]">{ticket.name}</p>
                  <p className="text-[10px] uppercase tracking-[2px] text-[#C9A84C]">{ticket.topic}</p>
                </div>
                <a href={`mailto:${ticket.email}`} className="text-[10px] text-[#C9A84C] hover:underline break-all">{ticket.email}</a>
                <p className="mt-2 text-[11px] text-[#C8BC98] whitespace-pre-wrap break-words">{ticket.message}</p>
              </div>
            ))}
            {(!tickets || tickets.length === 0) && (
              <p className="text-xs text-[#8A6E2F] text-center py-6">No tickets yet</p>
            )}
          </div>
        </div>

        {/* Recent Listings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase">
                Recent Listings
              </h2>
              <ShoppingBag className="w-4 h-4 text-[#8A6E2F]" />
            </div>
            <div className="space-y-3">
              {(stats?.recentListings || []).map((listing: any) => (
                <div key={listing.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#F5EED8] truncate">{listing.title}</p>
                    <p className="text-[10px] text-[#8A6E2F]">{listing.status} &middot; {listing.condition?.replace('_', ' ')}</p>
                  </div>
                  <span className="font-cinzel text-xs font-bold text-[#C9A84C] ml-3">
                    ${Number(listing.price).toLocaleString()}
                  </span>
                </div>
              ))}
              {(!stats?.recentListings || stats.recentListings.length === 0) && (
                <p className="text-xs text-[#8A6E2F] text-center py-6">No listings yet</p>
              )}
            </div>
          </div>

          <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-cinzel text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase">
                Recent Appraisals
              </h2>
              <BarChart3 className="w-4 h-4 text-[#8A6E2F]" />
            </div>
            <div className="space-y-3">
              {(stats?.recentAppraisals || []).map((appraisal: any) => (
                <div key={appraisal.id} className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-[#F5EED8] truncate">{appraisal.itemName}</p>
                    <p className="text-[10px] text-[#8A6E2F]">{appraisal.category} &middot; {appraisal.status}</p>
                  </div>
                  <span className="font-cinzel text-xs font-bold text-[#C9A84C] ml-3">
                    ${appraisal.estimatedValue ? Number(appraisal.estimatedValue).toLocaleString() : 'Pending'}
                  </span>
                </div>
              ))}
              {(!stats?.recentAppraisals || stats.recentAppraisals.length === 0) && (
                <p className="text-xs text-[#8A6E2F] text-center py-6">No appraisals yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="mt-8 bg-[#161616] border border-[#C9A84C]/15 p-8">
          <h2 className="font-cinzel text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase mb-6">
            Platform Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-[#1E1E1E] border border-[#C9A84C]/10">
              <div className="font-cinzel text-3xl font-bold text-[#C9A84C] mb-2">
                {((stats?.counts.listings || 0) > 0 ? (stats?.counts.transactions || 0) / (stats?.counts.listings || 1) * 100 : 0).toFixed(0)}%
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-[#8A6E2F]">Sell-Through Rate</p>
            </div>
            <div className="text-center p-6 bg-[#1E1E1E] border border-[#C9A84C]/10">
              <div className="font-cinzel text-3xl font-bold text-emerald-400 mb-2">
                ${(stats?.counts.transactions || 0) > 0 ? ((stats?.revenue || 0) / (stats?.counts.transactions || 1)).toFixed(0) : 0}
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-[#8A6E2F]">Avg. Transaction</p>
            </div>
            <div className="text-center p-6 bg-[#1E1E1E] border border-[#C9A84C]/10">
              <div className="font-cinzel text-3xl font-bold text-purple-400 mb-2">
                {stats?.counts.agentRuns || 0}
              </div>
              <p className="text-[9px] tracking-[2px] uppercase text-[#8A6E2F]">AI Analyses Run</p>
            </div>
          </div>
        </div>

        {/* AI Agent Port Section */}
        <div className="mt-8 bg-[#161616] border border-[#C9A84C]/15 p-8 relative">
          <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-[#C9A84C]" />
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0">
              <Activity className="w-6 h-6 text-[#C9A84C]" />
            </div>
            <div>
              <h2 className="font-cinzel text-sm font-semibold tracking-[3px] text-[#C9A84C] uppercase mb-2">
                AI Agent System Port
              </h2>
              <p className="text-xs text-[#C8BC98] leading-relaxed mb-4 max-w-xl">
                The AI agent system is designed to be extensible. Future integrations will allow
                third-party AI agents to connect to The Vault's marketplace API to find buyers for
                listed items using both conventional (marketplace listings, collector networks) and
                unconventional (social media targeting, private club outreach, cross-platform matching) methods.
              </p>
              <div className="flex gap-2">
                <span className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-[9px] text-emerald-400 tracking-[1px]">
                  Buyer Finder: Active
                </span>
                <span className="px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[9px] text-[#C9A84C] tracking-[1px]">
                  Market Analyzer: Active
                </span>
                <span className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/25 text-[9px] text-purple-400 tracking-[1px]">
                  API: Ready for agents
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
