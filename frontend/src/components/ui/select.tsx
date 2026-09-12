import * as React from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface SelectProps {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (e: { target: { value: string; name?: string; id?: string } }) => void;
  options?: SelectOption[];
  children?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  (
    {
      id,
      name,
      value: controlledValue,
      defaultValue = '',
      onChange,
      options,
      children,
      placeholder = 'Select...',
      disabled = false,
      required = false,
      className,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const isControlled = controlledValue !== undefined;
    const currentValue = isControlled ? controlledValue : uncontrolledValue;

    // Parse options from either `options` prop or `<option>` children
    const parsedOptions = React.useMemo<SelectOption[]>(() => {
      if (options && options.length > 0) return options;

      const items: SelectOption[] = [];
      React.Children.forEach(children, (child) => {
        if (React.isValidElement(child)) {
          const element = child as React.ReactElement<any>;
          items.push({
            value: String(element.props?.value ?? ''),
            label: element.props?.children ?? String(element.props?.value ?? ''),
            disabled: Boolean(element.props?.disabled),
          });
        }
      });
      return items;
    }, [options, children]);

    // Handle outside clicks to close the dropdown
    React.useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // Handle escape key
    React.useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const handleSelect = (val: string) => {
      if (!isControlled) {
        setUncontrolledValue(val);
      }
      onChange?.({
        target: {
          value: val,
          name,
          id,
        },
      });
      setIsOpen(false);
    };

    const selectedOption = parsedOptions.find((opt) => opt.value === currentValue);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
      <div ref={containerRef} className="relative inline-block w-full text-left">
        {/* Hidden input for form data and required validation */}
        <input
          type="hidden"
          name={name}
          id={id}
          value={currentValue}
          required={required}
        />

        {/* Custom styled trigger button */}
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setIsOpen((prev) => !prev)}
          className={cn(
            'flex h-9 w-full items-center justify-between rounded-[6px] border border-[#eceae4] bg-[#fcfbf8] px-3 py-1.5 text-xs text-[#1c1c1c] shadow-2xs transition-all duration-150 cursor-pointer outline-none focus:outline-none focus:ring-0',
            'hover:border-[rgba(28,28,28,0.4)]',
            isOpen && 'border-[rgba(28,28,28,0.4)] shadow-focus-soft',
            disabled && 'cursor-not-allowed opacity-50 bg-[#eceae4]/30',
            className
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className={cn('truncate', !selectedOption && 'text-[#5f5f5d]/70')}>
            {displayLabel}
          </span>
          <FiChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 text-[#5f5f5d] transition-transform duration-200 ml-2',
              isOpen && 'rotate-180 text-[#1c1c1c]'
            )}
          />
        </button>

        {/* Themed Dropdown Menu */}
        {isOpen && (
          <div
            role="listbox"
            className="absolute left-0 top-full mt-1.5 w-full min-w-[140px] max-h-60 overflow-y-auto rounded-[8px] border border-[#eceae4] bg-[#fcfbf8] p-1 shadow-focus-soft z-50 animate-in fade-in-50 zoom-in-98 duration-100"
          >
            {parsedOptions.map((opt) => {
              const isSelected = opt.value === currentValue;
              return (
                <button
                  key={opt.value}
                  type="button"
                  disabled={opt.disabled}
                  onClick={() => !opt.disabled && handleSelect(opt.value)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-[5px] px-2.5 py-1.5 text-xs text-left cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-[#eceae4] font-medium text-[#1c1c1c]'
                      : 'text-[#1c1c1c] hover:bg-[#eceae4]/60',
                    opt.disabled && 'opacity-40 cursor-not-allowed hover:bg-transparent'
                  )}
                  role="option"
                  aria-selected={isSelected}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <FiCheck className="h-3.5 w-3.5 text-[#1c1c1c] shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
