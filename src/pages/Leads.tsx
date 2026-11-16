import { useParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { isCapabilityToken } from '@/lib/capability-token'
import {
  Diamond, ArrowLeft, Loader2, Users, Star, CheckCircle2, Target,
  Clock, Mail, TrendingUp
} from 'lucide-react'

export default function Leads() {
  const { id } = useParams<{ id: string }>()
  const token = isCapabilityToken(id) ? id : ""

  const { data: campaignData, isLoading, refetch } = trpc.outreach.getCampaign.useQuery(
    { id: token },
    { enabled: Boolean(token), refetchInterval: token ? 8000 : false }
  )

  const runNext = trpc.outreach.runNextRound.useMutation({
    onSuccess: () => { refetch(); },
  })

  const deliver = trpc.outreach.deliverLeads.useMutation({
    onSuccess: () => refetch(),
  })

  if (isLoading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" /></div>

  const { campaign, leads, logs } = campaignData || { campaign: null, leads: [], logs: [] }

  if (!token || !campaign) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <p className="font-cinzel text-lg text-[#C8BC98] tracking-[3px]">Campaign not found</p>
        <Link to="/proverify" className="text-[#C9A84C] text-xs mt-4 inline-block hover:underline">Start a new verification</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Home
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#C9A84C]/25 mb-4">
            <Target className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-[8px] tracking-[4px] uppercase text-[#C9A84C]">AI Outreach Results</span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">Professional Leads</h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
          {campaign && (
            <p className="text-[10px] text-[#8A6E2F] tracking-[2px] mt-3">
              Item: <span className="text-[#C8BC98]">{campaign.itemName}</span> &middot; Category: <span className="text-[#C8BC98]">{campaign.category}</span>
            </p>
          )}
        </div>

        {/* Campaign Status */}
        {campaign && (
          <div className="bg-[#161616] border border-[#C9A84C]/25 p-6 mb-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-[#1E1E1E] text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target className="w-3 h-3 text-[#C9A84C]" />
                  <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase">Target</p>
                </div>
                <p className="font-cinzel text-2xl font-bold text-[#C9A84C]">{campaign.targetProfessionals}</p>
              </div>
              <div className="p-4 bg-[#1E1E1E] text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Users className="w-3 h-3 text-emerald-400" />
                  <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase">Found</p>
                </div>
                <p className="font-cinzel text-2xl font-bold text-emerald-400">{campaign.foundLeads}</p>
              </div>
              <div className="p-4 bg-[#1E1E1E] text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp className="w-3 h-3 text-[#C9A84C]" />
                  <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase">Outreach</p>
                </div>
                <p className="font-cinzel text-2xl font-bold text-[#C9A84C]">{campaign.outreachCount}</p>
              </div>
              <div className="p-4 bg-[#1E1E1E] text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Clock className="w-3 h-3 text-[#C9A84C]" />
                  <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase">Status</p>
                </div>
                <p className={`font-cinzel text-lg font-bold ${campaign.status === 'completed' ? 'text-emerald-400' : campaign.status === 'running' ? 'text-[#C9A84C]' : 'text-[#8A6E2F]'}`}>
                  {campaign.status?.replace('_', ' ')?.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-4">
              <div className="h-2 bg-[#1E1E1E] border border-[#C9A84C]/15 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#C9A84C] to-[#8A6E2F] transition-all duration-500"
                  style={{ width: `${Math.min(100, (campaign.foundLeads / campaign.targetProfessionals) * 100)}%` }} />
              </div>
              <p className="text-[9px] text-[#8A6E2F] mt-1 text-right">{Math.round((campaign.foundLeads / campaign.targetProfessionals) * 100)}% complete</p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 justify-center">
              {campaign.status === 'running' && campaign.foundLeads < campaign.targetProfessionals && (
                <button onClick={() => runNext.mutate({ id: token })} disabled={runNext.isPending}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] disabled:opacity-50 transition-all">
                  {runNext.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {runNext.isPending ? 'Searching...' : 'Find More Leads'}
                </button>
              )}
              {campaign.foundLeads >= campaign.targetProfessionals && !leads.every((l: any) => l.isDelivered) && (
                <button onClick={() => deliver.mutate({ id: token })} disabled={deliver.isPending}
                  className="flex items-center gap-2 px-6 py-3 border border-emerald-500 text-emerald-400 font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-emerald-500/10 disabled:opacity-50 transition-all">
                  {deliver.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {deliver.isPending ? 'Delivering...' : 'Deliver All Leads'}
                </button>
              )}
            </div>

            {campaign.status === 'running' && (
              <p className="text-center text-[10px] text-[#8A6E2F] mt-3">AI is working around the clock. Check back for new leads.</p>
            )}
          </div>
        )}

        {/* Leads Grid */}
        {leads && leads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {leads.map((lead: any) => (
              <div key={lead.id} className="bg-[#161616] border border-[#C9A84C]/15 p-6 hover:border-[#C9A84C]/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center">
                      <Users className="w-5 h-5 text-[#C9A84C]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#F5EED8] font-medium">{lead.name}</p>
                      <p className="text-[9px] text-[#8A6E2F]">{lead.title}</p>
                    </div>
                  </div>
                  {lead.isDelivered && (
                    <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/25 text-[8px] text-emerald-400 tracking-[1px] uppercase">
                      <CheckCircle2 className="w-3 h-3 inline mr-1" />Delivered
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#C8BC98] mb-1">{lead.institution}</p>
                <p className="text-[10px] text-[#8A6E2F] mb-3">Specialty: {lead.specialty}</p>

                {lead.estimatedOffer && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-[#1E1E1E]">
                    <Star className="w-3.5 h-3.5 text-[#C9A84C]" />
                    <span className="text-[10px] text-[#C8BC98]">Estimated offer:</span>
                    <span className="font-cinzel text-sm font-bold text-[#C9A84C]">${Number(lead.estimatedOffer).toLocaleString()}</span>
                  </div>
                )}

                {lead.interestLevel && (
                  <div className="mb-3">
                    <span className={`text-[9px] tracking-[2px] uppercase font-cinzel font-semibold ${
                      lead.interestLevel === 'very_interested' ? 'text-emerald-400' :
                      lead.interestLevel === 'interested' ? 'text-[#C9A84C]' :
                      'text-[#8A6E2F]'
                    }`}>
                      {lead.interestLevel.replace('_', ' ')}
                    </span>
                  </div>
                )}

                {lead.contactMessage && (
                  <div className="p-3 bg-[#C9A84C]/5 border border-[#C9A84C]/10 mb-3">
                    <p className="text-[10px] text-[#C8BC98] italic leading-relaxed">"{lead.contactMessage}"</p>
                  </div>
                )}

                {lead.notes && <p className="text-[10px] text-[#8A6E2F] mb-2">{lead.notes}</p>}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#C9A84C]/10">
                  <Mail className="w-3 h-3 text-[#8A6E2F]" />
                  <a href="mailto:ratchetkrewelabs@gmail.com" className="text-[9px] text-[#C9A84C] hover:underline tracking-[1px]">
                    Contact via Vault Support
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16 border border-[#C9A84C]/15 bg-[#161616]">
            <Target className="w-12 h-12 text-[#C9A84C]/20 mx-auto mb-4" />
            <p className="font-cinzel text-sm text-[#C8BC98] tracking-[2px] uppercase mb-2">No Leads Yet</p>
            <p className="text-xs text-[#8A6E2F] mb-4">AI is searching for interested professionals</p>
            {campaign && campaign.status === 'running' && (
              <button onClick={() => runNext.mutate({ id: token })} disabled={runNext.isPending}
                className="px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold">
                {runNext.isPending ? 'Searching...' : 'Search Now'}
              </button>
            )}
          </div>
        )}

        {/* Outreach Logs */}
        {logs && logs.length > 0 && (
          <div className="mt-8">
            <h2 className="font-cinzel text-xs tracking-[4px] uppercase text-[#C9A84C] font-semibold mb-4">Outreach Activity Log</h2>
            <div className="space-y-2">
              {logs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center gap-3 p-3 bg-[#161616] border border-[#C9A84C]/10 text-[10px]">
                  <div className={`w-2 h-2 rounded-full ${log.status === 'interested' ? 'bg-emerald-400' : log.status === 'contacted' ? 'bg-[#C9A84C]' : 'bg-[#8A6E2F]'}`} />
                  <span className="text-[#C8BC98] flex-1">
                    <span className="text-[#F5EED8] font-medium">{log.professionalName}</span> &middot; {log.professionalTitle} &middot; {log.institution}
                  </span>
                  <span className={`tracking-[1px] uppercase ${log.status === 'interested' ? 'text-emerald-400' : 'text-[#8A6E2F]'}`}>
                    {log.status}
                  </span>
                  <span className="text-[#8A6E2F]">#{log.attemptNumber}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
