"use client";

import { FormEvent, useState, useEffect, useCallback } from "react";
import { UserGroupIcon, TrashIcon, HomeIcon, Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRouter, useSearchParams } from "next/navigation";
import { deleteCookie, getCookie } from "@/utils/cookies";
import { Switch } from "@/components/ui/switch";
import posthog from "posthog-js";

interface User {
  email: string;
  full_name: string;
  is_admin: boolean;
}

interface Property {
  _id: string;
  address: string;
  estimated_value: number;
}

interface PropertyAnalysis {
  property_description: string;
  messages: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
  }>;
  _id: string;
}

interface Props {
  onAnalysisComplete: (analysis: PropertyAnalysis | null) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Add debug log
console.log('API_URL:', API_URL);

// Add loading spinner component
function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-secondary border-t-transparent" />
  );
}

export function Sidebar({ onAnalysisComplete }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', is_admin: false });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  // Toggle sidebar visibility on mobile
  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };

  // Close sidebar when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarVisible(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleAuthError = useCallback(() => {
    // Clear all auth data
    localStorage.removeItem('token');
    deleteCookie('token');
    deleteCookie('session');
    deleteCookie('username');
    
    // Use Next.js router for navigation
    router.push('/login');
  }, [router]);

  const handleLogout = useCallback(async () => {
    try {
      // Reset PostHog identification
      posthog.reset();
      
      // Clear both localStorage and cookies
      localStorage.clear();
      deleteCookie('token');
      deleteCookie('session');
      deleteCookie('username');
      
      // Use Next.js router for navigation
      router.push('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation to login page even if there's an error
      router.push('/login');
    }
  }, [router]);

  // Check for selected property in URL parameters
  useEffect(() => {
    const fetchSelectedProperty = async () => {
      try {
        // Get propertyId from URL if it exists using useSearchParams
        const propertyId = searchParams?.get('propertyId');
        const refresh = searchParams?.get('refresh'); // Check for refresh parameter
        
        if (propertyId) {
          console.log(`Loading property ${propertyId}, refresh param: ${refresh}`);
          const token = getCookie('token');
          if (!token) {
            handleAuthError();
            return;
          }
          
          // If this is a fresh redirect from property creation (has refresh param)
          // Delay slightly to ensure backend has finished processing
          if (refresh) {
            console.log('Detected refresh parameter, waiting for backend processing...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          
          const response = await fetch(`${API_URL}/api/properties/${propertyId}`, {
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
            throw new Error('Failed to fetch property details');
          }
          
          const property = await response.json();
          console.log('Loaded property:', property);
          setSelectedProperty(property);
          
          // Load property analysis for all properties
          try {
            setIsLoading(true);
            
            const token = getCookie('token');
            
            console.log(`Fetching chat history for property ID: ${property._id}`);
            const response = await fetch(`${API_URL}/api/properties/${property._id}/chat`, {
              method: "GET",
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              credentials: 'include'
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => null);
              console.error(`Chat history request failed with status ${response.status}:`, errorData);
              if (response.status === 401) {
                handleAuthError();
                return;
              }
              throw new Error(errorData?.detail || 'Failed to fetch chat history');
            }

            const chatData = await response.json();
            console.log('Chat history loaded:', chatData);
            
            // Create the property analysis object with the fetched data
            const analysis: PropertyAnalysis = {
              property_description: chatData.property_description || "",
              messages: chatData.messages || [],
              _id: property._id
            };
            
            console.log('PropertyAnalysis created:', analysis);
            onAnalysisComplete(analysis);
          } catch (analysisErr) {
            console.error('Error loading property analysis:', analysisErr);
            setError(analysisErr instanceof Error ? analysisErr.message : 'Failed to load property analysis');
          } finally {
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.error('Error fetching selected property:', err);
        setError(err instanceof Error ? err.message : 'Failed to load selected property');
      }
    };
    
    fetchSelectedProperty();
  }, [handleAuthError, searchParams, onAnalysisComplete]);

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
      }
    } catch (err) {
      console.error('Error fetching admin status:', err);
    }
  }, []);

  // Fetch users (admin only)
  const fetchUsers = useCallback(async () => {
    try {
      const token = getCookie('token');
      console.log('Fetching users with token:', token ? 'Present' : 'Missing');
      
      if (!token) {
        console.log('No token found, redirecting to login');
        handleAuthError();
        return;
      }

      console.log('Making request to:', `${API_URL}/api/auth/users`);
      const response = await fetch(`${API_URL}/api/auth/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(errorData?.detail || 'Failed to fetch users');
      }

      const data = await response.json();
      console.log('Users fetched successfully:', data);
      setUsers(data.users);
    } catch (err) {
      console.error('Error in fetchUsers:', err);
      setError(err instanceof Error ? err.message : 'Failed to load users');
      
      // If it's a network error, provide more specific error message
      if (err instanceof TypeError && err.message === 'Failed to fetch') {
        setError('Unable to connect to the server. Please check your connection and try again.');
      }
    }
  }, [handleAuthError]);

  // Create new user (admin only)
  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const token = getCookie('token');
      if (!token) {
        handleAuthError();
        return;
      }

      // Validate input
      if (!newUser.email || !newUser.full_name || !newUser.password) {
        setError("Please fill in all required fields");
        return;
      }

      console.log('Creating new user:', { ...newUser, password: '[REDACTED]' });
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
        
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        
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

      const data = await response.json();
      console.log('User created successfully:', data);
      
      // Reset form and fetch updated user list
      setNewUser({ email: '', full_name: '', password: '', is_admin: false });
      fetchUsers();
      setError(""); // Clear any existing errors
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle user admin status
  const handleToggleAdmin = async (email: string, isAdmin: boolean) => {
    setError("");
    setIsLoading(true);

    try {
      const token = getCookie('token');
      if (!token) {
        handleAuthError();
        return;
      }

      console.log('Toggling admin status for:', email);
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
        const errorData = await response.json().catch(() => null);
        console.error('Error response:', errorData);
        
        if (response.status === 401) {
          handleAuthError();
          return;
        }
        throw new Error(errorData?.detail || 'Failed to update admin status');
      }

      const data = await response.json();
      console.log('Admin status updated successfully:', data);
      
      // Refresh user list
      fetchUsers();
      setError(""); // Clear any existing errors
    } catch (err) {
      console.error('Error toggling admin status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update admin status');
    } finally {
      setIsLoading(false);
    }
  };

  // Check admin status on mount
  useEffect(() => {
    fetchAdminStatus();
  }, [fetchAdminStatus]);

  // Fetch users when admin panel is opened
  useEffect(() => {
    if (showAdminPanel) {
      fetchUsers();
    }
  }, [showAdminPanel, fetchUsers]);

  const handleDeleteUser = async (email: string) => {
    setError(null);
    setIsLoading(true);

    try {
      const token = getCookie('token');
      if (!token) {
        handleAuthError();
        return;
      }

      console.log(`Attempting to delete user: ${email}`);
      const response = await fetch(`${API_URL}/api/auth/users/${email}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: 'include'
      });

      console.log(`Delete response status: ${response.status}`);
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error deleting user:', errorData);
        setError(errorData.detail || 'Failed to delete user');
        return;
      }

      // Remove the deleted user from the local state
      setUsers(prevUsers => prevUsers.filter(user => user.email !== email));
      console.log('User deleted successfully');
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (showAdminPanel) {
    return (
      <div className="w-96 bg-background-dark border-r border-neutral p-6 overflow-y-auto font-[var(--font-kalam)] flex flex-col h-full">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-foreground-light">Admin Panel</h2>
          <button
            onClick={() => setShowAdminPanel(false)}
            className="text-foreground-light hover:text-primary"
          >
            Back to Properties
          </button>
        </div>

        <form onSubmit={handleCreateUser} className="mb-6 space-y-4">
          <h3 className="text-lg font-medium text-foreground-light">Create New User</h3>
          <div className="mb-2">
            <input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              className="w-full px-3 py-2 bg-background-dark border border-neutral rounded-md text-foreground-light"
            />
          </div>
          <div className="mb-2">
            <input
              type="text"
              placeholder="Full Name"
              value={newUser.full_name}
              onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              className="w-full px-3 py-2 bg-background-dark border border-neutral rounded-md text-foreground-light"
            />
          </div>
          <div className="mb-2">
            <input
              type="password"
              placeholder="Password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              className="w-full px-3 py-2 bg-background-dark border border-neutral rounded-md text-foreground-light"
            />
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_admin"
              checked={newUser.is_admin}
              onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.checked })}
              className="mr-2"
            />
            <label htmlFor="is_admin" className="text-foreground-light">Is Admin</label>
          </div>
          <button
            type="submit"
            className="w-full py-2 px-4 bg-primary text-foreground-light rounded-md hover:bg-opacity-90"
          >
            Create User
          </button>
        </form>

        <div className="flex-1 overflow-y-auto">
          <h3 className="text-lg font-medium text-foreground-light mb-4">Users</h3>
          <div className="space-y-2">
            {users.map((user) => (
              <div key={user.email} className="flex items-center justify-between p-2 border-b">
                <div>
                  <p className="font-medium">{user.full_name}</p>
                  <p className="text-sm text-gray-600">{user.email}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={user.is_admin}
                    onChange={() => handleToggleAdmin(user.email, user.is_admin)}
                    className={`${user.is_admin ? 'bg-blue-600' : 'bg-gray-200'} relative inline-flex h-6 w-11 items-center rounded-full`}
                  >
                    <span className="sr-only">Toggle admin status</span>
                    <span
                      className={`${user.is_admin ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition`}
                    />
                  </Switch>
                  <button
                    onClick={() => handleDeleteUser(user.email)}
                    disabled={user.email === 'admin@propertyblurb.com' || isLoading}
                    className={`p-1 rounded ${
                      user.email === 'admin@propertyblurb.com'
                        ? 'bg-gray-200 cursor-not-allowed'
                        : 'bg-red-500 hover:bg-red-600 text-white'
                    }`}
                    title={user.email === 'admin@propertyblurb.com' ? 'Cannot delete main admin' : 'Delete user'}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto pt-6">
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-primary hover:bg-opacity-10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Sidebar toggle button - mobile only */}
      <button 
        onClick={toggleSidebar}
        className="md:hidden fixed top-6 left-6 z-50 bg-primary text-background p-2 rounded-md shadow-lg"
        aria-label="Toggle sidebar"
      >
        {sidebarVisible ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
      </button>
      
      {/* Sidebar overlay - dark background when sidebar is open on mobile */}
      {sidebarVisible && (
        <div 
          className="md:hidden fixed inset-0 bg-background-dark bg-opacity-50 z-40"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}
      
      {/* Sidebar content */}
      <div 
        className={`
          fixed md:static inset-y-0 left-0 z-40
          w-80 md:w-96 bg-background-dark p-6 
          overflow-y-auto font-[var(--font-kalam)] flex flex-col h-full
          transition-transform duration-300 ease-in-out
          ${sidebarVisible ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {error && (
          <div className="mb-4 p-3 bg-primary bg-opacity-10 text-primary rounded-md">
            {error}
          </div>
        )}

        {selectedProperty && (
          <div className="mb-6 mt-12 sm:mt-0">
            <div className="p-3 rounded-md bg-background-dark border border-neutral text-foreground-light">
              <p className="font-medium">{selectedProperty.address}</p>
              <p className="text-sm text-neutral">£{selectedProperty.estimated_value.toLocaleString()}</p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/properties')}
          className="w-full mb-6 flex justify-center items-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-foreground-light bg-primary hover:bg-secondary hover:text-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          <HomeIcon className="h-5 w-5" />
          {selectedProperty ? "Change Property" : "Select Property"}
        </button>

        {isLoading && (
          <div className="fixed inset-0 bg-background-dark bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-background-dark p-6 rounded-lg shadow-xl border border-neutral">
              <div className="flex flex-col items-center space-y-4">
                <LoadingSpinner />
                <p className="text-foreground-light">Analyzing property, this may take a few moments...</p>
              </div>
            </div>
          </div>
        )}

        {isAdmin ? (
          <div className="mt-auto pt-6">
            <button
              onClick={() => setShowAdminPanel(true)}
              className="w-full py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-secondary hover:text-primary-dark hover:border-secondary transition-colors mb-4"
            >
              <div className="flex items-center justify-center space-x-2">
                <UserGroupIcon className="h-5 w-5" />
                <span>Admin Panel</span>
              </div>
            </button>
          </div>
        ) : (
          <div className="mt-auto pt-6">
            <button
              onClick={() => router.push('/account')}
              className="w-full py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-secondary hover:text-primary-dark hover:border-secondary transition-colors mb-4"
            >
              Account Management
            </button>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="w-full py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-secondary hover:text-primary-dark hover:border-secondary transition-colors"
        >
          Sign Out
        </button>
      </div>
    </>
  );
} 