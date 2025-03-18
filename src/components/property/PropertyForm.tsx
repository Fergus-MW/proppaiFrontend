import React, { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { PropertyFormData, processImage } from '@/utils/propertyHelpers';
import Image from 'next/image';

interface PropertyFormProps {
  initialData: PropertyFormData;
  propertyImages?: string[];
  onSubmit: (formData: PropertyFormData, newImages: File[]) => void;
  onCancel: () => void;
  onDeleteImage?: (imageUrl: string) => void;
  isSubmitting: boolean;
  isAnalyzing: boolean;
  analysisProgress: string;
  progressPercentage: number;
  elapsedTime: { minutes: number; seconds: number };
}

const PropertyForm: React.FC<PropertyFormProps> = ({
  initialData,
  propertyImages = [],
  onSubmit,
  onCancel,
  onDeleteImage,
  isSubmitting,
  isAnalyzing,
  analysisProgress,
  progressPercentage,
  elapsedTime
}) => {
  const [formData, setFormData] = useState<PropertyFormData>(initialData);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(Array.from(e.target.files));
    }
  };

  // Process files (used for both upload and drop)
  const processFiles = (files: File[]) => {
    // Check file sizes
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    const MAX_TOTAL_SIZE = 300 * 1024 * 1024; // 300MB total limit
    
    if (totalSize > MAX_TOTAL_SIZE) {
      setError(`Total file size exceeds 300MB. Please reduce the number or size of images.`);
      return;
    }
    
    // Process each image before adding to state
    Promise.all(
      files.map(file => processImage(file))
    ).then(processedFiles => {
      setNewImages(prev => [...prev, ...processedFiles]);
    }).catch(err => {
      setError(`Error processing images: ${err.message}`);
    });
  };

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Parse the estimated value by removing commas and converting to a float
    const cleanValue = formData.estimated_value.replace(/,/g, '');
    const estimatedValue = parseFloat(cleanValue);
    
    // Validate estimated value
    if (isNaN(estimatedValue)) {
      setError('Please enter a valid estimated value');
      return;
    }
    
    // Check that at least 8 images are present (combining existing and new images)
    const totalImageCount = propertyImages.length + newImages.length;
    if (totalImageCount < 8) {
      setError(`Please upload at least 8 images (currently have ${totalImageCount})`);
      return;
    }
    
    // Submit the form data and images
    onSubmit(formData, newImages);
  };

  // Remove a new image
  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
    // Manually clean up the URL object we're removing
    if (newImageUrls[index]) {
      URL.revokeObjectURL(newImageUrls[index]);
    }
    setNewImageUrls(prev => prev.filter((_, i) => i !== index));
  };

  // Generate image URLs for preview
  useEffect(() => {
    if (newImages.length === 0) {
      // Clean up any existing URLs before clearing
      newImageUrls.forEach(url => URL.revokeObjectURL(url));
      setNewImageUrls([]);
      return;
    }
    
    const urls = newImages.map(image => URL.createObjectURL(image));
    setNewImageUrls(urls);
    
    // Clean up URLs on unmount
    return () => {
      urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newImages]);

  // Helper to check if file is a PDF
  const isPdf = (filename: string) => {
    return filename.toLowerCase().endsWith('.pdf');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="mb-4 bg-error-light border border-error text-error px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {/* Form fields */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-neutral">
          Property Address
        </label>
        <input
          type="text"
          name="address"
          id="address"
          required
          value={formData.address}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 text-primary-dark"
          placeholder="123 Main St, London"
          disabled={isSubmitting || isAnalyzing}
        />
      </div>
      
      <div>
        <label htmlFor="estimated_value" className="block text-sm font-medium text-neutral">
          Estimated Value (£)
        </label>
        <input
          type="text"
          name="estimated_value"
          id="estimated_value"
          required
          value={formData.estimated_value}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 text-primary-dark"
          placeholder="500000"
          disabled={isSubmitting || isAnalyzing}
        />
      </div>
      
      <div>
        <label htmlFor="key_info" className="block text-sm font-medium text-neutral">
          Unique Selling Points
        </label>
        <input
          type="text"
          name="key_info"
          id="key_info"
          value={formData.key_info || ''}
          onChange={handleInputChange}
          className="mt-1 block w-full rounded-md border-secondary shadow-sm focus:border-primary focus:ring-primary sm:text-sm p-2 text-primary-dark"
          placeholder="South facing garden, renovated 2024, planning permission..."
          disabled={isSubmitting || isAnalyzing}
        />
      </div>
      
      {/* Image upload section */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          Property Images
        </label>
        
        {/* Existing property images */}
        {propertyImages && propertyImages.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Existing Images</h4>
            <div className="grid grid-cols-3 gap-3">
              {propertyImages.map((imageUrl, index) => (
                <div key={index} className="relative h-24 rounded-md overflow-hidden">
                  <Image
                    src={imageUrl}
                    alt={`Existing property image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                  {onDeleteImage && (
                    <button
                      type="button"
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white hover:bg-red-600 focus:outline-none"
                      onClick={() => onDeleteImage(imageUrl)}
                      disabled={isSubmitting || isAnalyzing}
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* New images upload with drag and drop */}
        <div className="mt-2">
          <label
            htmlFor="image-upload"
            className={`cursor-pointer relative block w-full rounded-lg border-2 border-dashed ${isDragging ? 'border-primary bg-primary/5' : 'border-neutral'} p-12 text-center hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${isSubmitting || isAnalyzing ? 'opacity-50 pointer-events-none' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <PhotoIcon className="mx-auto h-12 w-12 text-neutral" />
            <span className="mt-2 block text-sm font-medium text-neutral">
              {isDragging 
                ? 'Drop files here' 
                : newImageUrls.length > 0 
                  ? 'Add more images or PDFs' 
                  : 'Upload property images or PDFs'}
            </span>
            <div className={`mt-1 mx-auto inline-block px-2 py-1 rounded text-xs font-medium ${(propertyImages.length + newImages.length) >= 8 ? 'bg-neutral text-error' : 'bg-error-light text-error'}`}>
              Minimum 8 images required - Current: {propertyImages.length + newImages.length}
            </div>
            <p className="mt-1 text-xs text-neutral">
              Supported formats: JPG, JPEG, PNG, WEBP, PDF (max 10MB per file)
            </p>
            <p className="mt-3 text-s text-neutral">
              Include all Floorplans for best results
            </p>
            <input
              id="image-upload"
              name="images"
              type="file"
              className="sr-only"
              accept="image/*,.pdf"
              multiple
              onChange={handleImageUpload}
              disabled={isSubmitting || isAnalyzing}
            />
          </label>
        </div>
        
        {/* Preview of uploaded images */}
        {newImageUrls.length > 0 && (
          <div className="mt-4">
            <div className="grid grid-cols-3 gap-3">
              {newImages.map((image, index) => (
                <div key={index} className="relative h-24 rounded-md overflow-hidden">
                  {isPdf(image.name) ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <svg className="mx-auto h-8 w-8 text-neutral" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-xs mt-1 block">{image.name}</span>
                      </div>
                    </div>
                  ) : (
                    <Image
                      src={newImageUrls[index]}
                      alt={`New property image ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  <button
                    type="button"
                    className="absolute top-1 right-1 p-1 rounded-full bg-primary text-white hover:bg-success focus:outline-none"
                    onClick={() => removeNewImage(index)}
                    disabled={isSubmitting || isAnalyzing}
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Progress and analysis section */}
      {isAnalyzing && (
        <div>
          <div className="flex justify-between mb-2">
            <div className="text-sm font-medium text-primary-dark">{analysisProgress}</div>
            <div className="text-sm text-neutral">
              {elapsedTime.minutes}:{elapsedTime.seconds < 10 ? `0${elapsedTime.seconds}` : elapsedTime.seconds}
            </div>
          </div>
          <div className="w-full bg-background-dark rounded-full h-2.5">
            <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
          </div>
        </div>
      )}
      
      {/* Form buttons */}
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3">
        <button
          type="button"
          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-primary hover:border-success shadow-sm text-sm leading-4 font-medium rounded-md text-primary hover:text-background bg-card hover:bg-neutral-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          onClick={onCancel}
          disabled={isSubmitting || isAnalyzing}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-background bg-primary hover:bg-success focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary disabled:opacity-50"
          disabled={isSubmitting || isAnalyzing}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

export default PropertyForm; 