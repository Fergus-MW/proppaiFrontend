import { API_URL } from './propertyHelpers';
import { getCookie } from './cookies';

/**
 * Enhanced fetch utility for making authenticated API requests
 * @param endpoint API endpoint (can be relative path or full URL)
 * @param options Fetch options
 * @param options.token Optional auth token (will use cookie if not provided)
 * @param options.handleErrors Whether to throw errors for non-ok responses (default: true)
 * @returns Promise that resolves to the fetch Response
 */
export const fetchWithAuth = async (
  endpoint: string,
  options: RequestInit & {
    token?: string;
    handleErrors?: boolean;
  } = {}
): Promise<Response> => {
  // Extract custom options
  const { token: providedToken, handleErrors = true, ...fetchOptions } = options;
  
  // Get token from parameter or cookie
  const token = providedToken || getCookie('token');
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Determine if endpoint is a full URL or a relative path
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`;
  
  // Setup headers
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...fetchOptions.headers
  };
  
  // Add Content-Type for non-GET requests that don't already have it
  if (fetchOptions.method !== 'GET' && 
      !(fetchOptions.body instanceof FormData) && 
      !(fetchOptions.headers as Record<string, string>)?.['Content-Type']) {
    (headers as Record<string, string>)['Content-Type'] = 'application/json';
  }
  
  // Make the request
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
    credentials: 'include'
  });
  
  // Handle errors if enabled
  if (handleErrors) {
    if (response.status === 401) {
      throw new Error('Unauthorized');
    }
    
    if (!response.ok) {
      throw new Error(`Request failed with status ${response.status}`);
    }
  }
  
  return response;
};

/**
 * Poll for property analysis status until complete
 * @param propertyId Property ID to check status for
 * @param token Authentication token
 * @param onStatusUpdate Callback function that receives status updates
 * @param pollingInterval Time in ms between polling attempts (default: 2000ms)
 * @param maxAttempts Maximum number of polling attempts (default: 300 = 10 minutes at 2s intervals)
 * @returns Promise that resolves to true if analysis completed successfully, false otherwise
 */
export const pollAnalysisStatus = async (
  propertyId: string,
  token: string,
  onStatusUpdate: (status: {
    status: string;
    progress: number;
    message?: string;
  }) => void,
  pollingInterval = 2000,
  maxAttempts = 300
): Promise<boolean> => {
  let attempts = 0;
  
  try {
    while (attempts < maxAttempts) {
      attempts++;
      
      try {
        const statusResponse = await fetchWithAuth(
          `/api/properties/${propertyId}/analysis-status`, 
          { token }
        );
        
        const statusData = await statusResponse.json();
        console.log('Analysis status:', statusData);
        
        // Call the callback with status update
        onStatusUpdate(statusData);
        
        // If analysis is complete or failed, stop polling
        if (statusData.status === 'completed') {
          return true;
        }
        
        if (statusData.status === 'failed') {
          throw new Error(statusData.message || 'Analysis failed');
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'Unauthorized') {
          console.error('Authentication error while checking status');
          return false;
        }
        throw error;
      }
      
      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, pollingInterval));
    }
    
    // If we've reached max attempts
    throw new Error('Analysis timed out after maximum polling attempts');
  } catch (error) {
    console.error('Error in polling loop:', error);
    throw error;
  }
};

// Keep this as a backwards compatibility helper
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  token: string
): Promise<Response> => {
  console.warn('apiRequest is deprecated, please use fetchWithAuth instead');
  return fetchWithAuth(endpoint, { ...options, token });
}; 