"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { API_URL } from '@/utils/propertyHelpers';
import { setCookie, getCookie } from '@/utils/cookies';
import { fetchWithAuth } from '@/utils/apiUtils';
import posthog from 'posthog-js';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Request Access modal state
  const [showRequestAccessModal, setShowRequestAccessModal] = useState(false);
  const [accessEmail, setAccessEmail] = useState("");
  const [isRequestLoading, setIsRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState("");

  // Check if user is already authenticated
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to access a protected endpoint
        const token = getCookie('token');
        if (!token) return;
        
        try {
          const response = await fetchWithAuth('/api/properties', { 
            token,
            handleErrors: false // Don't throw errors for auth failures
          });
          
          if (response.ok) {
            setIsAuthenticated(true);
            router.push('/properties');
          }
        } catch (error) {
          console.error('Authentication check failed:', error);
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
      }
    };

    checkAuth();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!email || !fullName || !password || !confirmPassword || !signupCode) {
      setError("Please fill in all fields");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    // Password validation
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    
    // Signup code validation
    if (signupCode.trim() === '') {
      setError("Signup code is required");
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      // Step 1: Create the user account
      const createUserResponse = await fetch(`${API_URL}/api/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          full_name: fullName,
          password: password,
          signup_code: signupCode
        }),
        credentials: 'include',
      });

      if (!createUserResponse.ok) {
        const errorData = await createUserResponse.json();
        console.error("Signup error details:", errorData);
        
        if (createUserResponse.status === 409) {
          setError("This email is already registered. Please try logging in instead.");
        } else if (createUserResponse.status === 422) {
          setError(errorData.detail || "Invalid input. Please check your information and try again.");
        } else if (createUserResponse.status === 403) {
          setError("Invalid signup code. Please enter a valid code to create an account.");
        } else if (createUserResponse.status === 400) {
          setError(errorData.detail || "There was a problem with your submission. Please check your information.");
        } else {
          setError(errorData.detail || "Registration failed. Please try again.");
        }
        setIsLoading(false);
        return;
      }

      // Step 2: Login with the new account
      const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          username: email,
          password: password,
        }),
        credentials: 'include',
      });

      if (!loginResponse.ok) {
        // If login fails for the new account, something went wrong
        setError("Account created but unable to log in automatically. Please go to the login page.");
        setIsLoading(false);
        return;
      }

      const loginData = await loginResponse.json();
      
      // Store auth data
      const token = loginData.access_token;
      localStorage.setItem('token', token);
      setCookie('token', token);
      
      // Set up PostHog identification
      posthog.identify(loginData.user.email, {
        email: loginData.user.email,
        name: loginData.user.full_name,
        is_admin: loginData.user.is_admin
      });
      
      // Track signup event
      posthog.capture("user_signed_up", {
        $set: {
          email: loginData.user.email
        }
      });
      
      // Redirect to properties page after successful signup and login
      router.push('/properties');
      
    } catch (err) {
      console.error("Signup error:", err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setError("Network error: Unable to connect to the server. Please check your internet connection.");
      } else if (err instanceof Error) {
        setError(`Error: ${err.message}`);
      } else {
        setError("An error occurred. Please try again later.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request access
  const handleRequestAccess = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!accessEmail) {
      setRequestError("Please enter your email");
      return;
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accessEmail)) {
      setRequestError("Please enter a valid email address");
      return;
    }
    
    setIsRequestLoading(true);
    setRequestError("");
    try {
      const response = await fetch(`${API_URL}/api/signups`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email: accessEmail })
      });
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 409) {
          setRequestError("This email is already registered. Please try logging in instead.");
        } else if (response.status === 422) {
          setRequestError("Invalid email format. Please enter a valid email address.");
        } else if (response.status === 429) {
          setRequestError("Too many requests. Please try again later.");
        } else if (response.status === 500) {
          setRequestError("A server error occurred. Please try again later.");
        } else {
          setRequestError(data.detail || "Failed to submit request. Please try again.");
        }
      } else {
        setShowRequestAccessModal(false);
        setAccessEmail("");
        // Show success message
        alert("Access request submitted successfully. You will be notified when your account is approved.");
      }
    } catch (err) {
      console.error("Request access error:", err);
      if (err instanceof TypeError && err.message.includes('fetch')) {
        setRequestError("Network error: Unable to connect to the server. Please check your internet connection.");
      } else if (err instanceof Error) {
        setRequestError(`Error: ${err.message}`);
      } else {
        setRequestError("An error occurred. Please try again later.");
      }
    } finally {
      setIsRequestLoading(false);
    }
  };

  // If already authenticated, don't show the signup form
  if (isAuthenticated) {
    return <div className="flex justify-center items-center h-screen bg-secondary">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-secondary">
      <div className="mb-4 relative w-[300px] h-[60px] flex items-center justify-center">
        <Image
          src="https://storage.googleapis.com/property_blurb_files/Assets/proppai_logo_on_null.webp"
          alt="proppai Logo"
          width={300}
          height={60}
          className="object-contain w-auto h-full"
          priority
        />
      </div>
      
      <div className="w-full max-w-md px-6">
        <div className="rounded-lg p-8 space-y-6">
          
          <div className="text-sm text-primary-dark text-center">
            <p>To create an account, you need a valid signup code. Please click Request Access if you don't have one.</p>
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
            <div className="space-y-4">
              <div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                  placeholder="Email Address"
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                  placeholder="Full Name"
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                  placeholder="Password (min. 8 characters)"
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                  placeholder="Confirm Password"
                  disabled={isLoading}
                />
              </div>

              <div>
                <input
                  id="signupCode"
                  name="signupCode"
                  type="text"
                  autoComplete="signupCode"
                  required
                  value={signupCode}
                  onChange={(e) => setSignupCode(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 bg-background border border-neutral rounded-md shadow-sm placeholder-neutral text-primary-dark focus:outline-none focus:ring-foreground focus:border-primary-dark sm:text-sm"
                  placeholder="Signup Code"
                  disabled={isLoading}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email || !fullName || !password || !confirmPassword || !signupCode}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-foreground-light bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:bg-background disabled:text-foreground disabled:border-foreground disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-foreground-light border-t-transparent" />
                  <span>Creating Account...</span>
                </div>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Divider with OR text */}
          <div className="w-full flex items-center">
            <div className="flex-grow h-px bg-neutral"></div>
            <div className="mx-4 text-sm text-neutral">OR</div>
            <div className="flex-grow h-px bg-neutral"></div>
          </div>

          {/* Request Access Button */}
          <div className="w-full">
            <button
              type="button"
              onClick={() => setShowRequestAccessModal(true)}
              className="w-full py-2 px-4 border border-primary hover:border-primary-dark text-sm rounded-md shadow-sm text-primary hover:text-secondary hover:bg-primary-dark transition-colors"
            >
              Request Access
            </button>
          </div>

          {/* Already have an account? Sign in link */}
          <div className="text-center text-sm text-primary-dark mt-4">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:text-primary-dark font-medium">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      {/* Request Access Modal */}
      {showRequestAccessModal && (
        <div className="fixed inset-0 bg-background-dark bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-background-dark p-6 rounded-lg shadow-xl border border-neutral max-w-md w-full">
            <h3 className="text-xl font-bold text-foreground-light mb-4">Request Access</h3>
            
            {requestError && (
              <div className="bg-primary bg-opacity-10 text-primary px-4 py-3 rounded-md mb-4">
                <div className="flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium">{requestError}</span>
                </div>
              </div>
            )}
            
            <form onSubmit={handleRequestAccess}>
              <div className="mb-4">
                <label htmlFor="access-email" className="block text-sm font-medium text-foreground-light mb-2">
                  Email Address
                </label>
                <input
                  id="access-email"
                  type="email"
                  value={accessEmail}
                  onChange={(e) => setAccessEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background-dark border border-neutral rounded-md text-foreground-light"
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowRequestAccessModal(false)}
                  className="py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-primary hover:bg-opacity-10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRequestLoading}
                  className="py-2 px-4 bg-primary text-foreground-light rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isRequestLoading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-foreground-light border-t-transparent" />
                      <span>Submitting...</span>
                    </div>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
} 