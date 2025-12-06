import React from 'react';
import { LayoutDashboard, FileUp, Settings, Activity, LogOut } from 'lucide-react';
import { User } from '../types';

interface NavbarProps {
  currentView: string;
  setView: (view: string) => void;
  user: User | null;
  onLogout: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ currentView, setView, user, onLogout }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'upload', label: 'New Dataset', icon: FileUp },
    { id: 'runs', label: 'Run History', icon: Activity },
  ];

  return (
    <nav className="fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50 shadow-xl">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          AutoCleanML
        </h1>
        <p className="text-xs text-slate-400 mt-1">Data Pipeline & Engineering</p>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium text-sm">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        {user ? (
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 truncate">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold shrink-0 shadow-lg border border-white/10">
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="text-sm overflow-hidden">
                        <p className="font-medium text-white truncate w-24">{user.name}</p>
                        <p className="text-xs text-slate-500 truncate w-24">{user.email}</p>
                    </div>
                </div>
                <button 
                    onClick={onLogout}
                    className="text-slate-500 hover:text-red-400 transition-colors p-1"
                    title="Logout"
                >
                    <LogOut size={16} />
                </button>
            </div>
        ) : (
            <div className="text-xs text-slate-500 text-center">Guest Mode</div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;