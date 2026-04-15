import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { useTwinPair } from './hooks/useTwinPair';
import { useInviteRedemption } from './hooks/useInviteRedemption';
import { useRealtime } from './hooks/useRealtime';
import { useEvents } from './hooks/useEvents';
import { useActiveTimers } from './hooks/useActiveTimers';
import { BottomNav } from './components/shared/BottomNav';
import { LoginScreen } from './components/auth/LoginScreen';
import { SignupScreen } from './components/auth/SignupScreen';
import { OnboardingFlow } from './components/auth/OnboardingFlow';
import { JoinInvitePage } from './components/auth/JoinInvitePage';
import { HomeScreen } from './components/home/HomeScreen';
import { DashboardView } from './components/dashboard/DashboardView';
import { SettingsView } from './components/settings/SettingsView';
import { UndoToast } from './components/home/UndoToast';
import { SyncErrorBanner } from './components/shared/SyncErrorBanner';
import { UpdatePrompt } from './components/shared/UpdatePrompt';

function AuthenticatedApp() {
  const { profile } = useAuth();
  const { pair, loading: pairLoading } = useTwinPair();
  const { redeeming } = useInviteRedemption();
  const location = useLocation();

  // Activate data loading and real-time sync
  useEvents();
  useActiveTimers();
  useRealtime();

  const isJoinRoute = location.pathname.startsWith('/join/');

  // Let /join/:code through even without a pair
  if (isJoinRoute) {
    return (
      <Routes>
        <Route path="/join/:code" element={<JoinInvitePage />} />
      </Routes>
    );
  }

  if (redeeming) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg-primary">
        <div className="text-text-secondary text-lg">Joining twin pair...</div>
      </div>
    );
  }

  if (!profile?.active_pair_id) {
    return <OnboardingFlow />;
  }

  if (pairLoading || !pair) {
    return (
      <div className="flex items-center justify-center h-dvh bg-bg-primary">
        <div className="text-text-secondary text-lg">Loading your twins...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-dvh bg-bg-primary">
      <main className="flex-1 overflow-y-auto pb-24">
        <Routes>
          <Route path="/" element={<HomeScreen />} />
          <Route path="/dashboard" element={<DashboardView />} />
          <Route path="/settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <BottomNav />
      <UndoToast />
      <SyncErrorBanner />
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
      <UpdatePrompt />
      <Routes>
        {!user ? (
          <>
            <Route path="/login" element={<LoginScreen />} />
            <Route path="/signup" element={<SignupScreen />} />
            <Route path="/join/:code" element={<JoinInvitePage />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </>
        ) : (
          <Route path="/*" element={<AuthenticatedApp />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}
