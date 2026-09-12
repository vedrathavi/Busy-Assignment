import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  FiMenu,
  FiSearch,
  FiLogOut,
  FiUser,
  FiShield,
  FiZap,
  FiBell,
  FiX,
} from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import { useAlertsCount } from '@/features/alerts/useAlerts';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { NavbarSearch } from './NavbarSearch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  onMenuToggle: () => void;
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { user, isManager, logout } = useAuth();
  const { data: alertsCount } = useAlertsCount();
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const count = alertsCount?.count || 0;

  return (
    <header className="sticky top-0 z-30 shrink-0 flex flex-col w-full border-b border-[#eceae4] bg-[#f7f4ed]/95 backdrop-blur-md">
      <div className="flex h-16 w-full items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile hamburger trigger + Mobile Brand + Desktop Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuToggle}
            className="lg:hidden text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.04)]"
            aria-label="Open menu"
          >
            <FiMenu className="h-5 w-5" />
          </Button>

          {/* Small screen brand logo (when sidebar is hidden) */}
          <div className="flex items-center gap-2 lg:hidden mr-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
              <FiZap className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-[#1c1c1c] whitespace-nowrap">
              BUSY CRM
            </span>
          </div>

          {/* Desktop Search Bar with Attached Dropdown Directly Below */}
          <div className="hidden md:flex flex-1 items-center">
            <NavbarSearch />
          </div>
        </div>

        {/* Right: Mobile Search Icon + Alerts Bell + Role badge + User profile dropdown */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Mobile search toggle button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileSearchOpen((prev) => !prev)}
            className="md:hidden h-8 w-8 rounded-full border border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4]"
            aria-label="Toggle search bar"
          >
            {isMobileSearchOpen ? <FiX className="h-4 w-4" /> : <FiSearch className="h-4 w-4" />}
          </Button>

          {/* Alerts Bell Notification link */}
          <Link to="/alerts">
            <Button
              variant="ghost"
              size="icon"
              className="relative h-8 w-8 rounded-full border border-[#eceae4] text-[#1c1c1c] hover:bg-[#eceae4] hover:border-[rgba(28,28,28,0.4)]"
              aria-label="View overdue alerts"
            >
              <FiBell className="h-4 w-4" />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#1c1c1c] px-1 text-[0.5625rem] font-bold text-[#fcfbf8]">
                  {count}
                </span>
              )}
            </Button>
          </Link>

          {user && (
            <Badge
              variant={isManager ? 'default' : 'secondary'}
              className="hidden sm:inline-flex text-xs px-2.5 py-0.5 font-normal"
            >
              <FiShield className="mr-1 h-3 w-3" />
              {isManager ? 'Manager' : 'Sales Rep'}
            </Badge>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-8 w-8 rounded-full p-0 border border-[#eceae4] hover:border-[rgba(28,28,28,0.4)]"
                aria-label="User profile menu"
              >
                <Avatar fallback={initials} className="h-8 w-8 text-xs font-normal text-[#1c1c1c] bg-[#eceae4]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1 rounded-[8px] border-[#eceae4] bg-[#fcfbf8] shadow-focus-soft">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-[#1c1c1c]">{user?.name}</p>
                  <p className="text-xs leading-none text-[#5f5f5d] truncate">{user?.email}</p>
                  <div className="pt-1.5 sm:hidden">
                    <Badge variant={isManager ? 'default' : 'secondary'} className="text-[0.625rem]">
                      {isManager ? 'Manager' : 'Sales Rep'}
                    </Badge>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-[#eceae4]" />
              <DropdownMenuItem disabled className="cursor-default text-xs text-[#5f5f5d] gap-2">
                <FiUser className="h-4 w-4" />
                <span>Org: {user?.organizationId ? user.organizationId.slice(0, 8) + '...' : 'Default'}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#eceae4]" />
              <DropdownMenuItem
                onClick={logout}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive gap-2 text-xs font-normal"
              >
                <FiLogOut className="h-4 w-4" />
                <span>Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search bar expandable drawer */}
      {isMobileSearchOpen && (
        <div className="md:hidden border-t border-[#eceae4] px-4 py-2.5 bg-[#fcfbf8]">
          <NavbarSearch />
        </div>
      )}
    </header>
  );
}
