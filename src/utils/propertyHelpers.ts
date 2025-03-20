// API URL from environment
export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Property interfaces
export interface Property {
  _id: string;
  address: string;
  estimated_value: number;
  description?: string;
  images?: string[];
  analysis_status?: string;
  analysis_progress?: number;
  analysis_message?: string;
  key_info?: string;
}

export interface PropertyFormData {
  address: string;
  estimated_value: string;
  key_info: string;
}

// Convert string value with optional commas to number
export const parseValue = (value: string): number => {
  const cleanValue = value.replace(/,/g, '');
  const numValue = parseFloat(cleanValue);
  
  if (isNaN(numValue)) {
    throw new Error('Invalid number format');
  }
  
  return numValue;
};

// Image processing function
export const processImage = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Skip non-image files (like PDFs)
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }
    
    const reader = new FileReader();
    
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const img = document.createElement('img');
      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 3000;
        
        if (width > MAX_WIDTH) {
          height = Math.round(height * (MAX_WIDTH / width));
          width = MAX_WIDTH;
        }
        
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        // Fill with white background first (for transparent PNGs)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        
        // Then draw the image on top
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to JPEG
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create blob from image'));
            return;
          }
          
          // Create new file from blob
          const newFile = new File(
            [blob], 
            file.name.replace(/\.[^/.]+$/, ".jpg"), 
            { type: 'image/jpeg' }
          );
          
          resolve(newFile);
        }, 'image/jpeg', 0.95); // 95% quality JPEG
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = event.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
};

// Process multiple images
export const processImages = async (files: File[]): Promise<File[]> => {
  try {
    return await Promise.all(files.map(file => processImage(file)));
  } catch (err) {
    console.error('Error processing images:', err);
    throw new Error('Failed to process images');
  }
}; 