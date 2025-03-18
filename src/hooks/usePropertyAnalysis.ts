import { useState, useEffect } from 'react';
import { pollAnalysisStatus } from '@/utils/apiUtils';
import { getCookie } from '@/utils/cookies';

interface AnalysisState {
  isAnalyzing: boolean;
  progress: number;
  message: string;
  startTime: number | null;
  elapsedTime: number;
  error: string | null;
}

export function usePropertyAnalysis() {
  const [analysisState, setAnalysisState] = useState<AnalysisState>({
    isAnalyzing: false,
    progress: 0,
    message: '',
    startTime: null,
    elapsedTime: 0,
    error: null
  });

  // Reset analysis state
  const resetAnalysis = () => {
    setAnalysisState({
      isAnalyzing: false,
      progress: 0,
      message: '',
      startTime: null,
      elapsedTime: 0,
      error: null
    });
  };

  // Start analysis
  const startAnalysis = () => {
    setAnalysisState({
      isAnalyzing: true,
      progress: 0,
      message: 'Starting analysis...',
      startTime: Date.now(),
      elapsedTime: 0,
      error: null
    });
  };

  // Update progress
  const updateProgress = (progress: number, message: string) => {
    setAnalysisState(prev => ({
      ...prev,
      progress,
      message
    }));
  };

  // Handle analysis error
  const handleAnalysisError = (error: string) => {
    setAnalysisState(prev => ({
      ...prev,
      error,
      // Keep isAnalyzing true so we still show the error in the analysis UI
      // isAnalyzing: false 
    }));
  };

  // Complete analysis
  const completeAnalysis = () => {
    setAnalysisState(prev => ({
      ...prev,
      isAnalyzing: false,
      progress: 100,
      message: 'Analysis complete',
    }));
  };

  // Start polling for analysis status
  const startPolling = async (propertyId: string, onComplete?: () => void) => {
    const token = getCookie('token');
    if (!token) {
      handleAnalysisError('No authentication token found');
      return;
    }

    try {
      await pollAnalysisStatus(
        propertyId,
        token,
        (statusData) => {
          updateProgress(statusData.progress || 0, statusData.message || '');
          
          // If analysis is completed, call the onComplete callback
          if (statusData.status === 'completed' && onComplete) {
            completeAnalysis();
            onComplete();
          }
          
          // Handle failed status
          if (statusData.status === 'failed') {
            handleAnalysisError(statusData.message || 'Analysis failed');
          }
        }
      );
    } catch (error) {
      handleAnalysisError(error instanceof Error ? error.message : 'Error during analysis');
    }
  };

  // Timer to update elapsed time during analysis
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (analysisState.isAnalyzing && analysisState.startTime) {
      timer = setInterval(() => {
        setAnalysisState(prev => ({
          ...prev,
          elapsedTime: Math.floor((Date.now() - (prev.startTime || 0)) / 1000)
        }));
      }, 1000);
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [analysisState.isAnalyzing, analysisState.startTime]);

  return {
    ...analysisState,
    resetAnalysis,
    startAnalysis,
    updateProgress,
    handleAnalysisError,
    completeAnalysis,
    startPolling
  };
} 