import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { BottomNav } from './components/shared/BottomNav';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { OnboardingFlow } from './components/auth/OnboardingFlow';
import { HomeScreen } from './components/home/HomeScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { UndoToast } from './components/home/UndoToast';

function AuthenticatedApp() {
  const { profile } = useAuth();

  if (!profile?.active_pair_id) {
    return <OnboardingFlow />;
  }

  return (
    <div className="flex flex-col h-dvh bg-bg-primary">
      <main className="flex-1 overflow-y-auto pb-20">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <UndoToast />
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg-primary">
        <div className="text-text-secondary text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/*" element={<AuthenticatedApp />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
