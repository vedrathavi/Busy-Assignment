import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { TaskListQuery } from './tasks.types';

interface TaskFiltersProps {
  filters: TaskListQuery;
  onChange: (filters: TaskListQuery) => void;
}

export function TaskFilters({ filters, onChange }: TaskFiltersProps) {
  const currentStatus = filters.status || 'all';
  const currentTime = filters.time || 'all';
  const currentPriority = filters.priority || 'all';

  const updateFilter = (key: keyof TaskListQuery, val: any) => {
    onChange({
      ...filters,
      [key]: val,
      page: 1, // reset pagination on filter change
    });
  };

  const priorityFilterOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' },
  ];

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#eceae4]">
      {/* Left: Status Filter (All / Open / Completed) */}
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-[#eceae4] bg-[#f7f4ed] p-0.5">
          <button
            type="button"
            onClick={() => updateFilter('status', 'all')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer',
              currentStatus === 'all'
                ? 'bg-white text-[#1c1c1c] shadow-2xs font-semibold'
                : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => updateFilter('status', 'open')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer',
              currentStatus === 'open'
                ? 'bg-white text-[#1c1c1c] shadow-2xs font-semibold'
                : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
            )}
          >
            Open
          </button>
          <button
            type="button"
            onClick={() => updateFilter('status', 'completed')}
            className={cn(
              'rounded-md px-3 py-1 text-xs font-medium transition-all cursor-pointer',
              currentStatus === 'completed'
                ? 'bg-white text-[#1c1c1c] shadow-2xs font-semibold'
                : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
            )}
          >
            Completed
          </button>
        </div>
      </div>

      {/* Right: Time & Priority Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Time Pills */}
        <div className="inline-flex rounded-lg border border-[#eceae4] bg-[#f7f4ed] p-0.5">
          {(['all', 'today', 'upcoming', 'overdue'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => updateFilter('time', t)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-all cursor-pointer',
                currentTime === t
                  ? 'bg-white text-[#1c1c1c] shadow-2xs font-semibold'
                  : 'text-[#5f5f5d] hover:text-[#1c1c1c]'
              )}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Priority Dropdown */}
        <div className="w-36">
          <Select
            value={currentPriority}
            onChange={(e) => updateFilter('priority', e.target.value)}
            options={priorityFilterOptions}
            className="h-8 text-xs bg-white"
          />
        </div>
      </div>
    </div>
  );
}
