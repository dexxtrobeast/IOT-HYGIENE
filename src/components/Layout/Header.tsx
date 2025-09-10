import React, { useState } from 'react';
import { User, LogOut, Settings, Sun, Moon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

interface HeaderProps {
  title: string;
}

const Header: React.FC<HeaderProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleThemeToggle = () => {
    if (!isAnimating) {
      setIsAnimating(true);
      setTimeout(() => {
        toggleTheme();
        setTimeout(() => setIsAnimating(false), 150);
      }, 150);
    }
  };

  return (
    <header className="bg-white dark:bg-black shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h1>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
              <User size={16} />
              <span>{user?.username}</span>
              <span className={`px-2 py-1 rounded-full text-xs ${
                user?.role === 'admin' 
                  ? 'bg-blue-100 dark:bg-black text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700' 
                  : 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
              }`}>
                {user?.role}
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleThemeToggle}
                className="p-2 text-gray-400 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-100 transition-colors relative overflow-hidden"
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                disabled={isAnimating}
              >
                <div className={`transition-all duration-300 ease-in-out ${
                  isAnimating ? 'rotate-180 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'
                }`}>
                  {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                </div>
                <div className={`absolute inset-0 flex items-center justify-center transition-all duration-300 ease-in-out ${
                  isAnimating ? 'rotate-0 scale-100 opacity-100' : 'rotate-180 scale-0 opacity-0'
                }`}>
                  {theme === 'light' ? <Sun size={18} /> : <Moon size={18} />}
                </div>
              </button>
              <button 
                onClick={logout}
                className="p-2 text-gray-400 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;