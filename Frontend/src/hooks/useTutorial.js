import { useCallback, useEffect, useRef, useState } from 'react';
import { getTutorialRunCount, incrementTutorialRunCount } from '../tutorials/tutorialConfig';

export function useTutorial({ tutorialType, userKey, maxRuns = 2, autoStart = true }) {
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const autoStartRef = useRef(false);

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTutorialOpen(true);
  }, []);

  const startAutoTutorial = useCallback(() => {
    incrementTutorialRunCount(tutorialType, userKey);
    setCurrentStepIndex(0);
    setIsTutorialOpen(true);
  }, [tutorialType, userKey]);

  const closeTutorial = useCallback(() => {
    setIsTutorialOpen(false);
  }, []);

  const nextStep = useCallback((totalSteps) => {
    setCurrentStepIndex((prev) => (totalSteps ? Math.min(prev + 1, totalSteps - 1) : prev + 1));
  }, []);

  const prevStep = useCallback(() => {
    setCurrentStepIndex((prev) => Math.max(prev - 1, 0));
  }, []);

  const handleStepChange = useCallback((data) => {
    const { index, action, type } = data;

    if (type === 'finished' || action === 'close' || action === 'skip') {
      closeTutorial();
      return;
    }

    if (action === 'next' || action === 'prev') {
      setCurrentStepIndex(index);
    }
  }, [closeTutorial]);

  useEffect(() => {
    if (!autoStart || autoStartRef.current) return;
    const runCount = getTutorialRunCount(tutorialType, userKey);
    if (runCount < maxRuns) {
      autoStartRef.current = true;
      startAutoTutorial();
    }
  }, [autoStart, maxRuns, startAutoTutorial, tutorialType, userKey]);

  return {
    isTutorialOpen,
    currentStepIndex,
    startTutorial,
    closeTutorial,
    handleStepChange,
    nextStep,
    prevStep,
  };
}
