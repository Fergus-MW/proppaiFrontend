import React from 'react';
import Image from 'next/image';
import { ClipboardDocumentIcon, PhotoIcon } from "@heroicons/react/24/outline";
import { Property } from '@/utils/propertyHelpers';

interface PropertyDetailsProps {
  property: Property | null;
}

// Helper to check if a URL is for a PDF
const isPdf = (url: string) => {
  return url.toLowerCase().endsWith('.pdf');
};

const PropertyDetails: React.FC<PropertyDetailsProps> = ({ property }) => {
  if (!property) {
    return (
      <div className="text-center p-10">
        <PhotoIcon className="h-16 w-16 text-neutral mx-auto" />
        <h3 className="mt-4 text-lg font-medium text-primary-dark">No Property Selected</h3>
        <p className="mt-2 text-neutral">Select a property from the list to view details</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-primary-dark mb-4">{property.address}</h2>
      
      <div className="mb-6">
        <p className="text-primary-dark mb-2">
          <span className="font-medium">Estimated Value:</span> £{property.estimated_value.toLocaleString()}
        </p>
        
        {property.description && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold text-primary-dark">Description</h3>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(property.description || "");
                  // Optional: Add notification or feedback that text was copied
                  alert("Description copied to clipboard!");
                }}
                className="inline-flex items-center px-2 py-1 text-sm border border-primary rounded-md text-primary hover:bg-primary-dark hover:text-background focus:outline-none"
                title="Copy description to clipboard"
              >
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                Copy
              </button>
            </div>
            <p className="text-primary-dark whitespace-pre-wrap">{property.description}</p>
          </div>
        )}
      </div>
      
      {/* Property images */}
      <div className="mt-6">
        {property.images && property.images.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {property.images.map((imageUrl, index) => (
              <div key={index} className="relative rounded-lg overflow-hidden h-48">
                {isPdf(imageUrl) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-100">
                    <div className="text-center">
                      <svg className="mx-auto h-12 w-12 text-neutral" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm mt-2 block text-primary hover:underline"
                      >
                        View PDF
                      </a>
                    </div>
                  </div>
                ) : (
                  <Image
                    src={imageUrl}
                    alt={`Property image ${index + 1}`}
                    fill
                    className="object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center p-6 bg-background-dark rounded-lg border border-dashed border-neutral">
            <PhotoIcon className="h-12 w-12 text-neutral mx-auto" />
            <p className="mt-2 text-sm text-neutral">No images available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyDetails; 