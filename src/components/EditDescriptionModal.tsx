import { useState, useEffect, useRef } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

// Add loading spinner component
function LoadingSpinner() {
  return (
    <div className="animate-spin rounded-full h-5 w-5 border-2 border-secondary border-t-transparent" />
  );
}

interface EditDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  onSave: (text: string) => void;
  isLoading: boolean;
}

export function EditDescriptionModal({ 
  isOpen, 
  onClose, 
  description, 
  onSave, 
  isLoading
}: EditDescriptionModalProps) {
  const [text, setText] = useState(description);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Update text state when description prop changes
  useEffect(() => {
    setText(description);
  }, [description]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-background-dark rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-neutral">
          <h2 className="text-foreground-light text-lg font-medium">Edit Description</h2>
          <button 
            onClick={onClose}
            className="text-neutral hover:text-primary-dark"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-hidden">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full h-[60vh] bg-background p-3 text-background-dark rounded-md text-foreground-light resize-none focus:outline-none focus:border-primary"
          />
        </div>
        <div className="p-4 flex justify-end">
          <button
            onClick={() => onClose()}
            className="py-2 px-4 border border-primary rounded-md text-foreground-light hover:bg-secondary hover:text-primary-dark hover:border-secondary transition-colors mr-2"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(text)}
            disabled={isLoading}
            className="py-2 px-4 border border-primary rounded-md bg-primary text-foreground-light hover:bg-secondary hover:text-primary-dark hover:border-secondary transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? <LoadingSpinner /> : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
} 