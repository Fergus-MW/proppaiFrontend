"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { PlusIcon, XMarkIcon } from "@heroicons/react/24/outline";

// Import custom hooks
import { useProperties } from "@/hooks/useProperties";
import { usePropertyAnalysis } from "@/hooks/usePropertyAnalysis";

// Import components
import PropertyCard from "@/components/property/PropertyCard";
import PropertyDetails from "@/components/property/PropertyDetails";
import PropertyModal from "@/components/property/PropertyModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

// Import types
import { Property, PropertyFormData } from "@/utils/propertyHelpers";

export default function PropertiesPage() {
  const router = useRouter();
  
  // Use our custom hooks
  const {
    properties,
    isLoading,
    error,
    setError,
    handleLogout,
    deleteProperty,
    createProperty,
    updateProperty,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    generatePropertyDescription,
  } = useProperties();
  
  const {
    isAnalyzing,
    progress: progressPercentage,
    message: analysisProgress,
    elapsedTime,
    resetAnalysis,
    startAnalysis,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    startPolling,
    updateProgress
  } = usePropertyAnalysis();
  
  // Local state
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<PropertyFormData>({
    address: '',
    estimated_value: '',
    key_info: ''
  });
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
  const [deletedImageUrls, setDeletedImageUrls] = useState<string[]>([]);
  
  // Modal handlers
  const openCreateModal = () => {
    setFormData({
      address: '',
      estimated_value: '',
      key_info: ''
    });
    setSelectedProperty(null);
    setModalMode('create');
    setIsModalOpen(true);
    resetAnalysis();
  };
  
  const openEditModal = (property: Property) => {
    setSelectedProperty(property);
    setFormData({
      address: property.address,
      estimated_value: property.estimated_value.toString(),
      key_info: property.key_info || ''
    });
    setModalMode('edit');
    setIsModalOpen(true);
    resetAnalysis();
    setDeletedImageUrls([]);
  };
  
  const closeModal = () => {
    if (isAnalyzing) return; // Prevent closing while analyzing
    setIsModalOpen(false);
    setSelectedProperty(null);
    resetAnalysis();
  };
  
  // Details modal handlers
  const openDetailsModal = (property: Property) => {
    setSelectedProperty(property);
    setIsDetailsModalOpen(true);
  };
  
  const closeDetailsModal = () => {
    setIsDetailsModalOpen(false);
  };
  
  // Delete handlers
  const openDeleteConfirm = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteConfirmOpen(true);
  };
  
  const closeDeleteConfirm = () => {
    setDeleteConfirmOpen(false);
    setPropertyToDelete(null);
  };
  
  const handleDeleteProperty = async () => {
    if (!propertyToDelete) return;
    
    const success = await deleteProperty(propertyToDelete._id);
    
    if (success) {
      // If the deleted property was selected, clear the selection
      if (selectedProperty && selectedProperty._id === propertyToDelete._id) {
        setSelectedProperty(null);
        setIsDetailsModalOpen(false);
      }
    }
    
      closeDeleteConfirm();
  };
  
  // Property selection
  const selectProperty = (property: Property) => {
    setSelectedProperty(property);
    // Only open the modal on mobile screens
    if (window.innerWidth < 768) {
      setIsDetailsModalOpen(true);
    }
  };
  
  // Navigation
  const goToPropertyAnalysis = (property: Property) => {
    router.push(`/?propertyId=${property._id}`);
  };
  
  // Function to handle image deletion
  const handleDeleteImage = (imageUrl: string) => {
    if (selectedProperty) {
      // Track the deleted image URL
      setDeletedImageUrls(prev => [...prev, imageUrl]);
      
      // Update the selected property to visually remove the image
      setSelectedProperty(prev => {
        if (!prev) return null;
        return {
          ...prev,
          images: prev.images ? prev.images.filter(img => img !== imageUrl) : []
        };
      });
    }
  };
  
  // Form submission
  const handleSubmitProperty = async (formData: PropertyFormData, newImages: File[]) => {
    setError(null);
    
    // Parse estimated value
    const cleanValue = formData.estimated_value.replace(/,/g, '');
    const estimatedValue = parseFloat(cleanValue);
    
    if (isNaN(estimatedValue)) {
      setError('Please enter a valid estimated value');
      return;
    }
    
    // Double-check the 8 image minimum requirement
    if (modalMode === 'create' && newImages.length < 8) {
      setError('Please upload at least 8 images for your property');
      return;
    }
    
    if (modalMode === 'edit' && selectedProperty) {
      const currentImages = selectedProperty.images || [];
      const remainingImages = currentImages.filter(img => !deletedImageUrls.includes(img));
      const totalImages = remainingImages.length + newImages.length;
      
      if (totalImages < 8) {
        setError(`Please ensure you have at least 8 images (currently have ${totalImages})`);
        return;
      }
    }
      
    const propertyData = {
      address: formData.address,
      estimated_value: estimatedValue,
      key_info: formData.key_info || ''
    };
    
    try {
      // Handle create mode
      if (modalMode === 'create') {
        // Start the analysis process if there are images
        if (newImages.length > 0) {
          startAnalysis();
          
          // Create the property with progress updates
          const propertyId = await createProperty(
            propertyData, 
            newImages, 
            (progress, message) => updateProgress(progress, message)
          );
          
          if (propertyId) {
            // Processing is complete, close the modal
            closeModal();
            
            // Navigate to the property detail page
            router.push(`/?propertyId=${propertyId}`);
          } else {
            setError('Failed to create property');
          }
        } else {
          // Just create the property without analysis
          const propertyId = await createProperty(propertyData);
          if (propertyId) {
            closeModal();
          }
        }
      } 
      // Handle edit mode
      else if (modalMode === 'edit' && selectedProperty) {
        // Start the analysis process if there are images or deleted images
        if (newImages.length > 0 || deletedImageUrls.length > 0) {
          startAnalysis();
          
          // Update the property with progress updates
          const updateSuccess = await updateProperty(
            selectedProperty._id,
            propertyData,
            newImages,
            (progress, message) => updateProgress(progress, message),
            deletedImageUrls
          );
          
          if (updateSuccess) {
            // Processing is complete, close the modal
            closeModal();
            
            // Navigate to the property detail page
            router.push(`/?propertyId=${selectedProperty._id}&refresh=${Date.now()}`);
          }
        } else {
          // Just update the property without analysis
          const updateSuccess = await updateProperty(
            selectedProperty._id,
            propertyData
          );
          
          if (updateSuccess) {
            closeModal();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing your request');
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Header section with logo and buttons */}
        <div className="flex justify-between items-center mb-8 border-b border-neutral pb-4">
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
              className="inline-flex items-center px-2 py-1 sm:px-4 sm:py-2 border border-transparent rounded-md shadow-sm text-xs sm:text-sm font-medium text-background bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              onClick={openCreateModal}
            >
              <PlusIcon className="-ml-1 mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
              Add Property
            </button>
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-1 py-1 sm:px-4 sm:py-2 border border-primary hover:border-primary-dark rounded-md text-xs sm:text-sm text-primary hover:bg-primary-dark hover:text-background focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 bg-error-light border border-error text-error px-4 py-3 rounded relative">
            {error}
          </div>
        )}
        
        {isLoading && !properties.length ? (
          <div className="text-center py-10">
            <svg className="mx-auto h-12 w-12 text-neutral animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-2 text-sm text-primary-dark">Loading properties...</p>
          </div>
        ) : !properties.length ? (
          <div className="bg-card shadow overflow-hidden sm:rounded-md p-6 text-center">
            <p className="text-primary-dark">No properties found. Add your first property to get started.</p>
          </div>
        ) : (
          <div className="md:grid md:grid-cols-2 md:gap-6 relative">
            {/* Property tiles - full screen on mobile, left column on desktop */}
            <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-180px)] overflow-y-auto pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {properties.map((property) => (
                  <PropertyCard
                    key={property._id} 
                    property={property}
                    onSelect={selectProperty}
                    onEdit={openEditModal}
                    onDelete={openDeleteConfirm}
                    onOpenChat={goToPropertyAnalysis}
                    isSelected={selectedProperty?._id === property._id}
                  />
                ))}
              </div>
            </div>
            
            {/* Right column - Selected property details (desktop only) */}
            <div className="hidden md:block h-[calc(100vh-180px)] bg-card rounded-lg p-6 overflow-y-auto" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <style jsx>{`
                div::-webkit-scrollbar {
                  display: none;
                }
              `}</style>
              <PropertyDetails property={selectedProperty} />
            </div>
          </div>
        )}
        
        {/* Property Modal (Create/Edit) */}
        <PropertyModal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={modalMode === 'create' ? 'Add New Property' : 'Edit Property'}
          mode={modalMode}
          property={selectedProperty}
          initialData={formData}
          onSubmit={handleSubmitProperty}
          onDeleteImage={handleDeleteImage}
          isSubmitting={isLoading}
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          progressPercentage={progressPercentage}
          elapsedTime={elapsedTime}
        />
        
        {/* Property Details Modal (mobile only) */}
        {isDetailsModalOpen && selectedProperty && (
          <div className="md:hidden fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 transition-opacity" aria-hidden="true">
                <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
              </div>
              
              <div className="inline-block align-bottom bg-card rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                <div className="bg-card px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="text-center sm:mt-0 sm:text-left w-full">
                      <div className="flex justify-between items-center">
                        <button
                          type="button"
                          className="bg-primary hover:bg-primary-dark rounded-md p-1 text-background hover:text-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                          onClick={closeDetailsModal}
                        >
                          <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                        </button>
                      </div>
                      <div className="max-h-[85vh] overflow-y-auto pr-2" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                        <style jsx>{`
                          div::-webkit-scrollbar {
                            display: none;
                          }
                        `}</style>
                        <PropertyDetails property={selectedProperty} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          isOpen={deleteConfirmOpen}
          onClose={closeDeleteConfirm}
          onConfirm={handleDeleteProperty}
          title="Delete Property"
          message={`Are you sure you want to delete "${propertyToDelete?.address}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          isLoading={isLoading}
        />
      </div>
    </div>
  );
} 