import { useParams, Link } from 'react-router'
import { useState } from 'react'
import { trpc } from '@/providers/trpc'
import {
  Diamond, ArrowLeft, Loader2, AlertCircle,
  Bitcoin, ShieldCheck, Wallet
} from 'lucide-react'
import { FooterDisclaimer } from '@/components/LiabilityDisclaimer'
import { useWallet } from '@solana/wallet-adapter-react'

export default function WalletPay() {
  const { id } = useParams<{ id: string }>()
  const listingId = parseInt(id || '0')
  const [walletAddress, setWalletAddress] = useState('')
  const [paymentCreated, setPaymentCreated] = useState(false)
  const solana = useWallet()
  const connectedAddress = solana.publicKey?.toBase58() || ''
  const walletStatus = { isConnected: solana.connected, address: connectedAddress }
  const buyerAddress = walletAddress || connectedAddress

  const { data: listing, isLoading } = trpc.listings.getById.useQuery({ id: listingId })
  const { data: rates } = trpc.crypto.getRates.useQuery()
  const [currency, setCurrency] = useState<'SOL' | 'USDC'>('SOL')

  const createPayment = trpc.crypto.createPayment.useMutation({
    onSuccess: () => setPaymentCreated(true)
  })

  const submitTx = trpc.crypto.submitTx.useMutation()

  const [txHash, setTxHash] = useState('')

  const handleCreatePayment = () => {
    if (buyerAddress.length < 32) return

    createPayment.mutate({
          listingId,
          buyerAddress,
          currency
        })
  }

  const handleConnect = async () => {
    const phantom = solana.wallets.find((wallet) => wallet.adapter.name === 'Phantom') ?? solana.wallets[0]
    if (!phantom) return
    if (solana.wallet?.adapter.name === phantom.adapter.name) {
      await solana.connect()
      return
    }
    solana.select(phantom.adapter.name)
  }

  const handleSubmitTx = () => {
    if (!txHash || txHash.length < 43) return

    submitTx.mutate({
      paymentId: createPayment.data?.paymentId || 0,
      txHash
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (!listing) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />

        <h2 className="font-cinzel text-lg text-[#C8BC98] tracking-[3px] uppercase mb-2">
          Listing Not Found
        </h2>

        <Link
          to="/browse"
          className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline"
        >
          Back to Browse
        </Link>
      </div>
    )
  }

  const rate = currency === 'SOL' ? rates?.rates?.SOL : rates?.rates?.USDC
    const solPrice = currency === 'SOL'
      ? (rate ? (Number(listing.price) / rate).toFixed(6) : '...')
      : (Number(listing.price)).toFixed(2)
    const currencySymbol = currency

  const paymentData = createPayment.data

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">

        <Link
          to={`/crypto-checkout/${listingId}`}
          className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back
        </Link>

        <div className="text-center mb-10">
          <p className="text-[9px] tracking-[5px] uppercase text-[#C9A84C] font-medium mb-3">
            Direct Wallet Transfer
          </p>

          <h1 className="font-cinzel text-2xl sm:text-3xl font-bold text-[#F5EED8] tracking-[4px]">
                      Pay with {currencySymbol}
                    </h1>

                    <div className="flex items-center justify-center gap-3 mt-4">
                      <div className="w-12 h-px bg-gradient-to-r from-transparent to-[#C9A84C]" />
                      <Diamond className="w-1.5 h-1.5 text-[#C9A84C] rotate-45" />
                      <div className="w-12 h-px bg-gradient-to-l from-transparent to-[#C9A84C]" />
                    </div>

                    {/* Currency Selector */}
                    <div className="flex justify-center gap-3 mt-4">
                      {(['SOL', 'USDC'] as const).map((c) => (
                        <button
                          key={c}
                          onClick={() => setCurrency(c)}
                          className={`px-5 py-2 text-[10px] tracking-[3px] uppercase font-cinzel font-semibold border transition-all ${
                            currency === c
                              ? 'border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]'
                              : 'border-[#C9A84C]/20 text-[#8A6E2F] hover:border-[#C9A84C]/40'
                          }`}
                        >
                          {c === 'SOL' ? 'SOL' : 'USDC'}
                        </button>
                      ))}
                    </div>

          <p className="font-cormorant italic text-sm text-[#C8BC98] mt-4">
            Send SOL directly from your Phantom, Soul, or Robinhood wallet.
            Wallet-to-wallet only.
          </p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/25 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          {/* Zero Funds Banner */}
          <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/20">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] tracking-[2px] text-emerald-400 uppercase font-cinzel font-semibold">Wallet-to-Wallet Transfer</span>
            </div>
            <p className="text-[10px] text-[#C8BC98]">The Vault never holds your funds. This is a direct Solana blockchain transfer.</p>
          </div>

          {/* Item */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Order Summary</h3>
            <div className="flex gap-4">
              <div className="w-20 h-20 bg-[#1E1E1E] border border-[#C9A84C]/15 flex items-center justify-center flex-shrink-0">
                <Diamond className="w-8 h-8 text-[#C9A84C]/30" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-cinzel text-xs font-semibold text-[#F5EED8] tracking-[1px] mb-1 truncate">{listing.title}</p>
                <p className="font-cinzel text-base font-bold text-[#C9A84C]">${Number(listing.price).toLocaleString('en-US')}</p>
              </div>
            </div>
          </div>

          {/* Price */}
          <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
            <div className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-[#C8BC98]">Price (USD)</span><span className="text-[#F5EED8] font-cinzel">${Number(listing.price).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></div>
              <div className="flex justify-between text-sm"><span className="text-[#C8BC98]">{currencySymbol}/USD</span><span className="text-[#C9A84C] font-cinzel">${rate?.toLocaleString() || '...'}</span></div>
                            <div className="flex justify-between text-sm pt-3 border-t border-[#C9A84C]/15">
                              <span className="text-[#F5EED8] font-medium">Send</span>
                              <span className="font-cinzel text-xl font-bold text-[#FFD97A]">{solPrice} {currencySymbol}</span>
              </div>
            </div>
          </div>

          {/* Wallet Input */}
          {!paymentCreated ? (
            <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
              <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Your Wallet Address</h3>
              <p className="text-[10px] text-[#8A6E2F] mb-3">Phantom, Soul, or Robinhood wallet</p>
              <div className="mb-3 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={handleConnect}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-[#C9A84C]/25 text-[#C9A84C] text-[10px] tracking-[2px] uppercase font-cinzel font-semibold hover:border-[#C9A84C] hover:bg-[#C9A84C]/8 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  {walletStatus.isConnected ? 'Wallet Connected' : 'Connect Wallet'}
                </button>
                {walletStatus.isConnected && walletStatus.address && (
                  <span className="text-[9px] tracking-[2px] uppercase text-emerald-400">
                    {walletStatus.address.slice(0, 6)}...{walletStatus.address.slice(-4)}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <input type="text" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="Solana address..."
                  className="flex-1 bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] font-mono placeholder:text-[#8A6E2F] placeholder:font-sans text-xs" />
                <button onClick={handleCreatePayment} disabled={buyerAddress.length < 32 || createPayment.isPending}
                  className="px-6 py-3 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[2px] uppercase font-bold disabled:opacity-50 transition-all">
                  {createPayment.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Continue'}
                </button>
              </div>
              {createPayment.error && <p className="text-red-400 text-xs mt-2">{createPayment.error.message}</p>}
            </div>
          ) : (
            <div className="p-6 sm:p-8 border-b border-[#C9A84C]/15">
              <h3 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-4 font-cinzel font-semibold">Send Payment</h3>
              <div className="bg-[#1E1E1E] border border-[#C9A84C]/20 p-5 mb-4">
                <div className="mt-4 pt-4 border-t border-[#C9A84C]/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#8A6E2F] tracking-[2px] uppercase">Amount</span>
                    <span className="font-cinzel text-lg font-bold text-[#FFD97A]">{paymentData?.amount} SOL</span>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-[#C9A84C]/5 border border-[#C9A84C]/15 mb-4">
                <Bitcoin className="w-4 h-4 text-[#C9A84C] flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#C8BC98] leading-relaxed">
                  Send exactly {paymentData?.amount} SOL directly to the seller&apos;s wallet. This is a wallet-to-wallet transfer. The Vault never touches your funds.
                </p>
              </div>
              {/* Transaction Hash Input */}
              <div className="mb-4">
                <label className="text-[9px] tracking-[3px] uppercase text-[#C9A84C] mb-2 block font-cinzel">Transaction Signature</label>
                <p className="text-[10px] text-[#8A6E2F] mb-2">Paste your Solana transaction signature after sending</p>
                <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Solana tx signature..."
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] font-mono placeholder:text-[#8A6E2F] placeholder:font-sans text-xs" />
              </div>
              <button onClick={handleSubmitTx} disabled={submitTx.isPending || txHash.length < 43}
                className="w-full flex items-center justify-center gap-2 py-3.5 border border-emerald-500 text-emerald-400 font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-emerald-500/10 disabled:opacity-50 transition-all">
                {submitTx.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {submitTx.isPending ? 'Verifying...' : 'Submit Transaction'}
              </button>
              {submitTx.data && (
                <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <p className="text-xs text-emerald-400 font-cinzel tracking-[2px] uppercase mb-1">Payment Detected</p>
                  <p className="text-[10px] text-[#C8BC98]">Tx: {txHash.slice(0, 20)}...</p>
                </div>
              )}
            </div>
          )}

          {/* Disclaimer */}
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] text-emerald-400 tracking-[2px] uppercase font-cinzel">Zero Funds Held</span>
            </div>
            <p className="text-[10px] text-[#8A6E2F] leading-relaxed">
              Payments are processed on the Solana Devnet. Gas fees apply. The Vault is not liable for lost funds, failed transfers, or network issues. For help contact <a href="mailto:ratchetkrewelabs@gmail.com" className="text-[#C9A84C] hover:underline">ratchetkrewelabs@gmail.com</a>
            </p>
          </div>
        </div>

        <FooterDisclaimer />
      </div>
    </div>
  )
}