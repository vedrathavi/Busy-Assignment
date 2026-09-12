import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch,
  FiBriefcase,
  FiGlobe,
  FiGrid,
  FiBell,
  FiArrowRight,
  FiLoader,
  FiX,
} from 'react-icons/fi';
import { useQuery } from '@tanstack/react-query';
import { getDealsApi } from '@/features/deals/deals.api';
import { getCompaniesApi } from '@/features/companies/companies.api';
import { formatCurrency } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/features/auth/AuthContext';

interface NavAction {
  id: string;
  type: 'nav';
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

export function NavbarSearch() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global keyboard shortcut: ⌘K or Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Quick navigation static actions
  const navActions: NavAction[] = [
    {
      id: 'nav-dashboard',
      type: 'nav',
      title: 'Go to Dashboard',
      subtitle: 'Overview metrics, win trends, and stage breakdown',
      icon: FiGrid,
      path: '/dashboard',
    },
    {
      id: 'nav-deals',
      type: 'nav',
      title: 'Go to Deals Pipeline',
      subtitle: 'Browse, filter, and track all CRM deals',
      icon: FiBriefcase,
      path: '/deals',
    },
    {
      id: 'nav-companies',
      type: 'nav',
      title: 'Go to Companies Directory',
      subtitle: 'Manage client accounts and organizations',
      icon: FiGlobe,
      path: '/companies',
    },
    {
      id: 'nav-alerts',
      type: 'nav',
      title: 'Go to Overdue Alerts',
      subtitle: 'Review deals needing immediate attention',
      icon: FiBell,
      path: '/alerts',
    },
  ];

  // Queries for live deals and companies search
  const isSearching = debouncedQuery.length > 0;

  const { data: dealsData, isLoading: isDealsLoading } = useQuery({
    queryKey: ['global-search', 'deals', user?.id, debouncedQuery],
    queryFn: () => getDealsApi({ search: debouncedQuery, limit: 5 }),
    enabled: isOpen && isSearching && Boolean(user?.id),
    staleTime: 10 * 1000,
  });

  const { data: companiesData, isLoading: isCompaniesLoading } = useQuery({
    queryKey: ['global-search', 'companies', user?.id, debouncedQuery],
    queryFn: () => getCompaniesApi({ search: debouncedQuery, limit: 5 }),
    enabled: isOpen && isSearching && Boolean(user?.id),
    staleTime: 10 * 1000,
  });

  const deals = dealsData?.deals || [];
  const companies = companiesData?.companies || [];
  const isLoading = isDealsLoading || isCompaniesLoading;

  // Flattened searchable items for arrow-key selection
  const flatItems = isSearching
    ? [
        ...deals.map((d) => ({ type: 'deal' as const, data: d })),
        ...companies.map((c) => ({ type: 'company' as const, data: c })),
      ]
    : navActions.map((a) => ({ type: 'nav' as const, data: a }));

  const handleSelect = useCallback(
    (index: number) => {
      const item = flatItems[index];
      if (!item) return;

      if (item.type === 'nav') {
        navigate((item.data as NavAction).path);
      } else if (item.type === 'deal') {
        navigate(`/deals/${(item.data as any).id}`);
      } else if (item.type === 'company') {
        navigate(`/companies/${(item.data as any).id}`);
      }
      setIsOpen(false);
      inputRef.current?.blur();
    },
    [flatItems, navigate]
  );

  // Keyboard navigation within the dropdown
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatItems.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, flatItems.length - 1)));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0) {
        handleSelect(selectedIndex);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  const clearInput = () => {
    setQuery('');
    setDebouncedQuery('');
    setSelectedIndex(0);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-sm sm:max-w-md">
      {/* Interactive Search Input Box in Header */}
      <div
        className={`flex h-9 w-full items-center gap-2 rounded-[6px] border px-3 text-xs transition-all ${
          isOpen
            ? 'border-[rgba(28,28,28,0.4)] bg-[#fcfbf8] shadow-focus-soft'
            : 'border-[#eceae4] bg-[#fcfbf8] hover:border-[rgba(28,28,28,0.4)]'
        }`}
      >
        <FiSearch className="h-3.5 w-3.5 shrink-0 text-[#5f5f5d]" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(0);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search deals, companies, navigate..."
          className="flex-1 bg-transparent text-xs font-normal text-[#1c1c1c] placeholder:text-[#5f5f5d]/70 outline-none focus:outline-none focus:ring-0"
          aria-label="Search deals, companies, or commands"
        />

        {isLoading && <FiLoader className="h-3.5 w-3.5 shrink-0 animate-spin text-[#5f5f5d]" />}

        {query && !isLoading && (
          <button
            type="button"
            onClick={clearInput}
            className="rounded-[4px] p-0.5 text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]"
            aria-label="Clear search"
          >
            <FiX className="h-3.5 w-3.5" />
          </button>
        )}

        <kbd className="pointer-events-none hidden rounded-[4px] bg-[#eceae4] px-1.5 py-0.5 text-[0.625rem] font-medium text-[#1c1c1c] sm:inline-block">
          ⌘K
        </kbd>
      </div>

      {/* Dropdown Menu attached directly below search bar */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full min-w-[320px] sm:min-w-[420px] rounded-[10px] border border-[#eceae4] bg-[#fcfbf8] shadow-focus-soft z-50 overflow-hidden animate-in fade-in-50 zoom-in-98 duration-100">
          <div className="max-h-[65vh] overflow-y-auto p-1.5">
            {!isSearching ? (
              /* Quick Navigation Section */
              <div>
                <div className="px-2.5 py-1 text-[0.6875rem] font-medium tracking-wider uppercase text-[#5f5f5d]">
                  Quick Navigation
                </div>
                <div className="space-y-0.5">
                  {navActions.map((action, idx) => {
                    const Icon = action.icon;
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleSelect(idx)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-[#eceae4] text-[#1c1c1c]'
                            : 'text-[#1c1c1c] hover:bg-[#eceae4]/50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#eceae4]/80 text-[#1c1c1c]">
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-[#1c1c1c]">{action.title}</p>
                            <p className="text-[0.6875rem] text-[#5f5f5d]">{action.subtitle}</p>
                          </div>
                        </div>
                        <FiArrowRight className="h-3.5 w-3.5 text-[#5f5f5d] opacity-50" />
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : isSearching && flatItems.length === 0 && !isLoading ? (
              /* Empty State */
              <div className="py-8 text-center">
                <FiSearch className="mx-auto h-6 w-6 text-[#5f5f5d]/50" />
                <p className="mt-2 text-xs font-medium text-[#1c1c1c]">No results found</p>
                <p className="text-[0.6875rem] text-[#5f5f5d]">
                  No deals or companies match &ldquo;{debouncedQuery}&rdquo;
                </p>
              </div>
            ) : (
              /* Search Results */
              <div className="space-y-3">
                {/* Deals Matches */}
                {deals.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between px-2.5 py-1 text-[0.6875rem] font-medium tracking-wider uppercase text-[#5f5f5d]">
                      <span>Deals ({deals.length})</span>
                      <span className="text-[0.625rem] text-[#5f5f5d]">Press Enter to open</span>
                    </div>
                    <div className="space-y-0.5">
                      {deals.map((deal, idx) => {
                        const isSelected = selectedIndex === idx;
                        return (
                          <button
                            key={deal.id}
                            type="button"
                            onClick={() => handleSelect(idx)}
                            onMouseEnter={() => setSelectedIndex(idx)}
                            className={`flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#eceae4] text-[#1c1c1c]'
                                : 'text-[#1c1c1c] hover:bg-[#eceae4]/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#1c1c1c] text-[#fcfbf8]">
                                <FiBriefcase className="h-3.5 w-3.5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-medium text-[#1c1c1c] truncate">{deal.title}</p>
                                <p className="text-[0.6875rem] text-[#5f5f5d] truncate">
                                  {deal.company?.name || 'No Company'} • {formatCurrency(deal.value)}
                                </p>
                              </div>
                            </div>
                            <Badge variant="outline" className="text-[0.625rem] shrink-0 border-[#eceae4]">
                              {deal.stage}
                            </Badge>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Companies Matches */}
                {companies.length > 0 && (
                  <div>
                    <div className="px-2.5 py-1 text-[0.6875rem] font-medium tracking-wider uppercase text-[#5f5f5d]">
                      Companies ({companies.length})
                    </div>
                    <div className="space-y-0.5">
                      {companies.map((company, idx) => {
                        const globalIdx = deals.length + idx;
                        const isSelected = selectedIndex === globalIdx;
                        return (
                          <button
                            key={company.id}
                            type="button"
                            onClick={() => handleSelect(globalIdx)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex w-full items-center justify-between rounded-[6px] px-2.5 py-2 text-left transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-[#eceae4] text-[#1c1c1c]'
                                : 'text-[#1c1c1c] hover:bg-[#eceae4]/50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px] bg-[#eceae4] text-[#1c1c1c]">
                                <FiGlobe className="h-3.5 w-3.5" />
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-medium text-[#1c1c1c] truncate">{company.name}</p>
                                <p className="text-[0.6875rem] text-[#5f5f5d] truncate">{company.industry}</p>
                              </div>
                            </div>
                            <FiArrowRight className="h-3.5 w-3.5 text-[#5f5f5d] opacity-50" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
