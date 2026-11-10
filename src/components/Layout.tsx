import { Outlet, Link, useLocation } from 'react-router'
import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { LiabilityBanner, FooterDisclaimer } from '@/components/LiabilityDisclaimer'
import { WalletConnectButton } from '@/components/WalletConnectButton'
import {
  Diamond, Search, Menu, X, LogOut, User, Shield, Mail,
  Heart, ShoppingBag, HelpCircle,
  Info, MessageCircle
} from 'lucide-react'

const navLinks = [
  { label: 'Browse', path: '/browse' },
  { label: 'Appraisal', path: '/appraisal' },
  { label: 'ProVerify', path: '/proverify' },
  { label: 'Sell', path: '/sell' },
  { label: 'Tokens', path: '/token-gallery' },
  { label: 'Agents', path: '/agents' },
  { label: 'Support', path: '/support' },
]

const footerPlatform = [
  { label: 'Browse Collection', path: '/browse' },
  { label: 'AI Appraisal', path: '/appraisal' },
  { label: 'ProVerify', path: '/proverify' },
  { label: 'Sell an Item', path: '/sell' },
  { label: 'Token Gallery', path: '/token-gallery' },
  { label: 'Agent Fleet', path: '/agents' },
  { label: 'Wishlist', path: '/wishlist' },
  { label: 'My Orders', path: '/orders' },
]

const footerCompany = [
  { label: 'About The Vault', path: '/about' },
  { label: 'FAQ', path: '/faq' },
  { label: 'Contact Us', path: '/contact' },
  { label: 'Shipping Info', path: '/shipping' },
  { label: 'Support Center', path: '/support' },
]

const footerLegal = [
  { label: 'Terms of Service', path: '/terms' },
  { label: 'Privacy Policy', path: '/privacy' },
  { label: 'Returns & Refunds', path: '/returns' },
]

function SocialIcon({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-8 h-8 border border-[#C9A84C]/20 flex items-center justify-center text-[#C8BC98] hover:text-[#C9A84C] hover:border-[#C9A84C]/50 transition-all"
    >
      {children}
    </a>
  )
}

// X (Twitter) icon
function XSocialIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// Instagram icon
function InstagramIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const location = useLocation()
  const { user, isAuthenticated, isAdmin, logout } = useAuth()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    window.requestAnimationFrame(() => {
      setMenuOpen(false)
      window.scrollTo(0, 0)
    })
  }, [location.pathname])

  const isPaymentPage = ['/checkout/', '/crypto-checkout/', '/sell'].some(p => location.pathname.startsWith(p))

  return (
    <div className="min-h-screen bg-[#080808]">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 safe-top transition-all duration-300 ${
        scrolled ? 'bg-[#080808]/95 backdrop-blur-xl border-b border-[#C9A84C]/20' : 'bg-transparent'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-8 h-8 lg:w-9 lg:h-9 border border-[#C9A84C] rotate-45 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(201,168,76,0.3)] transition-shadow">
                <Diamond className="w-4 h-4 text-[#C9A84C] -rotate-45" />
              </div>
              <span className="font-cinzel text-lg lg:text-xl font-bold tracking-[4px] text-[#C9A84C] hidden sm:block">THE VAULT</span>
            </Link>

            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path}
                  className={`text-[10px] tracking-[3px] uppercase transition-colors ${
                    location.pathname === link.path ? 'text-[#E8CB7A]' : 'text-[#C8BC98] hover:text-[#E8CB7A]'
                  }`}>
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="hidden md:flex items-center gap-4">
              <Link to="/browse" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors" title="Search">
                <Search className="w-4 h-4" />
              </Link>
              <Link to="/wishlist" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors" title="Wishlist">
                <Heart className="w-4 h-4" />
              </Link>
              <Link to="/orders" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors" title="My Orders">
                <ShoppingBag className="w-4 h-4" />
              </Link>
              {isAdmin && (
                <Link to="/admin" className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors" title="Admin">
                  <Shield className="w-4 h-4" />
                </Link>
              )}
              <WalletConnectButton />
              {isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <span className="text-[10px] tracking-[2px] text-[#C8BC98] uppercase hidden lg:block">{user?.name || 'Collector'}</span>
                  {/* Hidden admin link — tiny, bottom right of user area */}
                  {isAdmin && (
                    <Link
                      to="/admin/agents"
                      className="text-[7px] tracking-[2px] uppercase text-[#C9A84C]/30 hover:text-[#C9A84C] transition-colors leading-none"
                      title="Agent Command Center"
                    >
                      CMD
                    </Link>
                  )}
                  <button onClick={logout} className="text-[#C8BC98] hover:text-[#C9A84C] transition-colors" title="Sign Out">
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <Link to="/login" className="px-5 py-2 border border-[#C9A84C] text-[#C9A84C] text-[10px] tracking-[3px] uppercase font-cinzel font-semibold hover:bg-[#C9A84C] hover:text-[#080808] transition-all duration-300 hover:shadow-[0_0_20px_rgba(201,168,76,0.3)]">
                  Sign In
                </Link>
              )}
            </div>

            <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-[#C9A84C]">
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden bg-[#080808]/98 backdrop-blur-xl border-t border-[#C9A84C]/20">
            <div className="px-4 py-6 space-y-1">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className="block text-sm tracking-[3px] uppercase text-[#C8BC98] hover:text-[#E8CB7A] py-2.5 transition-colors">
                  {link.label}
                </Link>
              ))}
              <div className="border-t border-[#C9A84C]/20 pt-4 mt-4 space-y-1">
                <Link to="/wishlist" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A] py-2">
                  <Heart className="w-4 h-4 text-[#C9A84C]" /> Wishlist
                </Link>
                <Link to="/orders" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A] py-2">
                  <ShoppingBag className="w-4 h-4 text-[#C9A84C]" /> My Orders
                </Link>
                <Link to="/about" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A] py-2">
                  <Info className="w-4 h-4 text-[#C9A84C]" /> About
                </Link>
                <Link to="/faq" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A] py-2">
                  <HelpCircle className="w-4 h-4 text-[#C9A84C]" /> FAQ
                </Link>
                <Link to="/contact" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A] py-2">
                  <MessageCircle className="w-4 h-4 text-[#C9A84C]" /> Contact
                </Link>
              </div>
              <div className="border-t border-[#C9A84C]/20 pt-4 mt-4">
                <WalletConnectButton compact />
                {isAuthenticated ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4 text-[#C9A84C]" />
                      <span className="text-sm text-[#C8BC98]">{user?.name || 'Collector'}</span>
                    </div>
                    {isAdmin && (
                      <Link to="/admin" className="flex items-center gap-3 text-sm text-[#C8BC98] hover:text-[#E8CB7A]">
                        <Shield className="w-4 h-4 text-[#C9A84C]" /> Admin Dashboard
                      </Link>
                    )}
                    <button onClick={logout} className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300">
                      <LogOut className="w-4 h-4" /> Sign Out
                    </button>
                  </div>
                ) : (
                  <Link to="/login" className="block text-center px-5 py-3 border border-[#C9A84C] text-[#C9A84C] text-xs tracking-[3px] uppercase font-cinzel font-semibold">
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Liability Banner on payment pages */}
      {isPaymentPage && <div className="pt-16 lg:pt-20"><LiabilityBanner /></div>}

      {/* Main Content */}
      <main>
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[#C9A84C]/20 bg-[#080808]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-10">
            {/* Brand */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-7 h-7 border border-[#C9A84C] rotate-45 flex items-center justify-center">
                  <Diamond className="w-3 h-3 text-[#C9A84C] -rotate-45" />
                </div>
                <span className="font-cinzel text-base font-bold tracking-[4px] text-[#C9A84C]">THE VAULT</span>
              </div>
              <p className="font-cormorant italic text-sm text-[#C8BC98] leading-relaxed mb-4 max-w-xs">
                The elite collector exchange. Peer-to-peer marketplace for rare and exclusive items. AI-powered. Blockchain-certified. Collector-first.
              </p>
              {/* Social Media */}
              <div className="flex gap-2">
                <SocialIcon href="https://x.com/thevault">
                  <XSocialIcon />
                </SocialIcon>
                <SocialIcon href="https://instagram.com/thevault">
                  <InstagramIcon />
                </SocialIcon>
                <SocialIcon href="mailto:ratchetkrewelabs@gmail.com">
                  <Mail className="w-3.5 h-3.5" />
                </SocialIcon>
              </div>
            </div>

            {/* Platform Links */}
            <div>
              <h4 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] font-cinzel font-semibold mb-4 pb-3 border-b border-[#C9A84C]/20">Platform</h4>
              <ul className="space-y-2">
                {footerPlatform.map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-xs text-[#C8BC98] hover:text-[#C9A84C] transition-colors tracking-[1px]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] font-cinzel font-semibold mb-4 pb-3 border-b border-[#C9A84C]/20">Company</h4>
              <ul className="space-y-2">
                {footerCompany.map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-xs text-[#C8BC98] hover:text-[#C9A84C] transition-colors tracking-[1px]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-[9px] tracking-[4px] uppercase text-[#C9A84C] font-cinzel font-semibold mb-4 pb-3 border-b border-[#C9A84C]/20">Legal</h4>
              <ul className="space-y-2">
                {footerLegal.map((item) => (
                  <li key={item.label}>
                    <Link to={item.path} className="text-xs text-[#C8BC98] hover:text-[#C9A84C] transition-colors tracking-[1px]">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-[#C9A84C]/10">
                <a href="mailto:ratchetkrewelabs@gmail.com" className="flex items-center gap-2 text-xs text-[#C8BC98] hover:text-[#C9A84C] transition-colors">
                  <Mail className="w-3.5 h-3.5" /> ratchetkrewelabs@gmail.com
                </a>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-[#C9A84C]/10 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-[10px] tracking-[2px] text-[#8A6E2F] uppercase">&copy; 2024 The Vault. All rights reserved.</p>
            <div className="flex gap-6">
              {footerLegal.map((item) => (
                <Link key={item.label} to={item.path} className="text-[10px] tracking-[2px] text-[#8A6E2F] uppercase hover:text-[#C9A84C] transition-colors">
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <FooterDisclaimer />
    </div>
  )
}
