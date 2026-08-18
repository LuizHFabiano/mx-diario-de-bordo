import { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppDataProvider } from './context/AppDataContext';
import { AuthScreen } from './components/AuthScreen';
import { Sidebar } from './components/Sidebar';
import { HojeView } from './views/HojeView';
import { PassadosView } from './views/PassadosView';
import { ConfigView } from './views/ConfigView';
import { useTheme } from './hooks/useTheme';

function AppShell() {
  const { currentUser, ready } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [view, setView] = useState('hoje');

  if (!ready) return null;
  if (!currentUser) return <AuthScreen theme={theme} />;

  return (
    <AppDataProvider>
      <div className="app">
        <Sidebar view={view} onChangeView={setView} theme={theme} />
        <main className="main">
          {view === 'hoje' && <HojeView theme={theme} onToggleTheme={toggleTheme} />}
          {view === 'passados' && <PassadosView />}
          {view === 'config' && <ConfigView />}
        </main>
      </div>
    </AppDataProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
