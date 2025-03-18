"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/Sidebar";
import { ChatInterface } from "@/components/ChatInterface";

// Create a client component that uses useSearchParams
import { useSearchParams } from "next/navigation";

function HomeContent() {
  const [propertyAnalysis, setPropertyAnalysis] = useState<PropertyAnalysis | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();
  
  // Extract propertyId from URL parameters
  const propertyId = searchParams?.get('propertyId');
  
  // Debug log when propertyAnalysis changes
  useEffect(() => {
    console.log('HomeContent - propertyAnalysis updated:', propertyAnalysis);
  }, [propertyAnalysis]);

  // If no propertyId is provided and not already redirecting, redirect to properties page
  useEffect(() => {
    if (!propertyId && !propertyAnalysis) {
      // Check if we're on the home page without a property selected
      // Display a message or automatically redirect after a short delay
      const timer = setTimeout(() => {
        router.push('/properties');
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [propertyId, propertyAnalysis, router]);

  return (
    <div className="flex w-full h-screen bg-background">
      <Sidebar onAnalysisComplete={setPropertyAnalysis} />
      <main className="flex-1 overflow-hidden">
        {!propertyId && !propertyAnalysis ? (
          <div className="flex h-full items-center justify-center">
            <div className="text-center p-6 max-w-md">
              <h2 className="text-2xl font-bold text-primary mb-4">No Property Selected</h2>
              <p className="text-neutral mb-6">
                Please select a property to analyze or create a new one.
                Redirecting to property management...
              </p>
            </div>
          </div>
        ) : (
          <ChatInterface propertyAnalysis={propertyAnalysis || undefined} />
        )}
      </main>
    </div>
  );
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex w-full h-screen bg-background">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-6 max-w-md">
            <h2 className="text-2xl font-bold text-primary mb-4">Loading...</h2>
            <p className="text-neutral mb-6">
              Please wait while we load your property data.
            </p>
          </div>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
