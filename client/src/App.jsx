import React, { useState } from 'react';
import ChatWindow from './features/chat/ChatWindow';
import AdminDashboard from './features/admin/AdminDashboard';

function App() {
  const [currentView, setCurrentView] = useState('chat'); // 'chat' | 'admin'

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-start p-4">
      <header className="mb-4 text-center w-full max-w-4xl flex items-center justify-between pt-2">
        <div className="text-left">
          <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">CampusAI Assistant</h1>
          <p className="text-slate-500 text-xs mt-0.5">AI-Powered Multi-Dialect College Helpdesk & Document Portal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentView('chat')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentView === 'chat'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            💬 Student Chat
          </button>
          <button
            onClick={() => setCurrentView('admin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              currentView === 'admin'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            ⚙️ Admin Console
          </button>
        </div>
      </header>

      <main className="w-full flex justify-center">
        {currentView === 'chat' ? <ChatWindow /> : <AdminDashboard onLogout={() => setCurrentView('chat')} />}
      </main>
    </div>
  );
}

export default App;

