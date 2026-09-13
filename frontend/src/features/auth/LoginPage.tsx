import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getApiErrorMessage } from '@/lib/api/client';
import {
  FiAlertCircle,
  FiArrowRight,
  FiEye,
  FiEyeOff,
  FiLock,
  FiMail,
  FiShield,
  FiZap,
  FiTrendingUp,
  FiDollarSign,
  FiAward,
  FiXCircle,
  FiUsers,
  FiCheckCircle,
  FiBarChart2,
  FiLayers,
  FiHelpCircle,
  FiArrowUpRight,
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mode state: 'signin' | 'signup'
  const isSignupPath = location.pathname === '/signup';
  const [mode, setMode] = useState<'signin' | 'signup'>(isSignupPath ? 'signup' : 'signin');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelpDialog, setShowHelpDialog] = useState(false);

  // Sync mode with URL if navigated externally
  useEffect(() => {
    setMode(location.pathname === '/signup' ? 'signup' : 'signin');
  }, [location.pathname]);

  // Restore remembered email from localStorage on initial load
  useEffect(() => {
    const savedEmail = localStorage.getItem('crm_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Target path after login
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setError(null);
    if (newMode === 'signup' && location.pathname !== '/signup') {
      window.history.replaceState(null, '', '/signup');
    } else if (newMode === 'signin' && location.pathname !== '/login') {
      window.history.replaceState(null, '', '/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    if (rememberMe) {
      localStorage.setItem('crm_remembered_email', email.trim());
    } else {
      localStorage.removeItem('crm_remembered_email');
    }

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#fcfbf8] text-[#1c1c1c] antialiased">
      {/* ========================================================================= */}
      {/* LEFT COLUMN: AUTHENTICATION FORM (50% ON DESKTOP, 100% ON MOBILE)         */}
      {/* ========================================================================= */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between px-6 py-8 sm:px-12 sm:py-10 md:px-16 lg:px-10 xl:px-16 min-h-screen bg-[#fcfbf8] border-r border-[#eceae4]/80">
        {/* Brand Header */}
        <header className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-[7px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
              <FiZap className="h-4.5 w-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-semibold tracking-tight text-[#1c1c1c] leading-tight">
                BUSY CRM
              </span>
              <span className="text-[11px] font-medium text-[#5f5f5d] tracking-wide uppercase">
                Sales Pipeline Suite
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#f7f4ed] border border-[#eceae4] text-[#5f5f5d]">
            <FiShield className="h-3 w-3 text-[#1c1c1c]" />
            Enterprise Edition
          </span>
        </header>

        {/* Center Auth Card Container */}
        <main className="w-full max-w-[420px] mx-auto my-auto py-8">
          {/* Segmented Mode Switcher */}
          <div className="flex p-1 mb-8 rounded-[8px] bg-[#f7f4ed] border border-[#eceae4]">
            <button
              type="button"
              onClick={() => handleModeSwitch('signin')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
                mode === 'signin'
                  ? 'bg-white text-[#1c1c1c] shadow-2xs'
                  : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('signup')}
              className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all duration-150 cursor-pointer ${
                mode === 'signup'
                  ? 'bg-white text-[#1c1c1c] shadow-2xs'
                  : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* SIGN IN VIEW */}
          {mode === 'signin' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1c1c1c]">
                  Welcome Back
                </h1>
                <p className="text-sm text-[#5f5f5d]">
                  Enter your email and password to access your CRM account.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm animate-in fade-in"
                >
                  <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-[#1c1c1c]">
                    Work Email
                  </Label>
                  <div className="relative">
                    <FiMail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f5f5d] pointer-events-none" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 h-10 text-sm rounded-[6px] border-[#eceae4] bg-[#fcfbf8] text-[#1c1c1c] placeholder:text-[#5f5f5d]/60 focus:border-[#1c1c1c] focus:ring-1 focus:ring-[#1c1c1c]/10"
                      disabled={isSubmitting || isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-xs font-medium text-[#1c1c1c]">
                      Password
                    </Label>
                    <button
                      type="button"
                      onClick={() => setShowHelpDialog(true)}
                      className="text-xs text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <FiLock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f5f5d] pointer-events-none" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="pl-10 pr-10 h-10 text-sm rounded-[6px] border-[#eceae4] bg-[#fcfbf8] text-[#1c1c1c] placeholder:text-[#5f5f5d]/60 focus:border-[#1c1c1c] focus:ring-1 focus:ring-[#1c1c1c]/10"
                      disabled={isSubmitting || isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me Option */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    id="remember"
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-[#eceae4] text-[#1c1c1c] accent-[#1c1c1c] cursor-pointer"
                  />
                  <label htmlFor="remember" className="text-xs text-[#5f5f5d] cursor-pointer select-none">
                    Remember my email for this device
                  </label>
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  className="w-full h-10 mt-2 text-sm font-medium bg-[#1c1c1c] hover:bg-[#2b2b2b] text-[#fcfbf8] shadow-button-inset cursor-pointer"
                  disabled={isSubmitting || isLoading}
                >
                  {isSubmitting ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 rounded-full border-2 border-[#fcfbf8] border-t-transparent animate-spin" />
                      Authenticating...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      Sign In
                      <FiArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Secondary Helper Toggle */}
              <div className="pt-2 text-center text-xs text-[#5f5f5d]">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signup')}
                  className="font-medium text-[#1c1c1c] hover:underline cursor-pointer"
                >
                  Sign Up
                </button>
              </div>
            </div>
          )}

          {/* SIGN UP / ENTERPRISE PROVISIONING VIEW */}
          {mode === 'signup' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div className="space-y-1.5">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1c1c1c]">
                  Get Started
                </h1>
                <p className="text-sm text-[#5f5f5d]">
                  Join your organization workspace on BUSY Sales CRM.
                </p>
              </div>

              {/* Enterprise Provisioning Notice Card */}
              <div className="p-4 rounded-xl border border-[#eceae4] bg-[#f7f4ed] space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#1c1c1c]">
                  <FiShield className="h-4 w-4 text-[#1c1c1c]" />
                  Enterprise Role Provisioning
                </div>

                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  BUSY CRM is a role-governed enterprise sales platform. To maintain strict pipeline security and data isolation, individual user accounts (Sales Rep and Manager) are provisioned directly by your Team Administrator.
                </p>

                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2 text-xs text-[#1c1c1c]">
                    <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Role permissions configured by your organization</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#1c1c1c]">
                    <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Automatic team &amp; deal pipeline synchronization</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-[#1c1c1c]">
                    <FiCheckCircle className="h-3.5 w-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    <span>Secure authenticated credentials issued by Manager</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <Button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="w-full h-10 text-sm font-medium bg-[#1c1c1c] hover:bg-[#2b2b2b] text-[#fcfbf8] shadow-button-inset cursor-pointer"
                >
                  <span className="inline-flex items-center gap-2">
                    I Have Credentials &mdash; Sign In
                    <FiArrowRight className="h-4 w-4" />
                  </span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowHelpDialog(true)}
                  className="w-full h-10 text-xs font-medium border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4] cursor-pointer"
                >
                  <FiHelpCircle className="h-3.5 w-3.5 mr-1.5" />
                  Contact Organization Administrator
                </Button>
              </div>

              <div className="pt-2 text-center text-xs text-[#5f5f5d]">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch('signin')}
                  className="font-medium text-[#1c1c1c] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </div>
            </div>
          )}

          {/* Help Modal */}
          {showHelpDialog && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-sm rounded-xl border border-[#eceae4] bg-[#fcfbf8] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#1c1c1c]">Need Workspace Access?</h3>
                  <button
                    type="button"
                    onClick={() => setShowHelpDialog(false)}
                    className="text-xs text-[#5f5f5d] hover:text-[#1c1c1c] p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
                <p className="text-xs text-[#5f5f5d] leading-relaxed">
                  If you need a new user account, a role change, or a password reset, please reach out to your team manager or IT administrator who can provision your credentials directly in the CRM Team management module.
                </p>
                <Button
                  type="button"
                  onClick={() => setShowHelpDialog(false)}
                  className="w-full h-8 text-xs font-medium cursor-pointer"
                >
                  Got It
                </Button>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="w-full pt-6 border-t border-[#eceae4] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5f5f5d]">
          <span>&copy; {new Date().getFullYear()} BUSY Infotech. All rights reserved.</span>
          <div className="flex items-center gap-4 text-xs">
            <span className="hover:text-[#1c1c1c] cursor-pointer">Privacy Policy</span>
            <span className="hover:text-[#1c1c1c] cursor-pointer">Terms of Service</span>
            <span className="hover:text-[#1c1c1c] cursor-pointer">Security</span>
          </div>
        </footer>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT COLUMN: 50% GRAPHIC PANEL WITH REALISTIC 3D ANIMATED CRM DASHBOARD  */}
      {/* ========================================================================= */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen flex-col justify-between p-8 xl:p-12 bg-[#1c1c1c] text-[#fcfbf8] relative overflow-hidden select-none">
        {/* Ambient Warm Texture Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_55%)] pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-white/[0.02] border border-white/[0.05] pointer-events-none" />
        <div className="absolute top-1/4 -left-20 h-64 w-64 rounded-full bg-white/[0.015] pointer-events-none" />

        {/* Top Product Header */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-white/[0.07] border border-white/10 text-white/90">
            <FiLayers className="h-3.5 w-3.5 text-white/80" />
            <span>BUSY CRM &bull; Sales Pipeline Suite</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-white/60">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Telemetry &bull; Active Workspace
          </div>
        </div>

        {/* Center 3D Floating Realistic Dashboard */}
        <div className="relative z-10 my-auto py-4 w-full max-w-xl mx-auto flex flex-col items-center">
          {/* Main 3D Floating Realistic Dashboard Card */}
          <div className="w-full animate-float-3d transform-gpu relative">
            {/* Realistic CRM Dashboard Mockup Surface (Matching App Warm Cream Theme) */}
            <div className="rounded-2xl p-5 bg-[#f7f4ed] text-[#1c1c1c] border border-[#eceae4] shadow-[0_30px_70px_rgba(0,0,0,0.55),0_0_1px_rgba(255,255,255,0.2)] space-y-4">
              {/* Dashboard Top Header Bar */}
              <div className="flex items-center justify-between pb-3 border-b border-[#eceae4]">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
                    <FiZap className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold tracking-tight text-[#1c1c1c]">
                        Sales Dashboard
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-normal border border-[#eceae4] text-[#5f5f5d] bg-[#fcfbf8]">
                        Team View
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5f5f5d]">
                      Welcome back, Sarah Jenkins.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#eceae4] text-[#1c1c1c]">
                    Q3 Forecast
                  </span>
                </div>
              </div>

              {/* 4 Realistic Executive Metric Cards */}
              <div className="grid grid-cols-4 gap-2.5">
                {/* Metric 1: Open Deals */}
                <div className="p-2.5 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#5f5f5d]">
                    <span>Open Deals</span>
                    <FiTrendingUp className="h-3 w-3 text-[#1c1c1c]" />
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-[#1c1c1c] mt-1">
                    32
                  </div>
                  <div className="text-[9px] text-[#5f5f5d] flex items-center justify-between mt-0.5">
                    <span>Active pipeline</span>
                    <FiArrowUpRight className="h-2.5 w-2.5 text-[#1c1c1c]" />
                  </div>
                </div>

                {/* Metric 2: Weighted Pipeline */}
                <div className="p-2.5 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-[#5f5f5d]">
                    <span>Weighted Val</span>
                    <FiDollarSign className="h-3 w-3 text-[#1c1c1c]" />
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-[#1c1c1c] mt-1">
                    &#8377;1.84 Cr
                  </div>
                  <div className="text-[9px] text-[#5f5f5d] flex items-center justify-between mt-0.5">
                    <span>Forecasted</span>
                    <FiArrowUpRight className="h-2.5 w-2.5 text-[#1c1c1c]" />
                  </div>
                </div>

                {/* Metric 3: Won This Month */}
                <div className="p-2.5 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-emerald-700">
                    <span>Won Deals</span>
                    <div className="h-4 w-4 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <FiAward className="h-2.5 w-2.5" />
                    </div>
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-[#1c1c1c] mt-1">
                    14
                  </div>
                  <div className="text-[9px] text-emerald-600 flex items-center justify-between mt-0.5 font-medium">
                    <span>+22% vs Q2</span>
                    <FiArrowUpRight className="h-2.5 w-2.5" />
                  </div>
                </div>

                {/* Metric 4: Lost Deals */}
                <div className="p-2.5 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs">
                  <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-wider text-rose-700">
                    <span>Lost</span>
                    <div className="h-4 w-4 rounded bg-rose-100 text-rose-800 flex items-center justify-center">
                      <FiXCircle className="h-2.5 w-2.5" />
                    </div>
                  </div>
                  <div className="text-lg font-semibold tracking-tight text-[#1c1c1c] mt-1">
                    2
                  </div>
                  <div className="text-[9px] text-[#5f5f5d] flex items-center justify-between mt-0.5">
                    <span>Closed-lost</span>
                    <FiArrowUpRight className="h-2.5 w-2.5" />
                  </div>
                </div>
              </div>

              {/* Realistic Split: 8-Week Win Trend & Stage Breakdown */}
              <div className="grid grid-cols-12 gap-3 pt-1">
                {/* Left: 8-Week Win Trend Chart Mockup (7 cols) */}
                <div className="col-span-7 p-3 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs flex flex-col justify-between">
                  <div className="flex items-center justify-between pb-2">
                    <div>
                      <span className="text-xs font-semibold text-[#1c1c1c] block">
                        8-Week Win Trend
                      </span>
                      <span className="text-[10px] text-[#5f5f5d]">
                        Weekly closed-won deal progression
                      </span>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border border-[#eceae4] text-[#5f5f5d]">
                      Trailing 8W
                    </span>
                  </div>

                  {/* Visual Chart Bars (Realistic Charcoal Bars on Cream Surface) */}
                  <div className="pt-2">
                    <div className="flex items-end gap-2 h-20 pt-1 border-b border-[#eceae4] pb-1">
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[35%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[50%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[40%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[65%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[60%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[80%]" />
                      <div className="flex-1 bg-[#1c1c1c] rounded-t h-[70%]" />
                      <div className="flex-1 bg-emerald-700 rounded-t h-[95%]" />
                    </div>
                    <div className="flex justify-between text-[8px] font-medium text-[#5f5f5d] pt-1">
                      <span>W1</span>
                      <span>W2</span>
                      <span>W3</span>
                      <span>W4</span>
                      <span>W5</span>
                      <span>W6</span>
                      <span>W7</span>
                      <span className="text-emerald-700 font-semibold">W8</span>
                    </div>
                  </div>
                </div>

                {/* Right: Stage Breakdown (5 cols) */}
                <div className="col-span-5 p-3 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-2xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1c1c1c]">Stage Breakdown</span>
                    <span className="text-[9px] text-[#5f5f5d]">32 Open</span>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    {/* Stage 1 */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#1c1c1c] font-medium">
                        <span>New</span>
                        <span className="text-[#5f5f5d]">6 deals (18%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#eceae4] mt-0.5 overflow-hidden">
                        <div className="h-full bg-[#1c1c1c] rounded-full" style={{ width: '18%' }} />
                      </div>
                    </div>

                    {/* Stage 2 */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#1c1c1c] font-medium">
                        <span>Qualified</span>
                        <span className="text-[#5f5f5d]">10 deals (31%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#eceae4] mt-0.5 overflow-hidden">
                        <div className="h-full bg-[#1c1c1c] rounded-full" style={{ width: '31%' }} />
                      </div>
                    </div>

                    {/* Stage 3 */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#1c1c1c] font-medium">
                        <span>Proposal</span>
                        <span className="text-[#5f5f5d]">8 deals (25%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#eceae4] mt-0.5 overflow-hidden">
                        <div className="h-full bg-[#1c1c1c] rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>

                    {/* Stage 4 */}
                    <div>
                      <div className="flex justify-between text-[10px] text-[#1c1c1c] font-medium">
                        <span>Negotiation</span>
                        <span className="text-[#5f5f5d]">5 deals (16%)</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[#eceae4] mt-0.5 overflow-hidden">
                        <div className="h-full bg-[#1c1c1c] rounded-full" style={{ width: '16%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Layered Floating Deal Card (Live Deal & Collaborators) */}
              <div className="p-3 rounded-xl border border-[#eceae4] bg-[#fcfbf8] shadow-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-[6px] bg-[#eceae4] text-[#1c1c1c] flex items-center justify-center shrink-0">
                    <FiTrendingUp className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-[#1c1c1c]">
                        Apex Energy &bull; SCADA Upgrade
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-medium bg-[#eceae4] text-[#1c1c1c]">
                        Negotiation
                      </span>
                    </div>
                    <span className="text-[10px] text-[#5f5f5d]">
                      &#8377;50,00,000 &bull; Owner: Alex Rivera
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1.5 overflow-hidden">
                    <div className="h-6 w-6 rounded-full bg-[#1c1c1c] text-[9px] font-semibold text-[#fcfbf8] flex items-center justify-center border border-[#fcfbf8]">
                      AR
                    </div>
                    <div className="h-6 w-6 rounded-full bg-[#eceae4] text-[9px] font-semibold text-[#1c1c1c] flex items-center justify-center border border-[#fcfbf8]">
                      PS
                    </div>
                    <div className="h-6 w-6 rounded-full bg-[#5f5f5d] text-[9px] font-semibold text-[#fcfbf8] flex items-center justify-center border border-[#fcfbf8]">
                      SJ
                    </div>
                  </div>
                  <FiUsers className="h-3.5 w-3.5 text-[#5f5f5d] ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Feature Badges */}
        <div className="relative z-10 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-6">
            <span className="inline-flex items-center gap-1.5">
              <FiShield className="h-3.5 w-3.5 text-white/80" />
              Database-Authoritative RBAC
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FiUsers className="h-3.5 w-3.5 text-white/80" />
              Team Scoping
            </span>
            <span className="inline-flex items-center gap-1.5">
              <FiBarChart2 className="h-3.5 w-3.5 text-white/80" />
              Real-time Analytics
            </span>
          </div>

          <span className="text-white/40 text-[11px]">v2.4 Production</span>
        </div>
      </div>
    </div>
  );
}
