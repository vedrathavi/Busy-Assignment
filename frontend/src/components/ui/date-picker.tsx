import * as React from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { cn, formatDate } from '@/lib/utils';

export interface DatePickerProps {
  id?: string;
  name?: string;
  value?: string; // Format: YYYY-MM-DD
  defaultValue?: string;
  onChange?: (dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(
  (
    {
      id,
      name,
      value: controlledValue,
      defaultValue = '',
      onChange,
      placeholder = 'Select date...',
      disabled = false,
      required = false,
      className,
      minDate,
      maxDate,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined;
    const selectedDateStr = isControlled ? (controlledValue || '') : uncontrolledValue;

    // View state for calendar (current displayed year & month)
    const initialDate = selectedDateStr ? new Date(selectedDateStr + 'T00:00:00') : new Date();
    const [viewYear, setViewYear] = React.useState(
      isNaN(initialDate.getFullYear()) ? new Date().getFullYear() : initialDate.getFullYear()
    );
    const [viewMonth, setViewMonth] = React.useState(
      isNaN(initialDate.getMonth()) ? new Date().getMonth() : initialDate.getMonth()
    );

    // Sync view month/year when selectedDate changes or modal opens
    React.useEffect(() => {
      if (selectedDateStr) {
        const d = new Date(selectedDateStr + 'T00:00:00');
        if (!isNaN(d.getTime())) {
          setViewYear(d.getFullYear());
          setViewMonth(d.getMonth());
        }
      }
    }, [selectedDateStr, isOpen]);

    // Close on outside click
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Close on escape
    React.useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handlePrevMonth = () => {
      if (viewMonth === 0) {
        setViewMonth(11);
        setViewYear((y) => y - 1);
      } else {
        setViewMonth((m) => m - 1);
      }
    };

    const handleNextMonth = () => {
      if (viewMonth === 11) {
        setViewMonth(0);
        setViewYear((y) => y + 1);
      } else {
        setViewMonth((m) => m + 1);
      }
    };

    const handleSelectDay = (year: number, month: number, day: number) => {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateStr = `${year}-${monthStr}-${dayStr}`;

      if (!isControlled) {
        setUncontrolledValue(dateStr);
      }
      onChange?.(dateStr);
      setIsOpen(false);
    };

    const handleSelectToday = () => {
      const today = new Date();
      handleSelectDay(today.getFullYear(), today.getMonth(), today.getDate());
    };

    const handleClear = () => {
      if (!isControlled) {
        setUncontrolledValue('');
      }
      onChange?.('');
      setIsOpen(false);
    };

    // Calculate calendar grid days
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
    const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

    const todayObj = new Date();
    const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

    // Format display string
    const displayLabel = selectedDateStr ? formatDate(selectedDateStr) : placeholder;

    return (
      <div ref={containerRef} className="relative inline-block w-full text-left">
        {/* Hidden input for form submission */}
        <input
          type="hidden"
          id={id}
          name={name}
          value={selectedDateStr}
          required={required}
        />

        {/* Trigger Button */}
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={cn(
            'flex h-8 w-full items-center justify-between rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-3 py-1.5 text-xs text-[#1c1c1c] shadow-2xs transition-all duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0',
            'hover:border-[rgba(28,28,28,0.4)]',
            isOpen && 'border-[rgba(28,28,28,0.4)] shadow-focus-soft',
            disabled && 'cursor-not-allowed opacity-50 bg-[#eceae4]/30',
            className
          )}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
        >
          <span className={cn('truncate', !selectedDateStr && 'text-[#5f5f5d]/70')}>
            {displayLabel}
          </span>
          <FiCalendar className="h-3.5 w-3.5 shrink-0 text-[#5f5f5d] ml-2" />
        </button>

        {/* Themed Calendar Popover */}
        {isOpen && (
          <div
            className="absolute left-0 top-full mt-1.5 z-50 w-[260px] rounded-[10px] border border-[#eceae4] bg-[#fcfbf8] p-3 shadow-focus-soft animate-in fade-in-50 zoom-in-98 duration-100"
            role="dialog"
            aria-label="Calendar Date Picker"
          >
            {/* Header: Month / Year Navigation */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#eceae4]">
              <span className="text-xs font-bold text-[#1c1c1c]">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous month"
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c] transition-colors cursor-pointer"
                >
                  <FiChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next month"
                  className="flex h-6 w-6 items-center justify-center rounded-[4px] text-[#5f5f5d] hover:bg-[#eceae4] hover:text-[#1c1c1c] transition-colors cursor-pointer"
                >
                  <FiChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Weekday Labels */}
            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DAY_NAMES.map((day) => (
                <div key={day} className="text-[10px] font-semibold text-[#8e8d8a]">
                  {day}
                </div>
              ))}
            </div>

            {/* Day Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Previous month filler days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => {
                const dayNum = daysInPrevMonth - firstDayOfWeek + i + 1;
                return (
                  <div
                    key={`prev-${i}`}
                    className="flex h-7 w-7 items-center justify-center text-[11px] text-[#8e8d8a]/40 mx-auto"
                  >
                    {dayNum}
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const monthStr = String(viewMonth + 1).padStart(2, '0');
                const dayStr = String(dayNum).padStart(2, '0');
                const curDateStr = `${viewYear}-${monthStr}-${dayStr}`;

                const isSelected = curDateStr === selectedDateStr;
                const isToday = curDateStr === todayStr;

                let isDisabled = false;
                if (minDate && curDateStr < minDate) isDisabled = true;
                if (maxDate && curDateStr > maxDate) isDisabled = true;

                return (
                  <button
                    key={dayNum}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => !isDisabled && handleSelectDay(viewYear, viewMonth, dayNum)}
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-all cursor-pointer mx-auto font-medium',
                      isSelected
                        ? 'bg-[#1c1c1c] text-[#fcfbf8] shadow-button-inset font-bold'
                        : isToday
                        ? 'border border-[#1c1c1c]/40 text-[#1c1c1c] hover:bg-[#eceae4]'
                        : 'text-[#1c1c1c] hover:bg-[#eceae4]',
                      isDisabled && 'opacity-30 cursor-not-allowed hover:bg-transparent'
                    )}
                  >
                    {dayNum}
                  </button>
                );
              })}
            </div>

            {/* Footer Quick Actions */}
            <div className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-[#eceae4] text-[11px]">
              {!required ? (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[#8e8d8a] hover:text-[#1c1c1c] font-medium transition-colors cursor-pointer"
                >
                  Clear
                </button>
              ) : (
                <div />
              )}
              <button
                type="button"
                onClick={handleSelectToday}
                className="text-[#1c1c1c] font-semibold hover:underline transition-all cursor-pointer"
              >
                Today
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';
