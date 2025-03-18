"use client";

import { useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { fetchWithAuth } from "@/utils/apiUtils";
import { deleteCookie } from "@/utils/cookies";
// PostHog types are globally available via the declaration file

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-pale-purple border-t-transparent" />
  );
}

export default function AccountPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      // Reset any tracking (like PostHog)
      if (typeof window !== 'undefined' && window.posthog) {
        window.posthog.reset();
      }
      
      // Clear both localStorage and cookies
      localStorage.clear();
      deleteCookie('token');
      deleteCookie('session');
      deleteCookie('username');
      
      // Navigate to login page
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation to login page even if there's an error
      router.push('/login');
    }
  }, [router]);

  const handlePasswordChange = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate passwords
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('current_password', currentPassword);
      formData.append('new_password', newPassword);

      const response = await fetchWithAuth('/api/auth/change-password', {
        method: 'POST',
        body: formData,
        headers: {} // Let the browser set the content type with boundary
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to change password');
      }

      // Clear form and show success message
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully");
    } catch (err) {
      console.error('Error changing password:', err);
      setError(err instanceof Error ? err.message : 'Failed to change password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
        <div className="h-[30px] sm:h-[40px]">
            <Image
              src="/proppai_logo_on_null.webp"
              alt="proppai Logo"
              width={300}
              height={40}
              priority
              className="object-contain w-auto h-full"
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/properties')}
              className="px-4 py-2 bg-primary text-foreground-light rounded-md hover:bg-primary-dark"
            >
              Back to Properties
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-primary hover:border-primary-dark text-primary hover:text-secondary hover:bg-primary-dark transition-colors rounded-md"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="rounded-lg p-8 space-y-6 max-w-md mx-auto">
          <h2 className="text-2xl font-bold text-primary-dark text-center mb-6">Change Password</h2>

          {error && (
            <div className="mb-4 bg-primary bg-opacity-10 text-primary px-4 py-3 rounded-md">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-500 bg-opacity-10 text-green-500 px-4 py-3 rounded-md">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium">{success}</span>
              </div>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="current-password" className="block text-sm font-medium text-primary-dark mb-1">
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="new-password" className="block text-sm font-medium text-primary-dark mb-1">
                New Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                className="block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-primary-dark mb-1">
                Confirm New Password
              </label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !currentPassword || !newPassword || !confirmPassword}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-foreground-light bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-background disabled:text-foreground disabled:border-foreground disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-foreground-light border-t-transparent" />
                  <span>Updating...</span>
                </div>
              ) : "Change Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
} 