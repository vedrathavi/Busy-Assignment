import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
  FiUserCheck,
} from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';

export function LoginPage() {
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirection target from protected route attempt
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  // Demo presets are dev-only and strictly gated
  const isDemoEnabled = Boolean(
    import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_LOGIN === 'true'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('Password123!');
    setError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#f7f4ed] p-4 sm:p-6 lg:p-8">
      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center animate-in fade-in duration-300">
        <div className="flex h-10 w-10 items-center justify-center rounded-[8px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset mb-1">
          <FiZap className="h-5 w-5" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1c1c1c]">
          BUSY Sales CRM
        </h1>
        <p className="text-sm text-[#5f5f5d] mt-1.5 max-w-sm leading-relaxed">
          Modern enterprise sales & pipeline management platform
        </p>
      </div>

      {/* Main Login Card - Lovable Warm Cream Surface & Inset Shadows */}
      <Card className="w-full max-w-md border border-[#eceae4] bg-[#f7f4ed] rounded-xl animate-in fade-in duration-300">
        <CardHeader className="space-y-1 pb-4">
          <CardTitle className="text-xl font-semibold tracking-tight text-center text-[#1c1c1c]">Sign In</CardTitle>
          <CardDescription className="text-center text-xs sm:text-sm text-[#5f5f5d]">
            Enter your company credentials to access your workspace
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3 rounded-[6px] bg-destructive/10 border border-destructive/20 text-destructive text-xs sm:text-sm animate-in fade-in"
              >
                <FiAlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span className="leading-snug">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-normal text-[#1c1c1c]">
                Work Email
              </Label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f5f5d] pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@busy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-9 text-sm rounded-[6px] border-[#eceae4] bg-[#fcfbf8]"
                  disabled={isSubmitting || isLoading}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-normal text-[#1c1c1c]">
                  Password
                </Label>
              </div>
              <div className="relative">
                <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#5f5f5d] pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pl-9 pr-9 text-sm rounded-[6px] border-[#eceae4] bg-[#fcfbf8]"
                  disabled={isSubmitting || isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f5f5d] hover:text-[#1c1c1c] transition-colors p-0.5"
                  tabIndex={-1}
                >
                  {showPassword ? <FiEyeOff className="h-4 w-4" /> : <FiEye className="h-4 w-4" />}
                  <span className="sr-only">Toggle password visibility</span>
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-10 mt-2 font-normal text-sm"
              disabled={isSubmitting || isLoading}
            >
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full border-2 border-[#fcfbf8] border-t-transparent animate-spin" />
                  Authenticating...
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  Sign In to Workspace
                  <FiArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>
          </CardContent>
        </form>

        {/* Development Quick-Fill Presets */}
        {isDemoEnabled && (
          <CardFooter className="flex flex-col pt-0 pb-6 border-t border-[#eceae4] mt-2">
            <div className="w-full pt-4 text-center">
              <span className="text-[0.6875rem] uppercase tracking-wider text-[#5f5f5d] font-normal block mb-2.5">
                Development Test Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillPreset('manager@busy.com')}
                  className="h-auto py-2 flex flex-col items-start text-left border-[#eceae4] hover:bg-[#eceae4] rounded-[6px]"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#1c1c1c] font-medium">
                    <FiShield className="h-3.5 w-3.5 text-[#1c1c1c]" />
                    Manager
                  </span>
                  <span className="text-[0.6875rem] text-[#5f5f5d] truncate w-full">
                    manager@busy.com
                  </span>
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fillPreset('alex@busy.com')}
                  className="h-auto py-2 flex flex-col items-start text-left border-[#eceae4] hover:bg-[#eceae4] rounded-[6px]"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs text-[#1c1c1c] font-medium">
                    <FiUserCheck className="h-3.5 w-3.5 text-[#1c1c1c]" />
                    Sales Rep
                  </span>
                  <span className="text-[0.6875rem] text-[#5f5f5d] truncate w-full">
                    alex@busy.com
                  </span>
                </Button>
              </div>
            </div>
          </CardFooter>
        )}
      </Card>

      {/* Footer Info */}
      <footer className="mt-8 text-center text-xs text-[#5f5f5d]">
        &copy; {new Date().getFullYear()} Busy Infotech Sales CRM. All rights reserved.
      </footer>
    </div>
  );
}
