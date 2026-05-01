import { useCallback, useEffect, useRef, useState } from 'react';

export default function AnnotationBubble({ index, annotation, canDelete = false, onDelete }) {
    const [open, setOpen]     = useState(false);
    const [pos, setPos]       = useState({ top: 0, left: 0 });
    const bubbleRef           = useRef(null);
    const popoverRef          = useRef(null);

    // Recompute popover position when opened
    function handleToggle(e) {
        e.stopPropagation();
        if (!open && bubbleRef.current) {
            const rect = bubbleRef.current.getBoundingClientRect();
            setPos({
                top:  Math.min(rect.bottom + 8, window.innerHeight - 240),
                left: Math.min(rect.left - 8,   window.innerWidth  - 300),
            });
        }
        setOpen((p) => !p);
    }

    function updatePosition() {
        if (!bubbleRef.current) return;
        const rect = bubbleRef.current.getBoundingClientRect();
        setPos({
            top:  Math.min(rect.bottom + 8, window.innerHeight - 240),
            left: Math.min(rect.left - 8,   window.innerWidth  - 300),
        });
    }

    // Close on outside click or Escape
    useEffect(() => {
        if (!open) return;
        updatePosition();

        function onKey(e)  { if (e.key === 'Escape') setOpen(false); }
        function onDown(e) {
            if (
                bubbleRef.current  && !bubbleRef.current.contains(e.target) &&
                popoverRef.current && !popoverRef.current.contains(e.target)
            ) setOpen(false);
        }
        function onScroll() { updatePosition(); }
        function onResize() { updatePosition(); }
        document.addEventListener('keydown', onKey);
        document.addEventListener('mousedown', onDown);
        window.addEventListener('scroll', onScroll, true);
        window.addEventListener('resize', onResize);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.removeEventListener('mousedown', onDown);
            window.removeEventListener('scroll', onScroll, true);
            window.removeEventListener('resize', onResize);
        };
    }, [open]);

    const handleDelete = useCallback(() => {
        onDelete?.(annotation.id);
        setOpen(false);
    }, [annotation.id, onDelete]);

    return (
        <span style={{ position: 'relative', display: 'inline' }}>
            {/* ── Bubble ── */}
            <button
                ref={bubbleRef}
                onClick={handleToggle}
                style={{
                    display:        'inline-flex',
                    alignItems:     'center',
                    justifyContent: 'center',
                    width:          '16px',
                    height:         '16px',
                    borderRadius:   '50%',
                    background:     open ? '#d97706' : '#f59e0b',
                    color:          '#fff',
                    fontSize:       '0.6rem',
                    fontWeight:     800,
                    border:         'none',
                    cursor:         'pointer',
                    verticalAlign:  'super',
                    lineHeight:     1,
                    marginLeft:     '2px',
                    flexShrink:     0,
                    transition:     'background 0.15s, transform 0.15s',
                    transform:      open ? 'scale(1.15)' : 'scale(1)',
                    boxShadow:      open ? '0 0 0 3px rgba(245,158,11,0.25)' : 'none',
                }}
                title={`Annotation ${index}`}
                aria-label={`Annotation ${index}: ${annotation.comment}`}
            >
                {index}
            </button>

            {/* ── Popover — fixed so it always renders above the modal ── */}
            {open && (
                <span
                    ref={popoverRef}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        position:      'fixed',
                        top:           pos.top,
                        left:          pos.left,
                        zIndex:        99999,
                        width:         '280px',
                        background:    'var(--bg-surface)',
                        border:        '1px solid color-mix(in srgb, #f59e0b 40%, var(--line-soft))',
                        borderRadius:  '10px',
                        boxShadow:     '0 8px 28px rgba(0,0,0,0.22)',
                        padding:       '0.75rem',
                        display:       'flex',
                        flexDirection: 'column',
                        gap:           '0.5rem',
                    }}
                >
                    {/* Header */}
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#d97706' }}>
                            Annotation {index}
                        </span>
                        <span style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            {canDelete && (
                                <button onClick={handleDelete} style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                                    Delete
                                </button>
                            )}
                            <button onClick={() => setOpen(false)} style={{ border: 'none', background: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0 2px' }}>
                                ×
                            </button>
                        </span>
                    </span>

                    {/* Quoted text */}
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontStyle: 'italic', lineHeight: 1.45, borderLeft: '2px solid #f59e0b', paddingLeft: '0.45rem', display: 'block' }}>
                        "{annotation.selectedText.length > 80 ? annotation.selectedText.slice(0, 80) + '…' : annotation.selectedText}"
                    </span>

                    {/* Comment */}
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: 1.55, whiteSpace: 'pre-wrap', display: 'block' }}>
                        {annotation.comment}
                    </span>
                </span>
            )}
        </span>
    );
}