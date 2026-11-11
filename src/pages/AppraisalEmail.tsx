import { useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { commissionBreakdown, commissionRateString } from '@/lib/commission-policy'
import {
  Mail, ArrowLeft, Loader2, CheckCircle2, AlertTriangle,
  Diamond, Send, DollarSign
} from 'lucide-react'

export default function AppraisalEmail() {
  const [searchParams] = useSearchParams()
  const appraisalId = Number(searchParams.get('appraisalId'))
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  const { data: appraisal, isLoading } = trpc.appraisal.getById.useQuery(
    { id: appraisalId },
    { enabled: !!appraisalId && !isNaN(appraisalId) }
  )

  const sendEmail = trpc.email.sendAppraisalResult.useMutation({
    onSuccess: () => setSent(true),
  })

  const handleSend = () => {
    if (!email || !appraisalId) return
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://thevaultdfw.win'
    sendEmail.mutate({
      appraisalId,
      email,
      paymentLink: `${origin}/proverify`,
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (!appraisal) {
    return (
      <div className="min-h-screen bg-[#080808] pt-24 px-4">
        <div className="max-w-lg mx-auto text-center py-16">
          <AlertTriangle className="w-10 h-10 text-orange-400 mx-auto mb-4" />
          <h1 className="font-cinzel text-lg text-[#F5EED8] mb-2">Appraisal Not Found</h1>
          <Link to="/appraisal" className="text-[#C9A84C] text-sm hover:underline">
            <ArrowLeft className="w-4 h-4 inline mr-1" /> Back to Appraisal
          </Link>
        </div>
      </div>
    )
  }

  const ev = Number(appraisal.estimatedValue) || 0
  const quote = commissionBreakdown(ev)
  const commissionRate = appraisal.commissionRate || commissionRateString(ev)
  const commissionEstimate = appraisal.commissionRate
    ? ev * (parseFloat(commissionRate) / 100)
    : quote.commission

  return (
    <div className="min-h-screen bg-[#080808] pt-24 pb-20 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <Diamond className="w-8 h-8 text-[#C9A84C] mx-auto mb-3" />
          <h1 className="font-cinzel text-xl tracking-[6px] text-[#F5EED8] uppercase">
            Your Appraisal Is Ready
          </h1>
          <p className="text-[10px] text-[#8A6E2F] tracking-[2px] uppercase mt-2">
            {appraisal.itemName}
          </p>
        </div>

        {/* Result Preview */}
        <div className="mb-8 p-6 border border-[#C9A84C]/30 bg-gradient-to-br from-[#C9A84C]/10 to-[#8A6E2F]/10 text-center">
          <p className="text-[9px] text-[#8A6E2F] tracking-[3px] uppercase mb-2">Estimated Value</p>
          <p className="font-cinzel text-3xl text-[#C9A84C] font-bold">
            ${ev.toLocaleString()}
          </p>
          <p className="text-[10px] text-[#C8BC98] mt-2">
            Range: ${Number(appraisal.valueRangeLow || ev * 0.5).toLocaleString()} — ${Number(appraisal.valueRangeHigh || ev * 1.5).toLocaleString()}
          </p>
          <div className="mt-3 flex items-center justify-center gap-4 text-[10px]">
            <span className="text-[#8A6E2F]">Commission: {commissionRate}%</span>
            <span className="text-emerald-400">You receive: ${(ev - commissionEstimate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Email Collection or Sent State */}
        {!sent ? (
          <div className="p-6 border border-[#C9A84C]/20 bg-[#161616]">
            <div className="flex items-center gap-3 mb-4">
              <Mail className="w-5 h-5 text-[#C9A84C]" />
              <h2 className="font-cinzel text-sm tracking-[3px] text-[#F5EED8] uppercase">
                Send Results to Your Email
              </h2>
            </div>

            <p className="text-[10px] text-[#C8BC98] mb-5 leading-relaxed">
              Enter your email and we will send the complete appraisal report, including condition assessment, market analysis, and comparable types. A link to unlock expert verification will be included.
            </p>

            <div className="mb-4">
              <label className="text-[9px] text-[#8A6E2F] tracking-[2px] uppercase block mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full bg-[#080808] border border-[#C9A84C]/20 px-4 py-3 text-sm text-[#F5EED8] focus:border-[#C9A84C] outline-none placeholder:text-[#8A6E2F]/50"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={sendEmail.isPending || !email}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
            >
              {sendEmail.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4" /> Send Appraisal to Email</>
              )}
            </button>

            {sendEmail.error && (
              <p className="mt-3 text-[10px] text-red-400 text-center">
                {sendEmail.error.message}
              </p>
            )}

            {/* Pay Option */}
            <div className="mt-6 pt-6 border-t border-[#C9A84C]/10 text-center">
              <p className="text-[10px] text-[#8A6E2F] mb-3">
                Want expert verification? Our specialists will physically inspect your item.
              </p>
              <Link
                to="/proverify"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase hover:bg-[#C9A84C]/10 transition-all"
              >
                <DollarSign className="w-3 h-3" /> Pay $49.99 for Expert Verification
              </Link>
            </div>
          </div>
        ) : (
          <div className="p-8 border border-emerald-500/30 bg-emerald-500/5 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
            <h2 className="font-cinzel text-lg text-emerald-400 mb-2">Email Sent!</h2>
            <p className="text-[11px] text-[#C8BC98] mb-2">
              Your full appraisal report has been sent to
            </p>
            <p className="text-sm text-[#C9A84C] font-semibold mb-6">{email}</p>

            <div className="space-y-3">
              <Link
                to="/proverify"
                className="block w-full py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold"
              >
                <DollarSign className="w-4 h-4 inline mr-1" /> Unlock Expert Verification — $49.99
              </Link>
              <Link
                to="/appraisal"
                className="block w-full py-3 border border-[#C9A84C]/20 text-[#8A6E2F] font-cinzel text-[10px] tracking-[3px] uppercase hover:border-[#C9A84C]/40 transition-all"
              >
                <ArrowLeft className="w-3 h-3 inline mr-1" /> Appraise Another Item
              </Link>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="mt-6 p-4 border border-orange-500/20 bg-orange-500/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-[9px] text-orange-300/70 leading-relaxed">
              This is an AI-generated estimate for informational purposes only. It is NOT a certified appraisal. For insurance, legal, or verified sale pricing, consult a licensed professional appraiser who can physically inspect your item.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
