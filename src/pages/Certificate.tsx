import { useParams, Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import { useRef } from 'react'
import {
  Diamond, ShieldCheck, Loader2, Download, ExternalLink,
  CheckCircle2, AlertCircle, ArrowLeft, Copy, Check
} from 'lucide-react'
import { useState } from 'react'

export default function Certificate() {
  const { id } = useParams<{ id: string }>()
  const certId = parseInt(id || '0')
  const certRef = useRef<HTMLDivElement>(null)
  const [copied, setCopied] = useState(false)

  const { data: cert, isLoading } = trpc.blockchain.getById.useQuery({ id: certId })

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const downloadCertificate = () => {
    if (!certRef.current) return
    const content = certRef.current.innerText
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `Vault-Certificate-${cert?.certificateHash?.slice(0, 16)}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen pt-32 flex justify-center">
        <Loader2 className="w-8 h-8 text-[#C9A84C] animate-spin" />
      </div>
    )
  }

  if (!cert) {
    return (
      <div className="min-h-screen pt-32 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h2 className="font-cinzel text-lg text-[#C8BC98] tracking-[3px] uppercase mb-2">Certificate Not Found</h2>
        <Link to="/browse" className="text-[#C9A84C] text-xs tracking-[2px] uppercase hover:underline">Back to Browse</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link to={`/listing/${cert.listingId}`} className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#C8BC98] hover:text-[#C9A84C] transition-colors mb-8">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Item
        </Link>

        {/* Certificate Document */}
        <div ref={certRef} className="bg-[#FAF6E9] text-[#1a1a1a] p-10 sm:p-14 relative border-8 border-[#C9A84C] shadow-[0_0_60px_rgba(201,168,76,0.2)]">
          {/* Ornate border */}
          <div className="absolute top-3 left-3 right-3 bottom-3 border-2 border-[#C9A84C]" />
          <div className="absolute top-5 left-5 right-5 bottom-5 border border-[#C9A84C]/40" />

          {/* Content */}
          <div className="relative text-center">
            {/* Header */}
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="w-12 h-px bg-[#C9A84C]" />
              <Diamond className="w-5 h-5 text-[#C9A84C] rotate-45" />
              <div className="w-12 h-px bg-[#C9A84C]" />
            </div>

            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-8 h-8 border border-[#C9A84C] rotate-45 flex items-center justify-center">
                <Diamond className="w-4 h-4 text-[#C9A84C] -rotate-45" />
              </div>
            </div>

            <h1 className="font-cinzel text-xl sm:text-2xl font-black tracking-[6px] text-[#1a1a1a] mb-1">THE VAULT</h1>
            <p className="font-cinzel text-[8px] tracking-[4px] text-[#8A6E2F] uppercase mb-6">Elite Collector Exchange</p>

            <div className="w-20 h-0.5 bg-[#C9A84C] mx-auto mb-6" />

            <h2 className="font-cormorant italic text-2xl sm:text-3xl text-[#1a1a1a] mb-2">Certificate of Authenticity</h2>
            <p className="font-cinzel text-[8px] tracking-[4px] text-[#8A6E2F] uppercase mb-8">Blockchain Verified &middot; Tokenized Asset</p>

            {/* Verified Badge */}
            <div className="inline-flex items-center gap-2 px-5 py-2 bg-[#C9A84C]/10 border border-[#C9A84C] mb-8">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span className="font-cinzel text-[9px] tracking-[3px] text-[#1a1a1a] uppercase font-semibold">Verified on Blockchain</span>
            </div>

            {/* Item Details */}
            <div className="bg-[#111111] border border-[#C9A84C]/30 p-6 mb-8 text-left max-w-lg mx-auto">
              <div className="grid grid-cols-1 gap-4 text-xs">
                <div className="flex justify-between border-b border-[#C9A84C]/20 pb-2">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Item</span>
                  <span className="text-[#F5EED8] font-medium text-right max-w-[60%]">{cert.itemName}</span>
                </div>
                <div className="flex justify-between border-b border-[#C9A84C]/20 pb-2">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Network</span>
                  <span className="text-[#F5EED8] font-medium">{cert.network === 'ethereum_sepolia' ? 'Ethereum Sepolia' : cert.network}</span>
                </div>
                <div className="flex justify-between border-b border-[#C9A84C]/20 pb-2">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Contract Address</span>
                  <span className="text-[#F5EED8] font-mono text-[10px] truncate max-w-[60%]">{cert.contractAddress}</span>
                </div>
                <div className="flex justify-between border-b border-[#C9A84C]/20 pb-2">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Token ID</span>
                  <span className="text-[#F5EED8] font-mono">#{cert.tokenId}</span>
                </div>
                <div className="flex justify-between border-b border-[#C9A84C]/20 pb-2">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Block Hash</span>
                  <span className="text-[#F5EED8] font-mono text-[10px] truncate max-w-[60%]">{cert.blockHash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#C9A84C] font-cinzel tracking-[2px] uppercase text-[9px]">Block Number</span>
                  <span className="text-[#F5EED8] font-mono">{Number(cert.blockNumber).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Certificate Hash */}
            <div className="mb-8">
              <p className="text-[8px] tracking-[3px] text-[#8A6E2F] uppercase mb-2 font-cinzel">Certificate Hash</p>
              <div className="flex items-center justify-center gap-2">
                <code className="bg-[#1a1a1a]/5 px-4 py-2 text-[10px] font-mono text-[#1a1a1a] border border-[#C9A84C]/20">
                  {cert.certificateHash}
                </code>
              </div>
            </div>

            {/* Date */}
            <p className="text-[10px] text-[#8A6E2F] mb-6">
              Certified on {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
            </p>

            {/* Footer */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-12 h-px bg-[#C9A84C]" />
              <Diamond className="w-3 h-3 text-[#C9A84C] rotate-45" />
              <div className="w-12 h-px bg-[#C9A84C]" />
            </div>
            <p className="font-cinzel text-[7px] tracking-[3px] text-[#8A6E2F] uppercase mt-3">
              This certificate verifies the authenticity and ownership of the above item on the blockchain
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={downloadCertificate}
            className="flex items-center justify-center gap-2 py-3.5 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[10px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all"
          >
            <Download className="w-4 h-4" /> Download Certificate
          </button>

          <button
            onClick={() => cert.contractAddress && copyToClipboard(cert.contractAddress)}
            className="flex items-center justify-center gap-2 py-3.5 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy Contract'}
          </button>

          <Link
            to={`/listing/${cert.listingId}`}
            className="flex items-center justify-center gap-2 py-3.5 border border-[#C9A84C] text-[#C9A84C] font-cinzel text-[10px] tracking-[3px] uppercase font-semibold hover:bg-[#C9A84C]/8 transition-all"
          >
            <ExternalLink className="w-4 h-4" /> View Item
          </Link>
        </div>

        {/* Blockchain verification badge */}
        <div className="mt-6 p-4 border border-[#C9A84C]/15 bg-[#161616] text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[9px] tracking-[3px] uppercase text-emerald-400 font-cinzel font-semibold">Blockchain Verified</span>
          </div>
          <p className="text-[10px] text-[#8A6E2F]">
            This certificate is permanently recorded on the {cert.network === 'ethereum_sepolia' ? 'Ethereum Sepolia' : cert.network} blockchain.
            The block hash reserves this certification ad infinitum.
          </p>
        </div>
      </div>
    </div>
  )
}
