import React from 'react';
import { PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Property } from '@/utils/propertyHelpers';

interface PropertyCardProps {
  property: Property;
  onSelect: (property: Property) => void;
  onEdit: (property: Property) => void;
  onDelete: (property: Property) => void;
  onOpenChat: (property: Property) => void;
  isSelected: boolean;
}

export default function PropertyCard({
  property,
  onSelect,
  onEdit,
  onDelete,
  onOpenChat,
  isSelected
}: PropertyCardProps) {
  return (
    <div 
      className={`bg-card border ${isSelected ? 'border-primary' : 'border-secondary-dark'} shadow overflow-hidden sm:rounded-lg hover:shadow-lg transition-shadow duration-200 cursor-pointer`}
      onClick={() => onSelect(property)}
    >
      <div className="p-4">
        <h3 className="text-lg leading-6 font-medium text-primary-dark truncate">
          {property.address}
        </h3>
        <p className="mt-2 text-sm text-primary-dark">
          Estimated Value: £{property.estimated_value.toLocaleString()}
        </p>
        
        <div className="mt-5 flex space-x-3">
          {/* Analyze property button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenChat(property);
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-background bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Open Chat
          </button>
        
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(property);
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-primary hover:border-primary-dark shadow-sm text-sm leading-4 font-medium rounded-md text-primary hover:text-background bg-card hover:bg-neutral-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          >
            <PencilSquareIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
            Edit
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(property);
            }}
            className="flex-1 inline-flex items-center justify-center px-3 py-2 border border-primary hover:border-primary-dark shadow-sm text-sm leading-4 font-medium rounded-md text-primary hover:text-background bg-card hover:bg-neutral-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary"
          >
            <TrashIcon className="-ml-0.5 mr-2 h-4 w-4" aria-hidden="true" />
            Delete
          </button>
        </div>
      </div>
    </div>
  );
} 