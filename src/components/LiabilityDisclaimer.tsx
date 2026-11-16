import { Link } from 'react-router'
import { AlertTriangle, Mail } from 'lucide-react'

/** Reusable liability disclaimer - appears on all transaction-related pages */
export function LiabilityBanner() {
  return (
    <div className="bg-red-950/30 border border-red-500/20 px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-start gap-3">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[10px] text-red-300/80 leading-relaxed">
            <strong className="text-red-300">Disclaimer:</strong> The Vault is a peer-to-peer marketplace platform only.
            We do not hold, custody, or manage any funds at any time. All cryptocurrency payments are processed
            directly wallet-to-wallet via the Solana blockchain. We are not liable for any lost funds, transaction
            errors, failed transfers, smart contract issues, or blockchain network delays.
            By using this platform you acknowledge that all transactions are final and irreversible.
            {' '}
            <Link to="/support" className="text-[#C9A84C] hover:underline inline-flex items-center gap-1">
              <Mail className="w-3 h-3" /> Contact Support
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

/** Compact footer disclaimer */
export function FooterDisclaimer() {
  return (
    <div className="border-t border-[#C9A84C]/10 bg-[#080808] px-4 py-4">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-[9px] text-[#8A6E2F] leading-relaxed tracking-[0.5px]">
          The Vault acts solely as a marketplace platform connecting buyers and sellers. We do not hold, custody,
          or manage user funds. All crypto transactions occur directly on the Solana blockchain. Card payments are
          processed through Stripe. We assume no liability for lost funds, failed transactions, or blockchain issues.
          {' '}
          <Link to="/support" className="text-[#C9A84C] hover:underline">Contact Support</Link>
          {' | '}
          <a href="mailto:ratchetkrewelabs@gmail.com" className="text-[#C9A84C] hover:underline">ratchetkrewelabs@gmail.com</a>
        </p>
      </div>
    </div>
  )
}
