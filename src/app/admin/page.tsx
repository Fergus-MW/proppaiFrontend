"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Switch } from "@/components/ui/switch";
import { getCookie, deleteCookie } from "@/utils/cookies";
// PostHog types are globally available via the declaration file

interface User {
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface ChatSession {
  property_id: string;
  user_email: string;
  created_at: string;
  last_activity: string;
  property_data: {
    address?: string;
    files?: { filename: string; url: string }[];
  };
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-pale-purple border-t-transparent" />
  );
}

export default function AdminPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', is_admin: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuthError = useCallback(() => {
    router.push('/login');
  }, [router]);

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

  // Fetch admin status
  const fetchAdminStatus = useCallback(async () => {
    try {
      const token = getCookie('token');
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.is_admin);
        if (!data.is_admin) {
          router.push('/'); // Redirect non-admin users
        }
      }
    } catch (err) {
      console.error('Error fetching admin status:', err);
      handleAuthError();
    }
  }, [router, handleAuthError]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const token = getCookie('token');
      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users');
    }
  }, [handleAuthError]);

  // Fetch chat sessions
  const fetchChatSessions = useCallback(async () => {
    try {
      const token = getCookie('token');
      const response = await fetch(`${API_URL}/api/chat-sessions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error('Failed to fetch chat sessions');
      }

      const data = await response.json();
      setChatSessions(data.chat_sessions);
    } catch (err) {
      console.error('Error fetching chat sessions:', err);
      setError('Failed to load chat sessions');
    }
  }, [handleAuthError]);

  // Create new user
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = getCookie('token');
      
      // Add validation for the username field
      if (!newUser.email || !newUser.full_name || !newUser.password) {
        setError("Please fill in all required fields");
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`${API_URL}/api/auth/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(newUser)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        
        // Create a more detailed error message
        let errorMessage = 'Failed to create user';
        if (errorData) {
          if (typeof errorData.detail === 'string') {
            errorMessage = errorData.detail;
          } else if (errorData.detail && typeof errorData.detail === 'object') {
            errorMessage = JSON.stringify(errorData.detail);
          } else if (errorData.msg) {
            errorMessage = errorData.msg;
          } else {
            errorMessage = `Error (${response.status}): ${JSON.stringify(errorData)}`;
          }
        }
        
        setError(errorMessage);
        setIsLoading(false);
        return; // Don't throw, just set the error and return
      }

      // Reset form and fetch updated user list
      setNewUser({ email: '', full_name: '', password: '', is_admin: false });
      fetchUsers();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle user admin status
  const handleToggleAdmin = async (email: string, isAdmin: boolean) => {
    setIsLoading(true);
    try {
      const token = getCookie('token');
      const response = await fetch(`${API_URL}/api/auth/users/${email}/admin`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ is_admin: !isAdmin })
      });

      if (!response.ok) {
        throw new Error('Failed to update admin status');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setError('Failed to update admin status');
    } finally {
      setIsLoading(false);
    }
  };

  // Delete user
  const handleDeleteUser = async (email: string) => {
    setIsLoading(true);
    try {
      const token = getCookie('token');
      const response = await fetch(`${API_URL}/api/auth/users/${email}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to delete user');
      }

      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
    } finally {
      setIsLoading(false);
    }
  };

  // Load admin data on mount
  useEffect(() => {
    fetchAdminStatus();
    fetchUsers();
    fetchChatSessions();
  }, [fetchAdminStatus, fetchUsers, fetchChatSessions]);

  if (!isAdmin) {
    return null; // Or a loading state
  }

  return (
    <div className="min-h-screen bg-pale-purple">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="h-[60px]">
            <Image
              src="/logo.png"
              alt="PropertyBlurb Logo"
              width={300}
              height={60}
              priority
              className="object-contain"
            />
          </div>
          <div className="flex space-x-4">
            <button
              onClick={() => router.push('/')}
              className="px-4 py-2 bg-murrey text-pale-purple rounded-md hover:bg-opacity-90"
            >
              Back to Properties
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-murrey text-murrey rounded-md hover:bg-murrey hover:text-pale-purple transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-murrey bg-opacity-10 text-murrey rounded-md">
            {error}
          </div>
        )}

        <div className="bg-night rounded-lg shadow-xl p-6 mb-8">
          <h2 className="text-2xl font-bold text-pale-purple mb-6">Create New User</h2>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3 py-2 bg-night border border-ash-gray rounded-md text-pale-purple"
            />
            <input
              type="text"
              placeholder="Full Name"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-night border border-ash-gray rounded-md text-pale-purple"
            />
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 bg-night border border-ash-gray rounded-md text-pale-purple"
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_admin"
                checked={newUser.is_admin}
                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
                className="rounded border-ash-gray text-murrey focus:ring-murrey"
              />
              <label htmlFor="is_admin" className="text-pale-purple">Is Admin</label>
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 px-4 bg-murrey text-pale-purple rounded-md hover:bg-opacity-90 disabled:opacity-50"
            >
              {isLoading ? <LoadingSpinner /> : "Create User"}
            </button>
          </form>
        </div>

        <div className="bg-night rounded-lg shadow-xl p-6">
          <h2 className="text-2xl font-bold text-pale-purple mb-6">Users</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user.email} className="flex items-center justify-between p-4 border border-ash-gray rounded-md">
                <div>
                  <p className="text-pale-purple font-medium">{user.full_name}</p>
                  <p className="text-ash-gray text-sm">{user.email}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Switch
                    checked={user.is_admin}
                    onChange={() => handleToggleAdmin(user.email, user.is_admin)}
                    className={`${user.is_admin ? 'bg-murrey' : 'bg-ash-gray'} relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span className="sr-only">Toggle admin status</span>
                    <span
                      className={`${user.is_admin ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-pale-purple transition`}
                    />
                  </Switch>
                  <button
                    onClick={() => handleDeleteUser(user.email)}
                    disabled={user.email === 'admin@propertyblurb.com' || isLoading}
                    className={`p-2 rounded-full ${
                      user.email === 'admin@propertyblurb.com'
                        ? 'bg-ash-gray cursor-not-allowed'
                        : 'bg-murrey hover:bg-opacity-90'
                    }`}
                    title={user.email === 'admin@propertyblurb.com' ? 'Cannot delete main admin' : 'Delete user'}
                  >
                    <TrashIcon className="h-5 w-5 text-pale-purple" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-night rounded-lg shadow-xl p-6 mt-8">
          <h2 className="text-2xl font-bold text-pale-purple mb-6">Chat Sessions</h2>
          <div className="space-y-4">
            {chatSessions.map((session) => (
              <div key={session.property_id} className="p-4 border border-ash-gray rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-pale-purple font-medium">User: {session.user_email}</p>
                    <p className="text-ash-gray text-sm">
                      Created: {new Date(session.created_at).toLocaleString()}
                    </p>
                    <p className="text-ash-gray text-sm">
                      Last Activity: {new Date(session.last_activity).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/?propertyId=${session.property_id}`)}
                    className="px-4 py-2 bg-murrey text-pale-purple rounded-md hover:bg-opacity-90"
                  >
                    View Property
                  </button>
                </div>
                {session.property_data?.address && (
                  <p className="text-pale-purple mt-2">
                    Property: {session.property_data.address}
                  </p>
                )}
                {session.property_data?.files && session.property_data.files.length > 0 && (
                  <div className="mt-2">
                    <p className="text-pale-purple font-medium">Uploaded Files:</p>
                    <ul className="list-disc list-inside text-ash-gray">
                      {session.property_data.files.map((file, index) => (
                        <li key={index}>
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-murrey hover:underline"
                          >
                            {file.filename}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 