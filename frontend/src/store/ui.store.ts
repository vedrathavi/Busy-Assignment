import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  // Bulk selection on deals
  selectedDealIds: string[];
  toggleDealSelection: (id: string) => void;
  selectAllDeals: (ids: string[]) => void;
  clearDealSelection: () => void;

  // Dialog and drawer visibility
  isCreateDealOpen: boolean;
  setCreateDealOpen: (open: boolean) => void;
  isCreateCompanyOpen: boolean;
  setCreateCompanyOpen: (open: boolean) => void;

  // Global layout
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      selectedDealIds: [],
      toggleDealSelection: (id) =>
        set((state) => ({
          selectedDealIds: state.selectedDealIds.includes(id)
            ? state.selectedDealIds.filter((dealId) => dealId !== id)
            : [...state.selectedDealIds, id],
        })),
      selectAllDeals: (ids) => set({ selectedDealIds: ids }),
      clearDealSelection: () => set({ selectedDealIds: [] }),

      isCreateDealOpen: false,
      setCreateDealOpen: (open) => set({ isCreateDealOpen: open }),
      isCreateCompanyOpen: false,
      setCreateCompanyOpen: (open) => set({ isCreateCompanyOpen: open }),

      isSidebarCollapsed: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
    }),
    {
      name: 'busy-crm-ui-storage',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);
