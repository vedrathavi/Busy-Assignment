import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiMail, FiCalendar, FiArrowRight, FiShield, FiBriefcase } from 'react-icons/fi';
import { useUsers } from '@/features/users/useUsers';
import { UserRole } from '@/features/users/users.api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { TableSkeleton } from '@/components/common/SkeletonLoader';
import { EmptyState } from '@/components/common/EmptyState';
import { formatDate } from '@/lib/utils';
import {
  PageHeader,
  PageHeaderHeading,
  PageHeaderTitle,
  PageHeaderDescription,
} from '@/components/ui/page-header';

export function UsersPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState<'ALL' | UserRole>('ALL');

  const { data: users = [], isLoading, isError, error, refetch } = useUsers();

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (selectedRole !== 'ALL' && u.role !== selectedRole) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, selectedRole, search]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader>
        <PageHeaderHeading>
          <PageHeaderTitle>Team Directory</PageHeaderTitle>
          <PageHeaderDescription>
            Authoritative directory of organization team members, roles, and deal ownership.
          </PageHeaderDescription>
        </PageHeaderHeading>
      </PageHeader>

      {/* Filter Bar */}
      <Card className="border-[#eceae4] bg-[#fcfbf8] shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8e8d8a]" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search team members by name or email..."
                className="pl-9 h-9 text-xs bg-white border-[#eceae4] focus-visible:border-[rgba(28,28,28,0.4)] focus-visible:ring-0 focus:ring-0 focus:outline-none focus-visible:outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 w-full sm:w-auto">
              {(['ALL', 'MANAGER', 'SALES_REP'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setSelectedRole(role)}
                  className={`px-3 py-1.5 rounded-[6px] text-xs font-medium transition-colors ${
                    selectedRole === role
                      ? 'bg-[#1c1c1c] text-white shadow-xs'
                      : 'bg-[#f4f2eb] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c]'
                  }`}
                >
                  {role === 'ALL' ? 'All Roles' : role === 'MANAGER' ? 'Managers' : 'Sales Reps'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <TableSkeleton rows={4} columns={4} />
      ) : isError ? (
        <EmptyState
          title="Failed to load team members"
          description={error?.message || 'An error occurred while fetching the team directory.'}
          actionLabel="Try Again"
          onAction={() => refetch()}
        />
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          title="No team members found"
          description={search ? 'Try adjusting your search query or role filter.' : 'No users available in your organization.'}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map((user) => {
            const isManager = user.role === 'MANAGER';
            return (
              <Card
                key={user.id}
                onClick={() => navigate(`/users/${user.id}`)}
                className="border-[#eceae4] bg-[#fcfbf8] shadow-xs hover:border-[#1c1c1c]/30 hover:shadow-sm cursor-pointer transition-all duration-150 group"
              >
                <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#1c1c1c] text-sm font-semibold text-white group-hover:scale-105 transition-transform">
                        {getInitials(user.name)}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-[#1c1c1c] group-hover:text-black">
                          {user.name}
                        </h3>
                        <p className="text-xs text-[#5f5f5d] flex items-center gap-1 mt-0.5">
                          <FiMail className="h-3 w-3" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className={`text-[10px] uppercase tracking-wider font-semibold ${
                        isManager
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isManager ? (
                        <span className="flex items-center gap-1">
                          <FiShield className="h-2.5 w-2.5" /> Manager
                        </span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <FiBriefcase className="h-2.5 w-2.5" /> Sales Rep
                        </span>
                      )}
                    </Badge>
                  </div>

                  <div className="pt-3 border-t border-[#eceae4] flex items-center justify-between text-[11px] text-[#8e8d8a]">
                    <div className="flex items-center gap-1">
                      <FiCalendar className="h-3 w-3" />
                      <span>Joined {formatDate(user.createdAt)}</span>
                    </div>
                    <span className="flex items-center gap-1 font-medium text-[#1c1c1c] group-hover:translate-x-0.5 transition-transform">
                      View Profile <FiArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
