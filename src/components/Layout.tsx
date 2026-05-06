import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, PackageOpen, Settings, LogOut } from 'lucide-react';
import { auth } from '../lib/firebase';
import { useAuth } from './AuthProvider';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { profile } = useAuth();

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Stock', roles: ['admin', 'orderer', 'vendor', 'storeManager', 'accounts', 'endUser'] },
    { to: '/orders', icon: ShoppingCart, label: 'Ledger', roles: ['admin', 'orderer', 'accounts', 'endUser'] },
    { to: '/receive', icon: PackageOpen, label: 'Inventory', roles: ['admin', 'storeManager', 'vendor'] },
    { to: '/settings', icon: Settings, label: 'Access', roles: ['admin', 'orderer', 'vendor', 'storeManager', 'accounts', 'endUser'] },
  ];

  const visibleNavItems = navItems.filter(item => 
    !profile?.role || item.roles.includes(profile.role)
  );

  return (
    <div className="min-h-screen bg-natural-bg flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-natural-accent sticky top-0 z-30 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-natural-dark">MatFlow</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-black text-natural-muted bg-natural-accent/50 px-2.5 py-1 rounded-full uppercase tracking-widest">
            {profile?.role?.replace(/([A-Z])/g, ' $1') || 'endUser'}
          </span>
          <button 
            onClick={() => auth.signOut()}
            className="text-natural-muted hover:text-natural-dark transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24 md:pb-6 max-w-lg mx-auto w-full p-6">
        <Outlet />
      </main>

      {/* Bottom Navigation (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-natural-dark text-white px-8 py-4 flex items-center justify-between z-40 sm:max-w-md sm:mx-auto sm:mb-4 sm:rounded-3xl shadow-2xl">
        {visibleNavItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1.5 transition-all duration-300",
                isActive ? "text-white scale-110" : "text-white/50 hover:text-white/80"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                <span className={cn(
                  "text-[9px] font-black uppercase tracking-[0.1em]",
                  isActive ? "opacity-100" : "opacity-0"
                )}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
};
