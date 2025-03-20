"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { API_URL } from '@/utils/propertyHelpers';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(false);
  const [isTokenChecking, setIsTokenChecking] = useState(true);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  // Verify token on page load
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setIsTokenChecking(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/auth/verify-reset-token/${token}`);
        const data = await response.json();

        setIsTokenValid(data.valid);
      } catch (err) {
        setIsTokenValid(false);
      } finally {
        setIsTokenChecking(false);
      }
    }

    verifyToken();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Basic validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          new_password: password,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to reset password. Please try again.');
      }

      setIsSuccess(true);
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-secondary">
      <div className="mb-4 relative w-[300px] h-[60px]">
        <Link href="/login">
          <Image
            src="https://storage.googleapis.com/property_blurb_files/Assets/proppai_logo_on_null.webp"
            alt="proppai Logo"
            width={300}
            height={60}
            className="object-contain"
            priority
          />
        </Link>
      </div>

      <div className="w-full max-w-md px-6">
        <div className="rounded-lg p-8 space-y-6">
          {isTokenChecking ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
              </div>
              <p className="text-foreground">Verifying your reset link...</p>
            </div>
          ) : isSuccess ? (
            <div className="text-center space-y-4">
              <div className="bg-primary bg-opacity-10 text-primary px-4 py-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Password Reset Successful!</span>
                </div>
              </div>
              <p className="text-foreground">
                Your password has been successfully reset. You can now log in with your new password.
              </p>
              <div className="pt-4">
                <Link href="/login" className="text-primary hover:text-primary-dark">
                  Go to login
                </Link>
              </div>
            </div>
          ) : !isTokenValid ? (
            <div className="text-center space-y-4">
              <div className="bg-primary bg-opacity-10 text-primary px-4 py-3 rounded-md">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">Invalid or Expired Reset Link</span>
                </div>
              </div>
              <p className="text-foreground">
                This password reset link is invalid or has expired. Please request a new password reset link.
              </p>
              <div className="pt-4">
                <Link href="/forgot-password" className="text-primary hover:text-primary-dark">
                  Request a new reset link
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center">
                <h2 className="text-xl font-bold text-foreground">Reset Your Password</h2>
                <p className="mt-2 text-foreground-light">
                  Enter a new password for your account
                </p>
              </div>

              {error && (
                <div className="bg-primary bg-opacity-10 text-primary px-4 py-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">{error}</span>
                  </div>
                </div>
              )}

              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-foreground-light">
                    New Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                    placeholder="Enter new password"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground-light">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                    placeholder="Confirm new password"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  disabled={!password || !confirmPassword || isLoading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-foreground-light bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-background disabled:text-foreground disabled:border-foreground disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-foreground-light border-t-transparent" />
                      <span>Resetting Password...</span>
                    </div>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </form>

              <div className="text-center pt-4">
                <Link href="/login" className="text-primary hover:text-primary-dark">
                  Cancel and return to login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 