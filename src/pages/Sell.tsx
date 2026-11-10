import { useState } from 'react'
import { Link } from 'react-router'
import { useAccount } from 'wagmi'
import { trpc } from '@/providers/trpc'
import { useAuth } from '@/hooks/useAuth'
import { launchVaultToken } from '@/lib/clanker-launch'
import {
  Diamond, Plus, X, Loader2, Sparkles, CheckCircle2, ShieldCheck, Bitcoin
} from 'lucide-react'

export default function Sell() {
  const { isAuthenticated } = useAuth()
  const [submitted, setSubmitted] = useState(false)
  const [createdListingId, setCreatedListingId] = useState<number | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'mint' | 'excellent' | 'very_good' | 'good' | 'fair'>('very_good')
  const [features, setFeatures] = useState<string[]>([])
  const [featureInput, setFeatureInput] = useState('')
  const [isConsignment, setIsConsignment] = useState(false)
  const [certifyOnChain, setCertifyOnChain] = useState(false)
  const [launching, setLaunching] = useState(false)
  const [launchMessage, setLaunchMessage] = useState('')
  const { address, isConnected } = useAccount()

  const { data: categories } = trpc.categories.list.useQuery()
  const utils = trpc.useUtils()

  const createListing = trpc.listings.create.useMutation({
    onSuccess: (data) => {
      setCreatedListingId(data.id)
      setSubmitted(true)
      utils.listings.invalidate()
    },
  })

  const certifyMutation = trpc.blockchain.certify.useMutation()
  const confirmLaunch = trpc.blockchain.confirmLaunch.useMutation()

  const signLaunch = async () => {
    if (!createdListingId || !address) return
    setLaunching(true)
    setLaunchMessage('')
    try {
      const intent = await certifyMutation.mutateAsync({
        listingId: createdListingId,
        itemName: title,
        itemDescription: description || undefined,
        walletAddress: address,
      })
      if (!intent.launch) {
        setLaunchMessage(intent.message)
        return
      }
      const txHash = await launchVaultToken(intent.launch)
      const confirmed = await confirmLaunch.mutateAsync({ listingId: createdListingId, txHash })
      setLaunchMessage(`${confirmed.message} ${confirmed.token ?? ''}`)
    } catch (error) {
      setLaunchMessage(error instanceof Error ? error.message : 'Launch failed')
    } finally {
      setLaunching(false)
    }
  }

  const createFeeCheckout = trpc.listingFee.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url
      }
    },
  })

  const addFeature = () => {
    if (featureInput.trim() && !features.includes(featureInput.trim())) {
      setFeatures([...features, featureInput.trim()])
      setFeatureInput('')
    }
  }

  const removeFeature = (f: string) => {
    setFeatures(features.filter((feat) => feat !== f))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title || !categoryId || !price) return

    createListing.mutate({
      title,
      description: description || undefined,
      categoryId: parseInt(categoryId),
      price: parseFloat(price),
      condition,
      features: features.length > 0 ? features : undefined,
      isConsignment,
      badge: 'new',
    })
  }

  // Preview commission
  const numPrice = parseFloat(price) || 0
  let rate = 5
  if (numPrice >= 10000) rate = 5
  else if (numPrice >= 7500) rate = 10
  else if (numPrice >= 1000) rate = 7
  else rate = 5
  const commission = numPrice * (rate / 100)
  const youReceive = numPrice - commission

  if (submitted && createdListingId) {
    return (
      <div className="min-h-screen pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg mx-auto">
          {/* Step 1: Listing Created */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 border-2 border-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <h2 className="font-cinzel text-2xl font-bold text-[#C9A84C] tracking-[4px] mb-4">
              Listing Saved!
            </h2>
            <p className="text-sm text-[#C8BC98] mb-6 font-light">
              Your item "{title}" has been saved. To activate it on the exchange and unlock AI buyer discovery, pay the one-time listing fee.
            </p>
          </div>

          {/* What We Do - Clear Statement */}
          <div className="mb-6 p-4 border border-[#C9A84C]/20 bg-[#C9A84C]/5">
            <p className="text-[10px] text-[#C9A84C] tracking-[2px] uppercase font-semibold mb-2">What happens after you pay:</p>
            <ul className="space-y-1.5 text-[10px] text-[#C8BC98]">
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />Your item goes live on the exchange</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />AI scans X, Reddit, Instagram for buyers</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />You receive an email with lead contacts</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />You connect directly with interested buyers</li>
              <li className="flex items-start gap-2"><CheckCircle2 className="w-3 h-3 text-emerald-400 flex-shrink-0 mt-0.5" />We never take possession of your items</li>
            </ul>
          </div>

          {/* $20 Fee Payment */}
          <div className="p-6 border border-[#C9A84C]/30 bg-[#161616] text-center">
            <p className="text-[9px] text-[#8A6E2F] tracking-[3px] uppercase mb-3">One-Time Listing Fee</p>
            <p className="font-cinzel text-3xl text-[#C9A84C] font-bold mb-1">$20.00</p>
            <p className="text-[10px] text-[#8A6E2F] mb-6">Unlocks AI buyer search + exchange listing</p>

            {isAuthenticated ? (
              <button
                onClick={() =>
                  createFeeCheckout.mutate({
                    listingId: createdListingId,
                    successUrl: `${window.location.origin}/social-leads/${createdListingId}`,
                    cancelUrl: `${window.location.origin}/sell`,
                  })
                }
                disabled={createFeeCheckout.isPending}
                className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
              >
                {createFeeCheckout.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Redirecting to Stripe...</>
                ) : (
                  <><Diamond className="w-4 h-4" /> Pay $20 & Activate Listing</>
                )}
              </button>
            ) : (
              <div className="p-4 border border-[#C9A84C]/20">
                <p className="text-sm text-[#C8BC98] mb-3">Sign in to pay the listing fee and activate your item</p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold"
                >
                  Sign In to Continue
                </Link>
              </div>
            )}
          </div>

          {certifyOnChain && (
            <div className="mt-6 border border-[#C9A84C]/30 bg-[#161616] p-6">
              <p className="mb-2 font-cinzel text-[10px] tracking-[3px] text-[#C9A84C] uppercase">Token launch</p>
              <p className="mb-4 text-[11px] leading-relaxed text-[#C8BC98]">
                Clanker v5 on Base. Deploy fee is 0 ETH. You sign in your wallet. The 1% trade tax splits 0.50% to you and 0.50% to Clanker. Anti-sniper fee starts at 99% and falls over 20 seconds. There is no creator buy, so there is no launch slippage.
              </p>
              {isConnected && address ? (
                <button
                  type="button"
                  onClick={signLaunch}
                  disabled={launching}
                  className="flex w-full items-center justify-center gap-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] py-4 font-cinzel text-[11px] font-bold tracking-[3px] text-[#080808] uppercase disabled:opacity-50"
                >
                  {launching ? <><Loader2 className="h-4 w-4 animate-spin" /> Waiting for wallet...</> : <>Sign launch as {address.slice(0, 6)}…{address.slice(-4)}</>}
                </button>
              ) : (
                <p className="text-[11px] text-[#C8BC98]">Connect a Base wallet from the toolbar, then sign the launch.</p>
              )}
              {launchMessage && <p className="mt-3 text-[11px] text-[#F5EED8]">{launchMessage}</p>}
            </div>
          )}

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setSubmitted(false)
                setCreatedListingId(null)
                setTitle('')
                setDescription('')
                setCategoryId('')
                setPrice('')
                setFeatures([])
              }}
              className="text-[10px] text-[#8A6E2F] hover:text-[#C9A84C] transition-colors"
            >
              List a Different Item
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            Create Listing
          </p>
          <h1 className="font-cinzel text-2xl sm:text-3xl md:text-4xl font-bold text-[#F5EED8] tracking-[4px]">
            Sell Your Item
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
            <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
          </div>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex border border-[#C9A84C]/25">
            <Link
              to="/browse"
              className="px-8 py-3 text-[#C8BC98] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/7 hover:text-[#C9A84C] transition-all"
            >
              Buy
            </Link>
            <Link
              to="/sell"
              className="px-8 py-3 bg-[#C9A84C] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold"
            >
              Sell
            </Link>
          </div>
        </div>

        {/* $20 Fee Banner */}
        <div className="mb-8 p-4 border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-center">
          <p className="text-[10px] text-[#C9A84C] tracking-[2px] uppercase font-semibold mb-1">$20 One-Time Listing Fee</p>
          <p className="text-[10px] text-[#8A6E2F] max-w-lg mx-auto">
            After submitting your item, pay a one-time $20 fee to activate it on the exchange. This unlocks AI-powered social media buyer search. We do not take possession of items.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="mb-8 p-6 bg-[#C9A84C]/5 border border-[#C9A84C]/20 text-center">
            <p className="text-sm text-[#C8BC98] mb-3">
              Please sign in to list items on The Vault
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#C9A84C] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_20px_rgba(201,168,76,0.3)] transition-all"
            >
              Sign In to Continue
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <form onSubmit={handleSubmit} className="lg:col-span-2 bg-[#161616] border border-[#C9A84C]/25 p-8 relative">
            <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

            {/* Title */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Item Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., 1909-S VDB Lincoln Cent MS65"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
                required
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors cursor-pointer"
                required
              >
                <option value="" className="bg-[#1E1E1E]">Select category</option>
                {(categories || []).map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-[#1E1E1E]">{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Price */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Asking Price ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25000"
                min="1"
                step="0.01"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F] font-cinzel"
                required
              />
            </div>

            {/* Condition */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Condition</label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {(['mint', 'excellent', 'very_good', 'good', 'fair'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCondition(c)}
                    className={`py-3 text-[10px] tracking-[2px] uppercase border transition-all ${
                      condition === c
                        ? 'border-[#C9A84C] bg-[#C9A84C]/12 text-[#C9A84C]'
                        : 'border-[#C9A84C]/15 text-[#C8BC98] hover:border-[#C9A84C]/40'
                    }`}
                  >
                    {c.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your item in detail - include provenance, certificates, measurements..."
                rows={4}
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3.5 px-5 outline-none focus:border-[#C9A84C] transition-colors resize-none placeholder:text-[#8A6E2F]"
              />
            </div>

            {/* Features */}
            <div className="mb-6">
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-3">Key Features</label>
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addFeature() }}}
                  placeholder="e.g., GIA Certified"
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-5 outline-none focus:border-[#C9A84C] placeholder:text-[#8A6E2F]"
                />
                <button
                  type="button"
                  onClick={addFeature}
                  className="px-4 py-3 border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C]/8 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {features.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C9A84C]/10 border border-[#C9A84C]/25 text-[10px] text-[#C9A84C] tracking-[1px]">
                    {f}
                    <button type="button" onClick={() => removeFeature(f)} className="hover:text-red-400">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Consignment Toggle */}
            <div className="mb-6">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isConsignment}
                  onChange={(e) => setIsConsignment(e.target.checked)}
                  className="w-4 h-4 accent-[#C9A84C]"
                />
                <span className="text-xs text-[#C8BC98]">This is a consignment item (seller arranges shipping directly with buyer)</span>
              </label>
            </div>

            {/* Blockchain Certification Toggle */}
            <div className="mb-6 p-5 border border-[#C9A84C]/20 bg-[#C9A84C]/5">
              <label className="flex items-center gap-3 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={certifyOnChain}
                  onChange={(e) => setCertifyOnChain(e.target.checked)}
                  className="w-4 h-4 accent-[#C9A84C]"
                />
                <div>
                  <span className="text-xs text-[#C9A84C] font-cinzel font-semibold tracking-[1px]">Certify & Tokenize on Blockchain</span>
                  <p className="text-[10px] text-[#8A6E2F] mt-0.5">Clanker on Base &middot; 0 ETH deploy fee &middot; You sign &middot; Liquidity cannot be removed</p>
                </div>
              </label>

              {certifyOnChain && (
                <div className="pl-7">
                  <p className="mb-2 font-mono text-[10px] text-[#C8BC98]">
                    {isConnected && address ? `Signing wallet ${address}` : 'Connect a wallet in the toolbar before you launch.'}
                  </p>
                  <div className="mt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#C8BC98]">Permanent blockchain certificate with unique block hash</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Bitcoin className="w-3.5 h-3.5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#C8BC98]">Tokenized item increases exposure to crypto collectors</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                      <p className="text-[10px] text-[#C8BC98]">Downloadable paper certificate + wallet-compatible smart contract</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={createListing.isPending || !isAuthenticated}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createListing.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <>List Item in The Vault</>
              )}
            </button>
          </form>

          {/* Commission Preview */}
          <div className="lg:col-span-1">
            <div className="bg-[#161616] border border-[#C9A84C]/25 p-6 sticky top-24">
              <h3 className="font-cinzel text-xs font-semibold tracking-[3px] text-[#C9A84C] uppercase mb-6">
                Commission Preview
              </h3>

              {numPrice > 0 ? (
                <div className="space-y-4">
                  {/* Certification Fee */}
                  {certifyOnChain && (
                    <div className="p-4 bg-[#C9A84C]/5 border border-[#C9A84C]/20">
                      <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-[#C9A84C]" />
                        <span className="text-[9px] tracking-[2px] uppercase text-[#C9A84C] font-cinzel font-semibold">Blockchain Certification</span>
                      </div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-[#C8BC98]">Deploy fee</span>
                        <span className="text-[#C9A84C] font-cinzel">0 ETH + gas</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#C8BC98]">Creator share of trades</span>
                        <span className="text-[#8A6E2F]">0.50%</span>
                      </div>
                    </div>
                  )}
                  <div className="p-4 bg-[#1E1E1E] text-center">
                    <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase mb-1">Asking Price</p>
                    <p className="font-cinzel text-2xl font-bold text-[#C9A84C]">
                      ${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>

                  <div className="p-4 bg-[#1E1E1E] border border-[#C9A84C]/20">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#C8BC98]">Commission Rate</span>
                      <span className="font-cinzel text-sm font-bold text-[#C9A84C]">{rate}%</span>
                    </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#C8BC98]">Vault Fee</span>
                      <span className="font-cinzel text-sm text-[#FFD97A]">
                        ${commission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-[#C9A84C]/15">
                      <span className="text-xs text-[#F5EED8] font-medium">You Receive</span>
                      <span className="font-cinzel text-base font-bold text-emerald-400">
                        ${youReceive.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-emerald-500/5 border border-emerald-500/15">
                    <p className="text-[10px] text-emerald-400 leading-relaxed text-center">
                      You save vs. auction houses: <strong className="font-cinzel">${(numPrice * 0.25 - commission).toLocaleString('en-US', { minimumFractionDigits: 0 })}</strong>
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Sparkles className="w-8 h-8 text-[#C9A84C]/30 mx-auto mb-3" />
                  <p className="text-xs text-[#8A6E2F]">Enter a price to see commission breakdown</p>
                </div>
              )}

              <div className="mt-6 pt-6 border-t border-[#C9A84C]/15">
                <p className="text-[8px] tracking-[2px] text-[#8A6E2F] uppercase mb-3">Commission Tiers</p>
                <div className="space-y-2 text-[10px]">
                  <div className="flex justify-between"><span className="text-[#C8BC98]">Under $1,000</span><span className="font-cinzel text-[#C9A84C]">5%</span></div>
                  <div className="flex justify-between"><span className="text-[#C8BC98]">$1,000 - $7,500</span><span className="font-cinzel text-[#C9A84C]">7%</span></div>
                  <div className="flex justify-between"><span className="text-[#C8BC98]">$7,500 - $10,000</span><span className="font-cinzel text-[#C9A84C]">10%</span></div>
                  <div className="flex justify-between"><span className="text-[#C8BC98]">$10,000+</span><span className="font-cinzel text-[#C9A84C]">5%</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
