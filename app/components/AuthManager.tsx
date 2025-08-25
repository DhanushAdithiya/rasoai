import React, { useState } from 'react';
import Login from './Login';
import Signup from './Signup';

interface AuthManagerProps {
  onLoginSuccess: (userId: string) => void; // ✅ Updated to expect userId parameter
}

export default function AuthManager({ onLoginSuccess }: AuthManagerProps) {
  const [currentView, setCurrentView] = useState<'login' | 'signup'>('login');

  const handleNavigateToSignup = () => {
    setCurrentView('signup');
  };

  const handleBackToLogin = () => {
    setCurrentView('login');
  };

  const handleSignupSuccess = () => {
    // After successful signup, you can either:
    // 1. Automatically log them in (would need userId from signup)
    // 2. Take them back to login screen to sign in (current implementation)
    
    // Option 2: Go back to login screen after signup
    setCurrentView('login');
    
    // Note: If you want to auto-login after signup (Option 1), 
    // you'll need to modify Signup.tsx to also pass userId in its onSignupSuccess callback
    // and then call onLoginSuccess(userId) here instead
  };

  if (currentView === 'signup') {
    return (
      <Signup 
        onSignupSuccess={handleSignupSuccess}
        onBackToLogin={handleBackToLogin}
      />
    );
  }

  return (
    <Login 
      onLoginSuccess={onLoginSuccess} // ✅ This now properly passes userId through
      onNavigateToSignup={handleNavigateToSignup}
    />
  );
}