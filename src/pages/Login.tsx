import { useState } from 'react'
import { Link } from 'react-router'
import { trpc } from '@/providers/trpc'
import {
  Diamond, LogIn, Loader2, UserPlus, ArrowLeft, Eye, EyeOff
} from 'lucide-react'

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 1C5.922 1 1 5.922 1 12c0 4.86 3.152 8.983 7.523 10.437.55.102.753-.238.753-.53 0-.26-.009-.952-.014-1.87-3.06.664-3.706-1.475-3.706-1.475-.5-1.27-1.222-1.61-1.222-1.61-.998-.682.076-.668.076-.668 1.104.078 1.684 1.133 1.684 1.133.98 1.68 2.57 1.195 3.198.914.1-.71.384-1.196.698-1.47-2.442-.278-5.01-1.222-5.01-5.437 0-1.2.43-2.183 1.134-2.953-.114-.278-.492-1.397.108-2.91 0 0 .924-.296 3.026 1.128A10.59 10.59 0 0 1 12 5.803c.94.005 1.884.127 2.77.372 2.1-1.424 3.022-1.128 3.022-1.128.602 1.513.224 2.632.11 2.91.706.77 1.132 1.753 1.132 2.953 0 4.225-2.572 5.156-5.022 5.428.395.34.747 1.01.747 2.037 0 1.47-.014 2.657-.014 3.017 0 .295.2.637.757.53C19.85 20.98 23 16.858 23 12c0-6.078-4.922-11-11-11z" />
    </svg>
  )
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function cleanAuthError(message: string) {
  if (!message) {
    return 'Authentication failed. Please try again.'
  }

  if (
    message.includes('Unable to transform response') ||
    message.includes('Unexpected token') ||
    message.includes('Unexpected end of JSON')
  ) {
    return 'Authentication service temporarily unavailable. The API may still be deploying or restarting.'
  }

  if (message.includes('Failed to fetch')) {
    return 'Unable to reach authentication servers. Please check your connection and try again.'
  }

  return message
}

function ProviderButton({
  label,
  icon,
  onClick,
  disabled,
  pending,
}: {
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  pending?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || pending}
      className="w-full flex items-center justify-center gap-3 py-3.5 text-xs tracking-[2px] uppercase font-cinzel font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed border border-[#C9A84C]/30 text-[#C9A84C] hover:bg-[#C9A84C]/8"
    >
      {pending ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {label}
    </button>
  )
}

export default function Login() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleAuthSuccess = () => {
    window.location.href = '/'
  }

  const loginMutation = trpc.localAuth.login.useMutation({
    onSuccess: () => handleAuthSuccess(),
    onError: (err) => setError(cleanAuthError(err.message)),
  })

  const registerMutation = trpc.localAuth.register.useMutation({
    onSuccess: () => handleAuthSuccess(),
    onError: (err) => setError(cleanAuthError(err.message)),
  })

  const getOAuthUrl = trpc.oauth.getAuthUrl.useMutation({
    onSuccess: (data) => {
      if (data?.url) {
        window.location.href = data.url
        return
      }

      setError(data?.error || 'OAuth provider unavailable.')
    },
    onError: (err) => setError(cleanAuthError(err.message)),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (loginMutation.isPending || registerMutation.isPending) {
      return
    }

    setError('')

    const normalizedEmail = normalizeEmail(email)
    const trimmedName = name.trim()

    if (mode === 'login') {
      if (!normalizedEmail || !password) {
        setError('Email and password are required')
        return
      }

      loginMutation.mutate({ email: normalizedEmail, password })
      return
    }

    if (!trimmedName || !normalizedEmail || !password) {
      setError('All fields are required')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    registerMutation.mutate({
      name: trimmedName,
      email: normalizedEmail,
      password,
    })
  }

  const handleProviderOAuth = (provider: 'google' | 'x' | 'github') => {
    if (getOAuthUrl.isPending) {
      return
    }

    setError('')
    getOAuthUrl.mutate({ provider })
  }

  const isPending = loginMutation.isPending || registerMutation.isPending || getOAuthUrl.isPending

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md w-full">
        <div className="text-center mb-10">
          <div className="w-12 h-12 border border-[#C9A84C] rotate-45 flex items-center justify-center mx-auto mb-4">
            <Diamond className="w-5 h-5 text-[#C9A84C] -rotate-45" />
          </div>
          <h1 className="font-cinzel text-xl sm:text-2xl font-bold text-[#F5EED8] tracking-[6px]">
            THE VAULT
          </h1>
          <p className="text-[9px] tracking-[4px] uppercase text-[#8A6E2F] mt-2">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </p>
        </div>

        <div className="bg-[#161616] border border-[#C9A84C]/25 p-8 relative">
          <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-[#C9A84C]" />
          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-[#C9A84C]" />

          <div className="space-y-3 mb-6">
            <ProviderButton
              label="Sign In with Google"
              icon={<GoogleIcon className="w-4 h-4" />}
              onClick={() => handleProviderOAuth('google')}
              pending={getOAuthUrl.isPending}
            />
            <ProviderButton
              label="Sign In with X"
              icon={<XIcon className="w-4 h-4" />}
              onClick={() => handleProviderOAuth('x')}
              pending={getOAuthUrl.isPending}
            />
            <ProviderButton
              label="Sign In with GitHub"
              icon={<GitHubIcon className="w-4 h-4" />}
              onClick={() => handleProviderOAuth('github')}
              pending={getOAuthUrl.isPending}
            />
          </div>

          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-[#C9A84C]/15" />
            <span className="text-[10px] text-[#8A6E2F] tracking-[2px] uppercase">or use email</span>
            <div className="flex-1 h-px bg-[#C9A84C]/15" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <div>
                <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-2">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Collector"
                  maxLength={80}
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
                />
              </div>
            )}

            <div>
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-2">Email</label>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="collector@vault.com"
                className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
              />
            </div>

            <div>
              <label className="block text-[9px] tracking-[4px] uppercase text-[#C9A84C] mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="w-full bg-[#1E1E1E] border border-[#C9A84C]/20 text-[#F5EED8] text-sm py-3 px-4 pr-12 outline-none focus:border-[#C9A84C] transition-colors placeholder:text-[#8A6E2F]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A6E2F] hover:text-[#C9A84C] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/5 border border-red-500/20 text-red-400 text-xs text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-3 py-3.5 bg-gradient-to-br from-[#C9A84C] to-[#8A6E2F] text-[#080808] font-cinzel text-[11px] tracking-[3px] uppercase font-bold hover:shadow-[0_0_40px_rgba(201,168,76,0.4)] transition-all disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
              className="text-xs text-[#C8BC98] hover:text-[#C9A84C] transition-colors tracking-[1px]"
            >
              {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign In'}
            </button>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-[3px] uppercase text-[#8A6E2F] hover:text-[#C9A84C] transition-colors"
          >
            <ArrowLeft className="w-3 h-3" />
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}