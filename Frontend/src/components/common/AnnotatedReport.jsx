import { useCallback, useRef, useState } from 'react';
import EvaluationReport from './EvaluationReport';
import AnnotationPopover from './AnnotationPopover';

export default function AnnotatedReport({
    text,
    images = [],
    annotations = [],
    canAnnotate = false,
    onAddAnnotation,
    onDeleteAnnotation,
}) {
    const containerRef = useRef(null);
    const [popover, setPopover] = useState(null);

    const handleMouseUp = useCallback(() => {
        if (!canAnnotate) return;
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;
        const selectedText = selection.toString().trim();
        if (!selectedText || selectedText.length < 3) return;

        const range = selection.getRangeAt(0);
        const rect  = range.getBoundingClientRect();
        const container = containerRef.current;
        if (!container) return;

        let startOffset = 0;
        try {
            const preRange = document.createRange();
            preRange.setStart(container, 0);
            preRange.setEnd(range.startContainer, range.startOffset);
            startOffset = preRange.toString().length;
        } catch { return; }

        setPopover({
            x: rect.left + rect.width / 2 - 150,
            y: rect.bottom,
            selectedText,
            startOffset,
            endOffset: startOffset + selectedText.length,
        });
    }, [canAnnotate]);

    async function handleSaveAnnotation(comment) {
        if (!popover || !onAddAnnotation) return;
        await onAddAnnotation(popover.selectedText, comment, popover.startOffset, popover.endOffset);
        setPopover(null);
        window.getSelection()?.removeAllRanges();
    }

    function handleDismiss() {
        setPopover(null);
        window.getSelection()?.removeAllRanges();
    }

    return (
        <div style={{ position: 'relative' }}>
            {canAnnotate && (
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                    padding: '0.55rem 0.85rem', marginBottom: '0.75rem',
                    borderRadius: '8px',
                    background: 'color-mix(in srgb, var(--brand) 8%, var(--bg-surface))',
                    border: '1px solid color-mix(in srgb, var(--brand) 22%, var(--line-soft))',
                    fontSize: '0.82rem', color: 'var(--brand)', fontWeight: 600,
                }}>
                    <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '18px', height: '18px', borderRadius: '50%',
                        background: 'var(--brand)', color: '#fff',
                        fontSize: '0.7rem', fontWeight: 800, flexShrink: 0,
                    }}>i</span>
                    Select any text in the report below to add an annotation comment.
                </div>
            )}

            <div ref={containerRef} onMouseUp={handleMouseUp} style={{ userSelect: canAnnotate ? 'text' : undefined }}>
                <EvaluationReport
                    text={text}
                    images={images}
                    annotations={annotations}
                    canDelete={canAnnotate}
                    onDeleteAnnotation={onDeleteAnnotation}
                />
            </div>

            {popover && (
                <AnnotationPopover
                    position={{ x: popover.x, y: popover.y }}
                    selectedText={popover.selectedText}
                    onSave={handleSaveAnnotation}
                    onDismiss={handleDismiss}
                />
            )}
        </div>
    );
}