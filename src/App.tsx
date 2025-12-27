import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useMatch } from 'react-router-dom';
import ChatPage from './pages/ChatPage';
import SkillsPage from './pages/SkillsPage';
import SkillsLibraryPage from './pages/SkillsLibraryPage';
import { MessageSquare, Library, Command, Settings, PanelLeftClose, PanelLeftOpen, GitPullRequest } from 'lucide-react';
import { ToastProvider } from './components/Toast';
import SessionList from './components/SessionList';

function Sidebar({ apiEndpoint }: { apiEndpoint: string }) {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const match = useMatch('/c/:sessionId');
  const currentSessionId = match?.params.sessionId;

  const navItems = [
    { path: '/', icon: MessageSquare, label: 'Chat' },
    { path: '/skills', icon: GitPullRequest, label: 'Pending Skills' },
    { path: '/library', icon: Library, label: 'Skills Library' },
  ];

  return (
    <aside 
      className={`
        relative h-full bg-[#FAF9F6] border-r border-stone-200/50 flex flex-col flex-shrink-0 z-50 transition-all duration-300 ease-in-out
        ${isCollapsed ? 'w-[72px]' : 'w-[260px]'}
      `}
    >
      {/* Header / Logo / Toggle */}
      <div className={`p-4 flex items-center justify-between mb-2`}>
        {/* Logo Section */}
        <div className={`flex items-center gap-3 text-[#1a1a1a] overflow-hidden whitespace-nowrap transition-opacity duration-200 ${isCollapsed ? 'opacity-0 w-0' : 'opacity-100'}`}>
            <div className="w-8 h-8 bg-transparent border border-stone-200 rounded-lg flex items-center justify-center text-[#1a1a1a] shrink-0">
              <Command size={16} strokeWidth={2} />
            </div>
            <span className="font-serif text-xl font-medium tracking-tight">Jarvis</span>
        </div>

        {/* Toggle Button (Icon Only) */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`
                flex items-center justify-center w-8 h-8 rounded-lg text-stone-400 hover:bg-stone-200/50 hover:text-stone-700 transition-all
                ${isCollapsed ? 'mx-auto' : ''}
            `}
            title={isCollapsed ? "Expand" : "Collapse"}
        >
            {isCollapsed ? <PanelLeftOpen size={18} strokeWidth={2} /> : <PanelLeftClose size={18} strokeWidth={2} />}
        </button>
      </div>

      {/* Navigation Links */}
      <nav className="flex-shrink-0 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              title={isCollapsed ? item.label : ''}
              className={`
                group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300
                ${isCollapsed ? 'justify-center' : ''}
                ${isActive 
                  ? 'bg-white text-[#1a1a1a] shadow-[0_2px_8px_rgba(0,0,0,0.04)] font-medium' 
                  : 'text-stone-500 hover:bg-stone-200/30 hover:text-stone-700'}
              `}
            >
              <Icon 
                size={20} 
                strokeWidth={2} 
                className={`transition-colors duration-300 shrink-0 ${isActive ? 'text-[#34A853]' : 'text-stone-400 group-hover:text-stone-600'}`} 
              />
              {!isCollapsed && (
                <>
                    <span className="text-[15px] font-sans overflow-hidden whitespace-nowrap">{item.label}</span>
                    {isActive && (
                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#34A853] shadow-[0_0_8px_rgba(52,168,83,0.4)] shrink-0" />
                    )}
                </>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Sessions List */}
      <div className="flex-1 overflow-hidden flex flex-col mt-2 border-t border-stone-200/50 pt-2">
         <SessionList 
            apiEndpoint={apiEndpoint} 
            isCollapsed={isCollapsed} 
            currentSessionId={currentSessionId}
         />
      </div>

      {/* Footer */}
      <div className="p-3 mt-auto space-y-2 flex-shrink-0">
         {/* Settings Button */}
        <button 
            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-stone-400 hover:bg-stone-200/30 hover:text-stone-700 transition-all text-[15px] font-sans
                ${isCollapsed ? 'justify-center' : ''}
            `}
            title={isCollapsed ? "Settings" : ""}
        >
          <Settings size={20} strokeWidth={2} className="shrink-0" />
          {!isCollapsed && <span>Settings</span>}
        </button>
      </div>
    </aside>
  );
}

function Layout({ children, apiEndpoint }: { children: React.ReactNode, apiEndpoint: string }) {
  return (
    <div className="flex h-[100dvh] w-full bg-[#FAF9F6] text-stone-800 font-serif overflow-hidden supports-[height:100cqh]:h-[100cqh] selection:bg-[#34A853]/20 selection:text-[#1a1a1a]">
      <Sidebar apiEndpoint={apiEndpoint} />
      {/* Main Content Area */}
      <main className="flex-1 h-full w-full relative overflow-hidden flex flex-col">
        {children}
      </main>
    </div>
  );
}

export default function App() {
  const [apiEndpoint] = useState('https://192.168.5.215:8080');

  return (
    <ToastProvider>
        <BrowserRouter>
        <Layout apiEndpoint={apiEndpoint}>
            <Routes>
            <Route path="/" element={<ChatPage apiEndpoint={apiEndpoint} />} />
            <Route path="/c/:sessionId" element={<ChatPage apiEndpoint={apiEndpoint} />} />
            <Route path="/skills" element={<SkillsPage apiEndpoint={apiEndpoint} />} />
            <Route path="/library" element={<SkillsLibraryPage apiEndpoint={apiEndpoint} />} />
            </Routes>
        </Layout>
        </BrowserRouter>
    </ToastProvider>
  );
}