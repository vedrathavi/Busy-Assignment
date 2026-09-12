import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiCheck } from 'react-icons/fi';
import { useUsers } from '@/features/users/useUsers';
import { UserSummary, UserRole } from '@/features/users/users.api';
import { cn } from '@/lib/utils';

export interface UserSelectorProps {
  value?: string;
  onChange: (userId: string, user?: UserSummary) => void;
  allowedRoles?: UserRole[];
  excludeUserIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function UserSelector({
  value,
  onChange,
  allowedRoles,
  excludeUserIds = [],
  placeholder = 'Select team member...',
  disabled = false,
  className,
  id,
}: UserSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: users = [], isLoading } = useUsers();

  // Filter available users based on allowedRoles and excludeUserIds
  const availableUsers = users.filter((u) => {
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(u.role)) {
      return false;
    }
    if (excludeUserIds.includes(u.id)) {
      return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  const selectedUser = users.find((u) => u.id === value);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus search input
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (user: UserSummary) => {
    onChange(user.id, user);
    setIsOpen(false);
    setSearch('');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  return (
    <div ref={containerRef} className={cn('relative w-full text-left', className)}>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={cn(
          'flex h-9 w-full items-center justify-between rounded-[8px] border border-[#eceae4] bg-[#fcfbf8] px-3 py-1.5 text-xs text-[#1c1c1c] shadow-xs transition-colors hover:border-[#1c1c1c]/20 outline-none focus:outline-none focus:ring-0 focus:border-[rgba(28,28,28,0.4)]',
          disabled && 'cursor-not-allowed opacity-50 bg-[#f4f2eb]',
          isOpen && 'border-[rgba(28,28,28,0.4)] shadow-focus-soft'
        )}
      >
        {selectedUser ? (
          <div className="flex items-center gap-2 truncate">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-[10px] font-medium text-white">
              {getInitials(selectedUser.name)}
            </span>
            <span className="font-medium text-[#1c1c1c] truncate">{selectedUser.name}</span>
            <span
              className={cn(
                'rounded-[4px] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider',
                selectedUser.role === 'MANAGER'
                  ? 'bg-amber-100 text-amber-800'
                  : 'bg-emerald-100 text-emerald-800'
              )}
            >
              {selectedUser.role === 'MANAGER' ? 'Manager' : 'Rep'}
            </span>
          </div>
        ) : (
          <span className="text-[#8e8d8a]">{placeholder}</span>
        )}
        <FiChevronDown className={cn('h-3.5 w-3.5 text-[#5f5f5d] transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-[8px] border border-[#eceae4] bg-[#fcfbf8] shadow-focus-soft animate-in fade-in-0 zoom-in-95">
          <div className="border-b border-[#eceae4] p-2">
            <div className="flex items-center gap-2 rounded-[6px] border border-[#eceae4] bg-white px-2 py-1">
              <FiSearch className="h-3.5 w-3.5 text-[#8e8d8a] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team member..."
                className="w-full bg-transparent text-xs text-[#1c1c1c] placeholder:text-[#8e8d8a] outline-none focus:outline-none focus:ring-0"
              />
            </div>
          </div>

          <div className="max-h-44 overflow-y-auto p-1">
            {isLoading ? (
              <div className="p-3 text-center text-xs text-[#8e8d8a]">Loading team members...</div>
            ) : availableUsers.length === 0 ? (
              <div className="p-3 text-center text-xs text-[#8e8d8a]">
                {search ? 'No matching team members found' : 'No available team members'}
              </div>
            ) : (
              availableUsers.map((user) => {
                const isSelected = user.id === value;
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleSelect(user)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[6px] px-2.5 py-1.5 text-xs transition-colors hover:bg-[#f4f2eb]',
                      isSelected && 'bg-[#f4f2eb] font-medium'
                    )}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c]/10 text-[10px] font-semibold text-[#1c1c1c]">
                        {getInitials(user.name)}
                      </span>
                      <div className="flex flex-col text-left truncate">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[#1c1c1c]">{user.name}</span>
                          <span
                            className={cn(
                              'rounded-[3px] px-1 py-0.2 text-[8px] font-semibold uppercase',
                              user.role === 'MANAGER'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            )}
                          >
                            {user.role === 'MANAGER' ? 'Manager' : 'Rep'}
                          </span>
                        </div>
                        <span className="text-[10px] text-[#8e8d8a] truncate">{user.email}</span>
                      </div>
                    </div>
                    {isSelected && <FiCheck className="h-4 w-4 text-[#1c1c1c] shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
