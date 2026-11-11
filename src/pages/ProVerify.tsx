import { Link } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  Award, Loader2, ImageIcon, X, ArrowLeft, ExternalLink,
  Star, Clock, Shield, CheckCircle2, AlertTriangle, ChevronRight, Users, Target, Package
} from 'lucide-react'

export default function ProVerify() {
  const [step, setStep] = useState<'form' | 'submitted'>('form')
  const [itemName, setItemName] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('good')
  const [description, setDescription] = useState('')
  const [provenance, setProvenance] = useState('')
  const [dimensions, setDimensions] = useState('')
  const [materials, setMaterials] = useState('')
  const [markings, setMarkings] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [priority, setPriority] = useState<'standard' | 'express' | 'rush'>('standard')
  const [result, setResult] = useState<any>(null)

  const { data: categories } = trpc.categories.list.useQuery()
  const { data: experts } = trpc.expert.listExperts.useQuery()

  const submitApp = trpc.expert.submitApplication.useMutation({
    onSuccess: (data) => {
      setResult(data)
      setStep('submitted')
    },
  })

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => setImagePreview(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!itemName || !category) return
    submitApp.mutate({
      itemName, category, condition, description, provenance,
      dimensions, materials, markings,
      imageUrls: imagePreview ? [imagePreview] : [],
      priority,
    })
  }

  const feeMap = { standard: '49.99', express: '99.99', rush: '199.99' }
  const timeMap = { standard: '7-10 days', express: '3-5 days', rush: '24-48 hours' }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 border border-[#C9A84C]/25 mb-4">
            <Award className="w-3.5 h-3.5 text-[#C9A84C]" />
            <span className="text-[8px] tracking-[4px] uppercase text-[#C9A84C] font-medium">Professional Verification</span>
          </div>
          <h1 className="font-cinzel text-3xl sm:text-4xl md:text-5xl font-black text-[#F5EED8] tracking-[6px] mb-4">
            ProVerify
          </h1>
          <p className="font-cormorant italic text-lg text-[#C8BC98] max-w-2xl mx-auto mb-6">
            Like Antiques Roadshow, but global. Submit your item to world-class experts who will grade its authenticity, value, and condition on a scale of 1-100.
          </p>
          <div className="flex items-center justify-center gap-6">
            {[
              { icon: <Shield className="w-4 h-4" />, label: 'Authenticity Grade', desc: '1-100' },
              { icon: <Star className="w-4 h-4" />, label: 'Value Grade', desc: '1-100' },
              { icon: <Award className="w-4 h-4" />, label: 'Condition Grade', desc: '1-100' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-[10px] text-[#8A6E2F] tracking-[2px] uppercase">
                <span className="text-[#C9A84C]">{item.icon}</span>
                <span>{item.label}</span>
                <span className="text-[#C9A84C] font-cinzel">{item.desc}</span>
              </div>
            ))}
          </div>
        </div>

        {step === 'form' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <form onSubmit={handleSubmit} className="lg:col-span-2 bg-[#161616] border border-[#C9A84C]/25 p-8 relative">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

              <h2 className="font-cinzel text-xs tracking-[4px] uppercase text-[#C9A84C] font-semibold mb-8">Submit Your Item for Expert Review</h2>

              {/* Image Upload */}
              <div className="mb-6">
                <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Upload Photos</label>
                <div onClick={() => document.getElementById('expert-img')?.click()} className={`border-2 border-dashed cursor-pointer transition-all overflow-hidden h-48 flex items-center justify-center ${imagePreview ? 'border-[#C9A84C]' : 'border-[#C9A84C]/30 bg-[#1E1E1E] hover:border-[#C9A84C]/60'}`}>
                  {imagePreview ? <img src={imagePreview} alt="" className="w-full h-full object-contain" /> : <div className="text-center"><ImageIcon className="w-8 h-8 text-[#C9A84C]/40 mx-auto mb-2" /><p className="text-xs text-[#C8BC98]">Click to upload</p></div>}
                </div>
                <input id="expert-img" type="file" accept="image/*" onChange={handleImage} className="hidden" />
                {imagePreview && <button type="button" onClick={() => setImagePreview(null)} className="mt-2 text-[10px] text-red-400"><X className="w-3 h-3 inline" /> Remove</button>}
              </div>

              {/* Item Name */}
              <div className="mb-6"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Item Name</label>
                <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g., 1924 Art Deco Diamond Ring" required
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] placeholder:text-[#8A6E2F]" /></div>

              {/* Category */}
              <div className="mb-6"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} required
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] cursor-pointer">
                  <option value="" className="bg-[#1E1E1E]">Select category</option>
                  {(categories || []).map((c) => <option key={c.id} value={c.name} className="bg-[#1E1E1E]">{c.name}</option>)}
                  <option value="Other" className="bg-[#1E1E1E]">Other / Not Sure</option>
                </select></div>

              {/* Condition */}
              <div className="mb-6"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Condition</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {['mint', 'excellent', 'very_good', 'good', 'fair'].map((c) => (
                    <button key={c} type="button" onClick={() => setCondition(c)}
                      className={`py-3 text-[10px] tracking-[2px] uppercase border transition-all ${condition === c ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C]' : 'border-[#C9A84C]/15 text-[#C8BC98] hover:border-[#C9A84C]/40'}`}>
                      {c.replace('_', ' ')}</button>
                  ))}</div></div>

              {/* Description */}
              <div className="mb-6"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your item in detail..." rows={4}
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-5 outline-none focus:border-[#C9A84C] resize-none placeholder:text-[#8A6E2F]" /></div>

              {/* Provenance */}
              <div className="mb-6"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Provenance / History of Ownership</label>
                <textarea value={provenance} onChange={(e) => setProvenance(e.target.value)} placeholder="Where did you acquire this item? Any documentation of ownership history?" rows={3}
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-5 outline-none focus:border-[#C9A84C] resize-none placeholder:text-[#8A6E2F]" /></div>

              {/* Materials, Dimensions, Markings - inline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div><label className="block text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-2">Materials</label>
                  <input type="text" value={materials} onChange={(e) => setMaterials(e.target.value)} placeholder="Gold, silver, oil on canvas..."
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] placeholder:text-[#8A6E2F]" /></div>
                <div><label className="block text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-2">Dimensions</label>
                  <input type="text" value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="12x8 inches, 3.5cm diameter..."
                    className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] placeholder:text-[#8A6E2F]" /></div>
              </div>

              {/* Markings */}
              <div className="mb-8"><label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Maker's Marks, Hallmarks, Signatures</label>
                <textarea value={markings} onChange={(e) => setMarkings(e.target.value)} placeholder="Any stamps, signatures, serial numbers, hallmarks..." rows={2}
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-5 outline-none focus:border-[#C9A84C] resize-none placeholder:text-[#8A6E2F]" /></div>

              {/* Submit */}
              <div className="mb-4 p-3 border border-[#C9A84C]/15 bg-[#C9A84C]/5">
                <p className="text-[10px] text-[#C8BC98] leading-relaxed">
                  <strong className="text-[#C9A84C]">What we do:</strong> We verify your item with experts and find interested buyers worldwide. We never take possession of your item. You handle all shipping directly with the buyer.
                </p>
              </div>
              <div className="mb-4 p-3 border border-emerald-500/20 bg-emerald-500/5">
                <p className="text-[9px] text-emerald-400 tracking-[2px] uppercase font-semibold mb-1">After Expert Review:</p>
                <p className="text-[10px] text-[#C8BC98] leading-relaxed">
                  Once verified, you can list your item on the exchange with no listing fee. Our AI will then search X, Reddit, and Instagram for buyers who have mentioned interest in items like yours. You receive their public contact info and connect directly.
                </p>
              </div>
              <button type="submit" disabled={submitApp.isPending}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50">
                {submitApp.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Award className="w-4 h-4" /> Submit for Expert Review - ${feeMap[priority]}</>}
              </button>
            </form>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Priority */}
              <div className="bg-[#161616] border border-[#C9A84C]/25 p-6">
                <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Review Speed</h3>
                {(['standard', 'express', 'rush'] as const).map((p) => (
                  <button key={p} onClick={() => setPriority(p)}
                    className={`w-full mb-2 p-4 border text-left transition-all ${priority === p ? 'border-[#C9A84C] bg-[#C9A84C]/8' : 'border-[#C9A84C]/15 hover:border-[#C9A84C]/40'}`}>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] tracking-[3px] uppercase text-[#F5EED8] font-cinzel font-semibold">{p}</span>
                      <span className="text-[#C9A84C] font-cinzel text-sm font-bold">${feeMap[p]}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[9px] text-[#8A6E2F]">
                      <Clock className="w-3 h-3" /> {timeMap[p]}
                    </div>
                  </button>
                ))}
              </div>

              {/* Expert Team Preview */}
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Expert Panel</h3>
                <div className="space-y-3">
                  {(experts || []).slice(0, 5).map((ex) => (
                    <div key={ex.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-[#C9A84C]/10 border border-[#C9A84C]/25 flex items-center justify-center flex-shrink-0">
                        <Users className="w-3.5 h-3.5 text-[#C9A84C]" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#F5EED8] font-medium">{ex.name}</p>
                        <p className="text-[8px] text-[#8A6E2F]">{ex.title} &middot; {ex.institution}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-[#8A6E2F] mt-4">{(experts || []).length}+ experts worldwide</p>
              </div>

              {/* Shipping Cost Calculators */}
              <div className="bg-[#161616] border border-[#C9A84C]/15 p-6">
                <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold flex items-center gap-2">
                  <Package className="w-3.5 h-3.5" /> Shipping Estimators
                </h3>
                <p className="text-[10px] text-[#C8BC98] mb-3">
                  Plan your shipping costs before you sell. Get instant quotes from major carriers.
                </p>
                <div className="space-y-2">
                  {[
                    { name: 'USPS', url: 'https://postcalc.usps.com/', color: 'text-blue-400' },
                    { name: 'UPS', url: 'https://www.ups.com/ups/quote', color: 'text-amber-400' },
                    { name: 'FedEx', url: 'https://www.fedex.com/en-us/shipping/rates.html', color: 'text-purple-400' },
                    { name: 'DHL', url: 'https://www.dhl.com/us-en/home/quote.html', color: 'text-red-400' },
                  ].map((carrier) => (
                    <a key={carrier.name} href={carrier.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between p-3 bg-[#1E1E1E] border border-[#C9A84C]/10 hover:border-[#C9A84C]/30 transition-colors group">
                      <span className={`text-[10px] font-cinzel font-semibold ${carrier.color}`}>{carrier.name}</span>
                      <ExternalLink className="w-3 h-3 text-[#8A6E2F] group-hover:text-[#C9A84C] transition-colors" />
                    </a>
                  ))}
                </div>
              </div>

              {/* Our Role - Clear Statement */}
              <div className="p-4 border border-[#C9A84C]/20 bg-[#C9A84C]/5">
                <h3 className="text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-2 font-cinzel font-semibold">What The Vault Does</h3>
                <ul className="space-y-1.5">
                  {[
                    'Connect you with expert appraisers',
                    'Find verified professional buyers worldwide',
                    'Provide blockchain certification (optional)',
                    'Never take possession of your items',
                    'Never handle shipping or logistics',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-[9px] text-[#C8BC98]">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Disclaimer */}
              <div className="p-4 border border-red-500/20 bg-red-500/5">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[9px] text-red-300/70 leading-relaxed">
                    The Vault connects you with independent expert appraisers and potential buyers. We never take possession of items. All shipping, payment, and delivery arrangements are solely between you and the buyer. Review fees go directly to the experts. We are not liable for expert opinions, valuations, or buyer transactions.
                    <Link to="/support" className="text-[#C9A84C] ml-1">Contact support.</Link>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Submitted State */
          <div className="text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="font-cinzel text-2xl font-bold text-[#C9A84C] tracking-[4px] mb-3">Application Submitted</h2>
            <p className="font-cormorant italic text-lg text-[#C8BC98] mb-6">
              Your item has been assigned to {result?.assignedExpertCount} world-class expert{result?.assignedExpertCount !== 1 ? 's' : ''} for professional review.
            </p>

            {result?.matchedExperts && result.matchedExperts.length > 0 && (
              <div className="bg-[#161616] border border-[#C9A84C]/20 p-6 mb-6 text-left max-w-lg mx-auto">
                <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3 font-cinzel font-semibold">Assigned Experts</h3>
                {result.matchedExperts.map((ex: any) => (
                  <div key={ex.id} className="flex items-start gap-3 mb-3">
                    <Award className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-[#F5EED8]">{ex.name}</p>
                      <p className="text-[10px] text-[#8A6E2F]">{ex.title}</p>
                      <p className="text-[9px] text-[#C8BC98]">{ex.institution}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Outreach Campaign Results */}
            {result?.outreachCampaignId && (
              <div className="bg-[#161616] border border-emerald-500/20 p-6 mb-6 max-w-lg mx-auto text-left">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-[9px] tracking-[3px] uppercase text-emerald-400 font-cinzel font-semibold">AI Outreach Campaign Active</h3>
                </div>
                <p className="text-xs text-[#C8BC98] mb-3">{result?.outreachMessage}</p>
                {result?.initialLeads > 0 && (
                  <div className="flex items-center gap-2 mb-3 p-2 bg-emerald-500/5 border border-emerald-500/15">
                    <Users className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 font-cinzel">{result.initialLeads} lead{result.initialLeads !== 1 ? 's' : ''} found so far</span>
                  </div>
                )}
                <p className="text-[10px] text-[#8A6E2F] mb-3">Our AI works around the clock cold outreach to verified professionals worldwide until we find at least 5 interested buyers for your item.</p>
                <Link to={`/leads/${result.outreachCampaignId}`}
                  className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-emerald-400 font-cinzel font-semibold hover:text-emerald-300 transition-colors">
                  <Target className="w-3.5 h-3.5" /> View Live Leads <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
            )}

            <p className="text-sm text-[#C8BC98] mb-2">Review Fee: <span className="text-[#C9A84C] font-cinzel font-bold">${result?.reviewFee}</span></p>
            <p className="text-sm text-[#C8BC98] mb-8">Estimated turnaround: <span className="text-[#C9A84C]">{timeMap[priority]}</span></p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => { setStep('form'); setResult(null); }}
                className="px-8 py-3 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all">
                Submit Another Item
              </button>
              <Link to="/" className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold">
                <ChevronRight className="w-3.5 h-3.5" /> Back to Home
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
