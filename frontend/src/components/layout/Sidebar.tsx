import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  FiGrid,
  FiGlobe,
  FiTrendingUp,
  FiCheckSquare,
  FiBell,
  FiZap,
  FiUsers,
  FiTrash2,
  FiChevronLeft,
  FiChevronRight,
} from 'react-icons/fi';
import { useAuth } from '@/features/auth/AuthContext';
import { useAlertsCount } from '@/features/alerts/useAlerts';
import { useNotificationCount } from '@/features/notifications/useNotifications';
import { useUIStore } from '@/store/ui.store';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const navigationItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: FiGrid,
  },
  {
    title: 'Companies',
    href: '/companies',
    icon: FiGlobe,
  },
  {
    title: 'Deals',
    href: '/deals',
    icon: FiTrendingUp,
  },
  {
    title: 'Tasks & Follow-ups',
    href: '/tasks',
    icon: FiCheckSquare,
  },
  {
    title: 'Team',
    href: '/users',
    icon: FiUsers,
  },
  {
    title: 'Activity & Alerts',
    href: '/alerts',
    icon: FiBell,
  },
  {
    title: 'Trash',
    href: '/trash',
    icon: FiTrash2,
  },
];

interface SidebarProps {
  className?: string;
  onNavigate?: () => void;
  forceExpanded?: boolean;
}

export function Sidebar({ className, onNavigate, forceExpanded = false }: SidebarProps) {
  const { user, isManager } = useAuth();
  const location = useLocation();
  const { data: alertsCount } = useAlertsCount();
  const { data: notifCount } = useNotificationCount();
  const { isSidebarCollapsed, toggleSidebar } = useUIStore();

  const isCollapsed = forceExpanded ? false : isSidebarCollapsed;

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  const count = (alertsCount?.count || 0) + (notifCount?.unreadCount || 0);

  return (
    <aside
      className={cn(
        'relative flex h-full flex-col border-r border-[#eceae4] bg-[#f7f4ed] transition-all duration-200',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Desktop Collapse Toggle Button on Border */}
      {!forceExpanded && (
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="hidden lg:flex absolute -right-3 top-5 z-50 h-6 w-6 items-center justify-center rounded-full border border-[#eceae4] bg-white text-[#5f5f5d] shadow-xs transition-colors hover:bg-[#fcfbf8] hover:text-[#1c1c1c] cursor-pointer"
        >
          {isCollapsed ? (
            <FiChevronRight className="h-3 w-3" />
          ) : (
            <FiChevronLeft className="h-3 w-3" />
          )}
        </button>
      )}

      {/* Brand Logo / Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-[#eceae4] transition-all px-4',
          isCollapsed && 'justify-center px-2'
        )}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset">
            <FiZap className="h-4 w-4" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight text-[#1c1c1c] truncate">BUSY CRM</span>
              <span className="text-[10px] font-medium tracking-wider text-[#5f5f5d] uppercase truncate">
                Pipeline
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto px-2.5 py-4">
        {!isCollapsed && (
          <div className="px-2.5 pb-2 text-[10px] font-semibold uppercase tracking-wider text-[#8e8d8a]">
            Navigation
          </div>
        )}
        <nav className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isAlertItem = item.href === '/alerts' || item.href === '/notifications';
            const isItemActive = isAlertItem
              ? location.pathname === '/alerts' || location.pathname === '/notifications'
              : location.pathname.startsWith(item.href);

            const navLinkElement = (
              <NavLink
                to={item.href}
                onClick={onNavigate}
                className={cn(
                  'group flex items-center rounded-[6px] text-xs transition-all duration-150',
                  isCollapsed ? 'justify-center p-2.5 w-full' : 'justify-between px-3 py-2',
                  isItemActive
                    ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset font-medium'
                    : 'text-[#1c1c1c] hover:bg-[rgba(28,28,28,0.04)] active:opacity-80'
                )}
              >
                <div className={cn('flex items-center min-w-0', isCollapsed ? 'justify-center' : 'gap-3')}>
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0 transition-colors',
                      isItemActive
                        ? 'text-[#fcfbf8]'
                        : 'text-[#5f5f5d] group-hover:text-[#1c1c1c]'
                    )}
                  />
                  {!isCollapsed && <span className="truncate">{item.title}</span>}
                </div>

                {isAlertItem && count > 0 && (
                  <span
                    className={cn(
                      'flex items-center justify-center font-bold transition-colors',
                      isCollapsed
                        ? 'absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-600'
                        : 'ml-auto h-5 min-w-5 rounded-full px-1.5 text-[10px]',
                      !isCollapsed && (isItemActive ? 'bg-[#fcfbf8] text-[#1c1c1c]' : 'bg-[#1c1c1c] text-[#fcfbf8]')
                    )}
                  >
                    {!isCollapsed && count}
                  </span>
                )}
              </NavLink>
            );

            if (isCollapsed) {
              return (
                <Tooltip key={item.href} content={item.title} side="right" className="z-50">
                  <div className="w-full">{navLinkElement}</div>
                </Tooltip>
              );
            }

            return <React.Fragment key={item.href}>{navLinkElement}</React.Fragment>;
          })}
        </nav>
      </div>

      {/* User footer profile summary */}
      {user && (
        <div className="border-t border-[#eceae4] p-2.5">
          <div
            className={cn(
              'flex items-center rounded-[6px] transition-colors hover:bg-[rgba(28,28,28,0.04)]',
              isCollapsed ? 'justify-center p-1.5 w-full' : 'gap-2.5 p-2'
            )}
          >
            <Avatar
              fallback={initials}
              className="h-7 w-7 text-xs font-semibold text-[#1c1c1c] bg-[#eceae4] border border-[#eceae4] shrink-0"
            />
            {!isCollapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-xs font-medium text-[#1c1c1c]">{user.name}</span>
                  <span className="truncate text-[10px] text-[#5f5f5d]">{user.email}</span>
                </div>
                <Badge
                  variant={isManager ? 'default' : 'secondary'}
                  className="text-[9px] px-1.5 py-0.2 shrink-0 uppercase font-semibold"
                >
                  {isManager ? 'Mgr' : 'Rep'}
                </Badge>
              </>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
