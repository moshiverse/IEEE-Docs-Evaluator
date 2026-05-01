import { useEffect, useMemo, useRef, useState } from 'react';
import '../../styles/components/tutorial.css';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTargetRect(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function TutorialOverlay({
  steps = [],
  run = false,
  stepIndex = 0,
  onNext,
  onPrev,
  onClose,
}) {
  const [targetRect, setTargetRect] = useState(null);
  const lastKnownRectRef = useRef(null);

  useEffect(() => {
    if (!run) return;

    const updateRect = () => {
      const rect = getTargetRect(steps[stepIndex]?.target);
      if (rect) {
        lastKnownRectRef.current = rect;
        setTargetRect(rect);
      } else {
        setTargetRect(null);
      }
    };

    const raf = requestAnimationFrame(updateRect);
    const interval = setInterval(updateRect, 200);
    window.addEventListener('resize', updateRect);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(interval);
      window.removeEventListener('resize', updateRect);
    };
  }, [run, stepIndex, steps]);

  const step = steps[stepIndex];
  const hasPrev = stepIndex > 0;
  const hasNext = stepIndex < steps.length - 1;

  const tooltipStyle = useMemo(() => {
    const padding = 16;
    const width = 320;
    const maxLeft = window.innerWidth - width - padding;

    const rect = targetRect || lastKnownRectRef.current;

    if (step?.center) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    if (!rect) {
      return { top: '12%', left: '50%', transform: 'translateX(-50%)' };
    }

    const left = clamp(rect.left, padding, maxLeft);
    const tooltipHeight = 220;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    let top = rect.bottom + padding;
    if (spaceBelow < tooltipHeight && spaceAbove > tooltipHeight) {
      top = rect.top - tooltipHeight - padding;
    }

    const maxTop = window.innerHeight - tooltipHeight - padding;
    top = clamp(top, padding, maxTop);

    return { top, left };
  }, [targetRect, step]);

  if (!run || !step) return null;

  return (
    <div className="tutorial-overlay" role="dialog" aria-modal="true" onClick={hasNext ? onNext : onClose}>
      {(step.center || !targetRect) && <div className="tutorial-overlay__backdrop" />}

      {targetRect && !step.center && (
        <div
          className="tutorial-spotlight"
          style={{
            top: targetRect.top - 6,
            left: targetRect.left - 6,
            width: targetRect.width + 12,
            height: targetRect.height + 12,
          }}
        />
      )}

      <div
        className={`tutorial-tooltip${step.center ? ' tutorial-tooltip--center' : ''}`}
        style={tooltipStyle}
        onClick={(event) => {
          event.stopPropagation();
          if (hasNext) onNext();
          else onClose();
        }}
      >
        <div className="tutorial-tooltip__header">
          <span className="tutorial-tooltip__step">Step {stepIndex + 1} of {steps.length}</span>
          <button type="button" className="tutorial-tooltip__close" onClick={onClose} aria-label="Close tutorial">
            ×
          </button>
        </div>
        <div className="tutorial-tooltip__content">{step.content}</div>
        {stepIndex !== 0 && (
          <div className="tutorial-tooltip__hint">Tap anywhere to continue</div>
        )}
        <div className="tutorial-tooltip__actions">
          {hasPrev && (
            <button
              type="button"
              className="btn"
              onClick={(event) => {
                event.stopPropagation();
                onPrev();
              }}
            >
              Back
            </button>
          )}
          <div className="tutorial-tooltip__spacer" />
          <button
            type="button"
            className="btn btn--ghost"
            onClick={(event) => {
              event.stopPropagation();
              onClose();
            }}
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}

export default TutorialOverlay;
