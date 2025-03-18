import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Property, PropertyFormData } from '@/utils/propertyHelpers';
import PropertyForm from './PropertyForm';

interface PropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  mode: 'create' | 'edit';
  property: Property | null;
  initialData: PropertyFormData;
  onSubmit: (formData: PropertyFormData, newImages: File[]) => Promise<void>;
  onDeleteImage?: (imageUrl: string) => void;
  isSubmitting: boolean;
  isAnalyzing: boolean;
  analysisProgress: string;
  progressPercentage: number;
  elapsedTime: number;
}

export default function PropertyModal({
  isOpen,
  onClose,
  title,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode,
  property,
  initialData,
  onSubmit,
  onDeleteImage,
  isSubmitting,
  isAnalyzing,
  analysisProgress,
  progressPercentage,
  elapsedTime
}: PropertyModalProps) {
  const [error, setError] = useState<string | null>(null);
  
  // Reset error when the modal is opened
  useEffect(() => {
    if (isOpen) {
      setError(null);
    }
  }, [isOpen]);
  
  // Simplified form submission handler
  const handleSubmit = async (formData: PropertyFormData, newImages: File[]) => {
    setError(null);
    
    try {
      await onSubmit(formData, newImages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while submitting the form');
    }
  };
  
  return (
    <>
      {/* Property Modal */}
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={isAnalyzing ? () => {} : onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-background-dark p-6 shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-secondary"
                  >
                    {title}
                  </Dialog.Title>
                  <button
                    type="button"
                    className={`absolute top-4 right-4 text-secondary hover:text-foreground ${isAnalyzing ? 'hidden' : ''}`}
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                  
                  <PropertyForm
                    initialData={initialData}
                    propertyImages={mode === 'edit' ? property?.images || [] : []}
                    onSubmit={handleSubmit}
                    onCancel={onClose}
                    onDeleteImage={onDeleteImage}
                    isSubmitting={isSubmitting}
                    isAnalyzing={isAnalyzing}
                    analysisProgress={analysisProgress}
                    progressPercentage={progressPercentage}
                    elapsedTime={{
                      minutes: Math.floor(elapsedTime / 60),
                      seconds: elapsedTime % 60
                    }}
                  />
                  
                  {error && (
                    <div className="mt-4 text-sm text-error">
                      {error}
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
      
      {/* Property Analysis Loading Overlay */}
      {isAnalyzing && (
        <div className="fixed inset-0 bg-background-dark bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-background-dark p-8 rounded-lg shadow-xl border border-neutral max-w-md w-full">
            <div className="flex flex-col items-center space-y-6">
              {/* Progress bar */}
              <div className="w-full">
                <div className="w-full bg-neutral rounded-full h-4 overflow-hidden">
                  <div 
                    className="bg-primary h-4 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${progressPercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-secondary">
                  <span>{progressPercentage.toFixed(0)}% Complete</span>
                  <span>
                    Time elapsed: {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
                  </span>
                </div>
              </div>
              
              <h3 className="text-xl font-medium text-secondary text-center">
                {analysisProgress}
              </h3>
              <p className="text-sm text-neutral text-center">
                This may take up to 10 minutes depending on the number of images. Please be patient while we analyze your property data and generate insights.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 