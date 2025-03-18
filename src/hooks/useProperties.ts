import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { deleteCookie } from '@/utils/cookies';
import { Property } from '@/utils/propertyHelpers';
import { fetchWithAuth } from '@/utils/apiUtils';
// PostHog types are globally available via the declaration file

export function useProperties() {
  const router = useRouter();
  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Auth error handler
  const handleAuthError = useCallback(() => {
    localStorage.removeItem('token');
    deleteCookie('token');
    deleteCookie('session');
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
  
  // Fetch all properties
  const fetchProperties = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetchWithAuth('/api/properties');
      const data = await response.json();
      setProperties(data);
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }, [handleAuthError]);
  
  // Delete a property
  const deleteProperty = async (propertyId: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await fetchWithAuth(`/api/properties/${propertyId}`, {
        method: 'DELETE'
      });
      
      // Update the local state by removing the deleted property
      setProperties(prev => prev.filter(p => p._id !== propertyId));
      return true;
      
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to delete property');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new property with images
  const createProperty = async (
    propertyData: { address: string, estimated_value: number },
    images?: File[],
    updateProgress?: (progress: number, message: string) => void
  ): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Step 1: Create the property (without images or description) - 10% progress
      if (updateProgress) {
        updateProgress(10, "Creating property...");
      }
      
      const createResponse = await fetchWithAuth('/api/properties', {
        method: 'POST',
        body: JSON.stringify(propertyData)
      });
      
      const { property_id } = await createResponse.json();
      
      // Step 2: Upload images one by one - 20% to 80% progress
      if (images && images.length > 0) {
        const progressPerImage = 60 / images.length; // Distribute 60% of progress among images
        
        // Sort files to ensure PDFs are processed first
        const sortedImages = [...images].sort((a, b) => {
          const aIsPdf = a.name.toLowerCase().endsWith('.pdf');
          const bIsPdf = b.name.toLowerCase().endsWith('.pdf');
          if (aIsPdf && !bIsPdf) return -1;
          if (!aIsPdf && bIsPdf) return 1;
          return 0;
        });
        
        for (let i = 0; i < sortedImages.length; i++) {
          const file = sortedImages[i];
          const imageNumber = i + 1;
          
          if (updateProgress) {
            updateProgress(
              20 + (progressPerImage * i), 
              `Processing ${file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'image'} ${imageNumber} of ${sortedImages.length}...`
            );
          }
          
          const formData = new FormData();
          formData.append('file', file);
          
          await fetchWithAuth(`/api/properties/${property_id}/images`, {
            method: 'POST',
            headers: {}, // Let the browser set the content type with boundary
            body: formData
          });
          
          if (updateProgress) {
            updateProgress(
              20 + (progressPerImage * (i + 1)), 
              `${file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'} ${imageNumber} of ${sortedImages.length} processed`
            );
          }
        }
        
        // Step 3: Generate description - 80% to 100% progress
        if (updateProgress) {
          updateProgress(80, "Generating property description...");
        }
        
        await generatePropertyDescription(property_id);
        
        if (updateProgress) {
          updateProgress(100, "Property processing complete!");
        }
      }
      
      // Refresh the properties list
      await fetchProperties();
      
      return property_id;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return null;
      }
      setError(err instanceof Error ? err.message : 'Failed to create property');
      return null;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update an existing property's details (not including images)
  const updateProperty = async (
    propertyId: string,
    propertyData: { address: string, estimated_value: number },
    newImages?: File[],
    updateProgress?: (progress: number, message: string) => void,
    deletedImageUrls?: string[]
  ): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Calculate total steps for progress tracking
      const hasPropertyUpdates = propertyData.address || propertyData.estimated_value !== undefined;
      const hasDeletedImages = deletedImageUrls && deletedImageUrls.length > 0;
      const hasNewImages = newImages && newImages.length > 0;
      
      let currentProgress = 0;
      let progressStep = 0;
      
      // Calculate progress steps based on operations to perform
      if (hasPropertyUpdates) progressStep += 10;
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const remainingProgress = 100 - progressStep;
      const deleteImagesProgressShare = hasDeletedImages ? 20 : 0;
      const addImagesProgressShare = hasNewImages ? 50 : 0;
      const generateDescriptionProgressShare = (hasDeletedImages || hasNewImages) ? 20 : 0;
      
      // Step 1: Update property MongoDB fields if changed
      if (hasPropertyUpdates) {
        if (updateProgress) {
          updateProgress(currentProgress, "Updating property details...");
        }
        
        // Update the property details (excluding images)
        await fetchWithAuth(`/api/properties/${propertyId}`, {
          method: 'PUT',
          body: JSON.stringify(propertyData)
        });
        
        currentProgress += progressStep;
        
        if (updateProgress) {
          updateProgress(currentProgress, "Property details updated");
        }
      }
      
      // Step 2: Delete removed images individually
      if (hasDeletedImages) {
        const progressPerDeletedImage = deleteImagesProgressShare / deletedImageUrls.length;
        
        for (let i = 0; i < deletedImageUrls.length; i++) {
          const imageUrl = deletedImageUrls[i];
          const imageNumber = i + 1;
          
          if (updateProgress) {
            updateProgress(
              currentProgress + (progressPerDeletedImage * i),
              `Removing image ${imageNumber} of ${deletedImageUrls.length}...`
            );
          }
          
          await removePropertyImage(propertyId, imageUrl);
          
          if (updateProgress) {
            updateProgress(
              currentProgress + (progressPerDeletedImage * (i + 1)),
              `Removed image ${imageNumber} of ${deletedImageUrls.length}`
            );
          }
        }
        
        currentProgress += deleteImagesProgressShare;
      }
      
      // Step 3: Add new images individually
      let imagesAdded = false;
      if (hasNewImages) {
        const progressPerNewImage = addImagesProgressShare / newImages.length;
        
        // Sort files to ensure PDFs are processed first
        const sortedImages = [...newImages].sort((a, b) => {
          const aIsPdf = a.name.toLowerCase().endsWith('.pdf');
          const bIsPdf = b.name.toLowerCase().endsWith('.pdf');
          if (aIsPdf && !bIsPdf) return -1;
          if (!aIsPdf && bIsPdf) return 1;
          return 0;
        });
        
        for (let i = 0; i < sortedImages.length; i++) {
          const file = sortedImages[i];
          const imageNumber = i + 1;
          
          if (updateProgress) {
            updateProgress(
              currentProgress + (progressPerNewImage * i),
              `Processing ${file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'image'} ${imageNumber} of ${sortedImages.length}...`
            );
          }
          
          await addPropertyImage(propertyId, file);
          
          if (updateProgress) {
            updateProgress(
              currentProgress + (progressPerNewImage * (i + 1)),
              `${file.name.toLowerCase().endsWith('.pdf') ? 'PDF' : 'Image'} ${imageNumber} of ${sortedImages.length} processed`
            );
          }
          
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          imagesAdded = true;
        }
        
        currentProgress += addImagesProgressShare;
      }
      
      // Step 4: Generate new description if images were added or deleted
      if (hasDeletedImages || hasNewImages) {
        if (updateProgress) {
          updateProgress(currentProgress, "Generating updated property description...");
        }
        
        await generatePropertyDescription(propertyId);
        
        currentProgress += generateDescriptionProgressShare;
        
        if (updateProgress) {
          updateProgress(100, "Property update complete!");
        }
      } else if (updateProgress) {
        updateProgress(100, "Property details updated!");
      }
      
      // Refresh the properties list
      await fetchProperties();
      
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to update property');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Generate property description
  const generatePropertyDescription = async (propertyId: string): Promise<boolean> => {
    try {
      await fetchWithAuth(`/api/properties/${propertyId}/description`, {
        method: 'POST'
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to generate property description');
      return false;
    }
  };
  
  // Upload and process a single image
  const addPropertyImage = async (propertyId: string, image: File): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('file', image);
      
      await fetchWithAuth(`/api/properties/${propertyId}/images`, {
        method: 'POST',
        headers: {}, // Let the browser set the content type with boundary
        body: formData
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to upload image');
      return false;
    }
  };
  
  // Remove an image
  const removePropertyImage = async (propertyId: string, imageUrl: string): Promise<boolean> => {
    try {
      await fetchWithAuth(`/api/properties/${propertyId}/images?image_url=${encodeURIComponent(imageUrl)}`, {
        method: 'DELETE'
      });
      return true;
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return false;
      }
      setError(err instanceof Error ? err.message : 'Failed to remove image');
      return false;
    }
  };
  
  // Check property generation status
  const checkPropertyStatus = async (propertyId: string): Promise<{ 
    status: string; 
    progress?: number; 
    message?: string;
  } | null> => {
    try {
      const response = await fetchWithAuth(`/api/properties/${propertyId}/analysis-status`);
      return await response.json();
    } catch (err) {
      if (err instanceof Error && err.message === 'Unauthorized') {
        handleAuthError();
        return null;
      }
      setError(err instanceof Error ? err.message : 'Failed to check property status');
      return null;
    }
  };
  
  // Load properties on mount
  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);
  
  return {
    properties,
    isLoading,
    error,
    setError,
    handleLogout,
    fetchProperties,
    deleteProperty,
    createProperty,
    updateProperty,
    generatePropertyDescription,
    addPropertyImage,
    removePropertyImage,
    checkPropertyStatus,
  };
} 