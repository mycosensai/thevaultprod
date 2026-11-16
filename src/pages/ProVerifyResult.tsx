import { useParams, Link } from 'react-router'
import { isCapabilityToken } from '@/lib/capability-token'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  ArrowLeft, Loader2, Award, Star, ShieldCheck, AlertTriangle,
  CheckCircle2, XCircle, HelpCircle
} from 'lucide-react'

const verdictColors: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  genuine: { color: 'text-emerald-400', label: 'Genuine', icon: <CheckCircle2 className="w-6 h-6" /> },
  likely_genuine: { color: 'text-emerald-300', label: 'Likely Genuine', icon: <CheckCircle2 className="w-6 h-6" /> },
  uncertain: { color: 'text-[#C9A84C]', label: 'Uncertain', icon: <HelpCircle className="w-6 h-6" /> },
  likely_reproduction: { color: 'text-orange-400', label: 'Likely Reproduction', icon: <AlertTriangle className="w-6 h-6" /> },
  reproduction: { color: 'text-red-400', label: 'Reproduction', icon: <XCircle className="w-6 h-6" /> },
}

function ScoreRing({ score, label, color }: { score: number; label: string; color: string }) {
  const pct = Math.min(100, Math.max(0, score))
  const circumference = 2 * Math.PI * 38
  const offset = circumference - (pct / 100) * circumference
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 84 84">
          <circle cx="42" cy="42" r="38" stroke="#1E1E1E" strokeWidth="6" fill="none" />
          <circle cx="42" cy="42" r="38" stroke={color} strokeWidth="6" fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-cinzel text-xl font-bold text-[#F5EED8]">{Math.round(pct)}</span>
        </div>
      </div>
      <span className="text-[8px] tracking-[3px] uppercase text-[#8A6E2F] mt-2">{label}</span>
    </div>
  )
}

export default function ProVerifyResult() {
  const { id } = useParams<{ id: string }>()
  const token = isCapabilityToken(id) ? id : ""

  const { data: app, isLoading } = trpc.expert.getApplication.useQuery(
    { id: token },
    { enabled: Boolean(token), refetchInterval: token ? 5000 : false },
  )
  const [runningReview, setRunningReview] = useState(false)

  const runReview = trpc.expert.runExpertReview.useMutation({ onSuccess: () => setRunningReview(false) })
  const generateConsensus = trpc.expert.generateConsensus.useMutation()

  const hasExperts = (app?.assignedExpertIds as number[] || []).length > 0
  const hasReviews = (app?.reviews || []).length > 0
  const hasConsensus = !!app?.consensus

  const handleRunReview = () => {
    setRunningReview(true)
    runReview.mutate({ id: token })
  }

  const handleConsensus = () => {
    generateConsensus.mutate({ id: token })
  }

  if (isLoading) return <div className="min-h-screen pt-32 flex justify-center"><Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" /></div>

  if (!app) return (
    <div className="min-h-screen pt-32 px-4 text-center">
      <p className="font-cinzel text-lg text-[#C8BC98] tracking-[3px]">Application Not Found</p>
      <Link to="/proverify" className="text-[#C9A84C] text-xs mt-4 inline-block hover:underline">Submit New Item</Link>
    </div>
  )

  const verdict = verdictColors[app.consensus?.consensusVerdict || 'uncertain'] || verdictColors.uncertain
  const authScore = Number(app.consensus?.consensusAuthenticity || 0)
  const valScore = Number(app.consensus?.consensusValue || 0)
  const condScore = Number(app.consensus?.consensusCondition || 0)

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link to="/proverify" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> ProVerify
        </Link>

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#C9A84C]/25 mb-4">
            <Award className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-[8px] tracking-[4px] uppercase text-[#C9A84C]">Expert Verification Report</span>
          </div>
          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px] mb-2">{app.itemName}</h1>
          <p className="text-[10px] text-[#8A6E2F] tracking-[3px] uppercase">{app.category} &middot; Case #{app.id} &middot; {app.status?.replace('_', ' ')}</p>
        </div>

        {/* Action Buttons */}
        {app.status !== 'completed' && (
          <div className="flex flex-wrap gap-3 justify-center mb-10">
            {hasExperts && !hasReviews && (
              <button onClick={handleRunReview} disabled={runningReview}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] disabled:opacity-50 transition-all">
                {runningReview ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4" />}
                {runningReview ? 'Processing Reviews...' : 'Start Expert Reviews'}
              </button>
            )}
            {hasReviews && !hasConsensus && (
              <button onClick={handleConsensus} disabled={generateConsensus.isPending}
                className="flex items-center gap-2 px-6 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 disabled:opacity-50 transition-all">
                {generateConsensus.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Generate Consensus Report
              </button>
            )}
          </div>
        )}

        {/* Consensus Results */}
        {hasConsensus && (
          <div className="bg-[#161616] border border-[#C9A84C]/25 p-8 sm:p-10 relative mb-8">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

            {/* Score Rings */}
            <div className="grid grid-cols-3 gap-6 justify-items-center mb-8">
              <ScoreRing score={authScore} label="Authenticity" color="#10B981" />
              <ScoreRing score={valScore} label="Value" color="#C9A84C" />
              <ScoreRing score={condScore} label="Condition" color="#3B82F6" />
            </div>

            {/* Verdict */}
            <div className="text-center mb-8">
              <div className={`inline-flex items-center gap-2 px-5 py-2 border ${verdict.color.replace('text', 'border')} bg-opacity-5 bg-current mb-3`}>
                <span className={verdict.color}>{verdict.icon}</span>
                <span className={`font-cinzel text-xs tracking-[4px] uppercase font-bold ${verdict.color}`}>{verdict.label}</span>
              </div>
              <p className="text-[10px] text-[#8A6E2F] tracking-[2px]">Based on {app.consensus?.expertCount} independent expert review{Number(app.consensus?.expertCount) !== 1 ? 's' : ''}</p>
            </div>

            {/* Value Estimate */}
            <div className="grid grid-cols-3 gap-2 mb-8">
              <div className="p-4 bg-[#1E1E1E] text-center">
                <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase mb-1">Est. Value Range</p>
                <p className="font-cinzel text-sm font-bold text-[#C9A84C]">${Number(app.consensus?.estimatedValueLow || 0).toLocaleString()} - ${Number(app.consensus?.estimatedValueHigh || 0).toLocaleString()}</p>
              </div>
              <div className="p-4 bg-[#1E1E1E] text-center">
                <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase mb-1">Overall Score</p>
                <p className="font-cinzel text-2xl font-bold text-[#FFD97A]">{app.consensus?.consensusOverall}</p>
              </div>
              <div className="p-4 bg-[#1E1E1E] text-center">
                <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase mb-1">Experts</p>
                <p className="font-cinzel text-2xl font-bold text-[#C9A84C]">{app.consensus?.expertCount}</p>
              </div>
            </div>

            {/* Summary Report */}
            {app.consensus?.summaryReport && (
              <div className="p-5 bg-[#1E1E1E] border border-[#C9A84C]/15">
                <h3 className="text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-3 font-cinzel font-semibold">Expert Consensus Summary</h3>
                <p className="text-sm text-[#C8BC98] leading-relaxed font-light whitespace-pre-line">{app.consensus.summaryReport}</p>
              </div>
            )}
          </div>
        )}

        {/* Individual Expert Reviews */}
        {(app.reviews || []).length > 0 && (
          <div className="space-y-4 mb-8">
            <h2 className="font-cinzel text-xs tracking-[4px] uppercase text-[#C9A84C] font-semibold">Individual Expert Reviews</h2>
            {(app.reviews || []).map((review: any) => {
              const rVerdict = verdictColors[review.authenticityVerdict || 'uncertain'] || verdictColors.uncertain
              const expert = (app.experts || []).find((e: any) => e.id === review.expertId)
              return (
                <div key={review.id} className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center">
                        <Star className="w-5 h-5 text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-xs text-[#F5EED8] font-medium">{expert?.name || 'Expert'}</p>
                        <p className="text-[9px] text-[#8A6E2F]">{expert?.title} &middot; {expert?.institution}</p>
                      </div>
                    </div>
                    <span className={`text-[10px] tracking-[2px] uppercase font-cinzel font-semibold ${rVerdict.color}`}>{rVerdict.label}</span>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="p-3 bg-[#1E1E1E] text-center">
                      <p className="font-cinzel text-lg font-bold text-emerald-400">{review.authenticityScore}</p>
                      <p className="text-[7px] tracking-[1px] text-[#8A6E2F] uppercase">Authenticity</p>
                    </div>
                    <div className="p-3 bg-[#1E1E1E] text-center">
                      <p className="font-cinzel text-lg font-bold text-[#C9A84C]">{review.valueScore}</p>
                      <p className="text-[7px] tracking-[1px] text-[#8A6E2F] uppercase">Value</p>
                    </div>
                    <div className="p-3 bg-[#1E1E1E] text-center">
                      <p className="font-cinzel text-lg font-bold text-blue-400">{review.conditionScore}</p>
                      <p className="text-[7px] tracking-[1px] text-[#8A6E2F] uppercase">Condition</p>
                    </div>
                    <div className="p-3 bg-[#1E1E1E] text-center border border-[#C9A84C]/20">
                      <p className="font-cinzel text-lg font-bold text-[#FFD97A]">{review.overallScore}</p>
                      <p className="text-[7px] tracking-[1px] text-[#8A6E2F] uppercase">Overall</p>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="space-y-2">
                    {review.authenticityNotes && <p className="text-[11px] text-[#C8BC98]"><strong className="text-[#C9A84C]">Authenticity:</strong> {review.authenticityNotes}</p>}
                    {review.conditionNotes && <p className="text-[11px] text-[#C8BC98]"><strong className="text-blue-400">Condition:</strong> {review.conditionNotes}</p>}
                    {review.valueNotes && <p className="text-[11px] text-[#C8BC98]"><strong className="text-emerald-400">Value:</strong> {review.valueNotes}</p>}
                    {review.methodology && <p className="text-[10px] text-[#8A6E2F]"><strong>Methodology:</strong> {review.methodology}</p>}
                  </div>

                  {review.estimatedValue && (
                    <div className="mt-3 pt-3 border-t border-[#C9A84C]/10 flex justify-between">
                      <span className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase">Est. Value</span>
                      <span className="font-cinzel text-sm text-[#C9A84C] font-bold">${Number(review.estimatedValue).toLocaleString()} (range: ${Number(review.valueRangeLow || 0).toLocaleString()} - ${Number(review.valueRangeHigh || 0).toLocaleString()})</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Disclaimer */}
        <div className="p-4 border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] text-orange-300/80 leading-relaxed">
                <strong className="text-orange-400">Important:</strong> Expert scores are generated by AI and do not constitute a certified appraisal or authentication. No expert physically inspected your item. These are estimates based on AI training data. For insurance, legal, or verified sale purposes, consult a licensed professional appraiser who can examine the item in person.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
