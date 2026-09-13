import { ComponentType } from 'react';
import {
  FiPlusCircle,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiCheckCircle,
  FiXCircle,
  FiRefreshCw,
  FiMessageSquare,
  FiUserPlus,
  FiUserMinus,
  FiUserCheck,
  FiBell,
  FiAlertCircle,
} from 'react-icons/fi';
import { ActivityNotificationType } from './notifications.types';

export interface NotificationVisualConfig {
  icon: ComponentType<{ className?: string }>;
  label: string;
  iconColor: string;
  iconBg: string;
  iconBorder: string;
}

/**
 * Visual language mapping for deal activity notifications.
 * Restrained, professional accents that don't overpower the layout.
 */
export const NOTIFICATION_VISUAL_MAP: Record<ActivityNotificationType, NotificationVisualConfig> = {
  DEAL_OVERDUE: {
    icon: FiAlertCircle,
    label: 'Deal Overdue',
    iconColor: 'text-rose-700',
    iconBg: 'bg-rose-50',
    iconBorder: 'border-rose-200/70',
  },
  DEAL_CREATED: {
    icon: FiPlusCircle,
    label: 'Deal Created',
    iconColor: 'text-stone-700',
    iconBg: 'bg-stone-100',
    iconBorder: 'border-stone-200',
  },
  DEAL_STAGE_ADVANCED: {
    icon: FiArrowUpRight,
    label: 'Stage Advanced',
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    iconBorder: 'border-blue-200/70',
  },
  DEAL_STAGE_REGRESSED: {
    icon: FiArrowDownLeft,
    label: 'Stage Regressed',
    iconColor: 'text-slate-600',
    iconBg: 'bg-slate-100',
    iconBorder: 'border-slate-200/70',
  },
  DEAL_WON: {
    icon: FiCheckCircle,
    label: 'Deal Won',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-50',
    iconBorder: 'border-emerald-200/70',
  },
  DEAL_LOST: {
    icon: FiXCircle,
    label: 'Deal Lost',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-50',
    iconBorder: 'border-rose-200/70',
  },
  DEAL_REOPENED: {
    icon: FiRefreshCw,
    label: 'Deal Reopened',
    iconColor: 'text-teal-600',
    iconBg: 'bg-teal-50',
    iconBorder: 'border-teal-200/70',
  },
  NOTE_ADDED: {
    icon: FiMessageSquare,
    label: 'Note Added',
    iconColor: 'text-amber-700',
    iconBg: 'bg-amber-50',
    iconBorder: 'border-amber-200/70',
  },
  COLLABORATOR_ADDED: {
    icon: FiUserPlus,
    label: 'Collaborator Added',
    iconColor: 'text-violet-600',
    iconBg: 'bg-violet-50',
    iconBorder: 'border-violet-200/70',
  },
  COLLABORATOR_REMOVED: {
    icon: FiUserMinus,
    label: 'Collaborator Removed',
    iconColor: 'text-stone-500',
    iconBg: 'bg-stone-100',
    iconBorder: 'border-stone-200',
  },
  OWNER_CHANGED: {
    icon: FiUserCheck,
    label: 'Owner Changed',
    iconColor: 'text-teal-700',
    iconBg: 'bg-teal-50',
    iconBorder: 'border-teal-200/70',
  },
};

export function getNotificationVisual(type: ActivityNotificationType): NotificationVisualConfig {
  return NOTIFICATION_VISUAL_MAP[type] || {
    icon: FiBell,
    label: 'Activity',
    iconColor: 'text-stone-600',
    iconBg: 'bg-stone-100',
    iconBorder: 'border-stone-200',
  };
}
