import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const { isSidebarCollapsed } = useUIStore();

  return (
    <div className="flex min-h-screen w-full bg-[#f7f4ed] text-[#1c1c1c] antialiased font-sans">
      {/* Desktop & Tablet Sidebar */}
      <div
        className={cn(
          'hidden lg:flex lg:flex-col shrink-0 min-h-screen sticky top-0 h-screen z-40 transition-all duration-200',
          isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        )}
      >
        <Sidebar className="w-full h-full" />
      </div>

      {/* Mobile Nav Sheet Drawer */}
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />

      {/* Main Content Column */}
      <div className="flex flex-1 flex-col min-w-0 min-h-screen">
        <Header onMenuToggle={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
