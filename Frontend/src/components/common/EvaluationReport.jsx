/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import AnnotationBubble from './AnnotationBubble';

// ---------------------------------------------------------------------------
// Annotation injection
// ---------------------------------------------------------------------------

/**
 * Injects annotation marker tokens into the raw evaluation text.
 * Each annotation's selectedText is located (first match) and a marker
 * [ANN:N] is inserted immediately after it.
 *
 * We sort by startOffset descending so that inserting later markers doesn't
 * shift the positions of earlier ones.
 */
function normalizeChars(str) {
    if (!str) return '';
    return str
        .replace(/\r\n/g, '\n')            // Windows line endings → Unix
        .replace(/\r/g, '\n')              // old Mac line endings → Unix
        .replace(/[\u2018\u2019]/g, "'")   // curly single quotes → '
        .replace(/[\u201C\u201D]/g, '"')   // curly double quotes → "
        .replace(/[\u2013\u2014]/g, '--')  // en/em dash → --
        .replace(/\u00A0/g, ' ');          // non-breaking space → space
}

function injectAnnotationMarkers(text, annotations) {
    if (!text || !annotations || annotations.length === 0) return text;

    const sorted = [...annotations].sort((a, b) => b.startOffset - a.startOffset);

    let result = text;

    sorted.forEach((ann) => {
        const marker = `[ANN:${ann.id}]`;
        const sel    = ann.selectedText;
        if (!sel || result.includes(marker)) return;

        // Recompute on each iteration so offsets stay aligned after insertions
        const normalizedResult = normalizeChars(result);
        const normalizedSel    = normalizeChars(sel);

        // Strategy 1: offset-based with ±50 char window on normalized text
        const start      = ann.startOffset || 0;
        const end        = ann.endOffset   || (start + sel.length);
        const window     = 50;
        const sliceStart = Math.max(0, start - window);
        const normalizedSlice = normalizedResult.slice(sliceStart, end + window);

        if (normalizedSlice.includes(normalizedSel)) {
            const localIdx = normalizedSlice.indexOf(normalizedSel);
            const absEnd   = sliceStart + localIdx + normalizedSel.length;
            result = result.slice(0, absEnd) + marker + result.slice(absEnd);
            return;
        }

        // Strategy 2: full normalized text search
        const idx = normalizedResult.indexOf(normalizedSel);
        if (idx !== -1) {
            const absEnd = idx + normalizedSel.length;
            result = result.slice(0, absEnd) + marker + result.slice(absEnd);
            return;
        }

        // Strategy 3: partial match on first 40 chars of normalized selectedText
        const partial = normalizedSel.slice(0, 40);
        if (partial.length >= 10) {
            const pidx = normalizedResult.indexOf(partial);
            if (pidx !== -1) {
                const insertAt = pidx + normalizedSel.length;
                result = result.slice(0, insertAt) + marker + result.slice(insertAt);
            }
        }
    });

    return result;
}

// ---------------------------------------------------------------------------
// Pure parsing helpers
// ---------------------------------------------------------------------------

function parseDiagramCritiques(bodyText) {
    if (!bodyText) return [];
    const critiques = [];
    const lines = bodyText.split('\n');
    let currentCritique = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const headerMatch = trimmed.match(/^\*?\s*\[IMG-(\d+)\]\s*-\s*(.+?):(.*)/i);
        if (headerMatch) {
            if (currentCritique) critiques.push(currentCritique);
            currentCritique = {
                index:   parseInt(headerMatch[1], 10) - 1,
                type:    headerMatch[2].trim(),
                summary: headerMatch[3].trim(),
                details: [],
            };
        } else if (currentCritique) {
            const cleanLine = trimmed.replace(/^[-*]\s*/, '');
            if (cleanLine) currentCritique.details.push(cleanLine);
        } else {
            if (!trimmed.includes('CRITICAL: You MUST provide'))
                critiques.push({ type: 'General Note', details: [trimmed] });
        }
    }
    if (currentCritique) critiques.push(currentCritique);
    return critiques;
}

function extractDiagramCritiques(sections) {
    const diagramSection = sections.find((s) => s.heading === 'Diagram Analysis');
    if (!diagramSection) return {};
    const critiques = {};
    for (const line of diagramSection.body.split('\n')) {
        const match = line.match(/\*?\s*\[IMG-(\d+)\]\s*-(.+)/i);
        if (match) critiques[parseInt(match[1], 10) - 1] = match[2].trim();
    }
    return critiques;
}

function parseEvaluationSections(text) {
    if (!text) return null;
    let normalized = text.trim();
    if (normalized.startsWith('"') && normalized.endsWith('"'))
        normalized = normalized.slice(1, -1).trim();

    const KW = 'Summary|Rubric Evaluation|Strengths|Weaknesses|Missing Sections|Recommendations|Conclusion|Revision Analysis|Remaining Issues|Next Steps|Diagram Analysis';
    const splitRe = new RegExp(
        `(?:^|\\n)(?=\\s*#{1,3}\\s*(?:\\*\\*)?(?:${KW})(?:\\*\\*)?|\\s*\\*\\*(?:${KW}):?\\*\\*|\\s*(?:${KW}):?\\s*(?:\\n|$))`
    );

    const firstSectionMatch = normalized.match(splitRe);
    let headerContent = '';
    let mainContent   = normalized;

    if (firstSectionMatch) {
        headerContent = normalized.slice(0, firstSectionMatch.index).trim();
        mainContent   = normalized.slice(firstSectionMatch.index).trim();
    }

    const headingRe = new RegExp(
        `^\\s*(?:#{1,3}\\s*)?\\*?\\*?(${KW}):?\\*?\\*?:?\\s*(.*)`, 'i'
    );

    const sections = mainContent
        .split(splitRe)
        .filter((b) => b.trim())
        .map((block) => {
            const cleanBlock = block.trim();
            const nl         = cleanBlock.indexOf('\n');
            const firstLine  = nl === -1 ? cleanBlock : cleanBlock.slice(0, nl);
            const rest       = nl === -1 ? '' : cleanBlock.slice(nl + 1);
            const m          = firstLine.match(headingRe);
            if (!m) return null;
            const heading    = m[1].trim();
            const inlineBody = (m[2] || '').trim();
            const fullBody   = [inlineBody, rest.trim()].filter(Boolean).join('\n');
            return { heading, body: fullBody };
        })
        .filter(Boolean);

    return { headerContent, sections };
}

// ---------------------------------------------------------------------------
// Inline renderers
// ---------------------------------------------------------------------------

/**
 * Splits text on [ANN:N] tokens and returns an array of strings and
 * AnnotationBubble elements. Called as the innermost renderer so it
 * runs after bold/IMG processing.
 */
function processAnnotationTokens(text, annotationMap, canDelete, onDelete, keyPrefix) {
    if (!text || !annotationMap || Object.keys(annotationMap).length === 0)
        return text;

    const parts = text.split(/(\[ANN:\d+\])/);
    return parts.map((part, j) => {
        const m = part.match(/^\[ANN:(\d+)\]$/);
        if (m) {
            const id  = parseInt(m[1], 10);
            const ann = annotationMap[id];
            if (!ann) return null;
            return (
                <AnnotationBubble
                    key={`${keyPrefix}-ann-${j}`}
                    index={ann.index}
                    annotation={ann}
                    canDelete={canDelete}
                    onDelete={onDelete}
                />
            );
        }
        return <React.Fragment key={`${keyPrefix}-t-${j}`}>{part}</React.Fragment>;
    });
}

function processImgTags(text, onImageClick, keyPrefix, annotationMap, canDelete, onDelete) {
    if (!text) return null;
    const parts = text.split(/(\[IMG-\d+\]|\[ANN:\d+\])/i);
    return parts.map((part, j) => {
        const imgMatch = part.match(/\[IMG-(\d+)\]/i);
        if (imgMatch) {
            const index = parseInt(imgMatch[1], 10) - 1;
            return <ImgTagButton key={`${keyPrefix}-img-${j}`} index={index} onImageClick={onImageClick} />;
        }
        const annMatch = part.match(/\[ANN:(\d+)\]/);
        if (annMatch && annotationMap) {
            const id  = parseInt(annMatch[1], 10);
            const ann = annotationMap[id];
            if (ann) {
                return (
                    <AnnotationBubble
                        key={`${keyPrefix}-ann-${j}`}
                        index={ann.index}
                        annotation={ann}
                        canDelete={canDelete}
                        onDelete={onDelete}
                    />
                );
            }
        }
        return <React.Fragment key={`${keyPrefix}-text-${j}`}>{part}</React.Fragment>;
    });
}

function renderInline(text, onImageClick, annotationMap, canDelete, onDelete) {
    if (!text) return null;
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
        const boldMatch = part.match(/^\*\*([^*]+)\*\*$/);
        if (boldMatch) {
            return (
                <strong key={i}>
                    {processImgTags(boldMatch[1], onImageClick, `bold-${i}`, annotationMap, canDelete, onDelete)}
                </strong>
            );
        }
        return (
            <span key={i}>
                {processImgTags(part, onImageClick, `normal-${i}`, annotationMap, canDelete, onDelete)}
            </span>
        );
    });
}

function renderBody(body, onImageClick, annotationMap, canDelete, onDelete) {
    if (!body) return null;
    const result = [];
    let list = [];

    const flush = () => {
        if (list.length) {
            result.push(<ul key={`ul-${result.length}`} className="eval-card__list">{list}</ul>);
            list = [];
        }
    };

    body.split('\n').forEach((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            list.push(<li key={i}>{renderInline(trimmed.slice(2), onImageClick, annotationMap, canDelete, onDelete)}</li>);
        } else if (/^\d+[.)]\s/.test(trimmed)) {
            list.push(<li key={i}>{renderInline(trimmed.replace(/^\d+[.)]\s/, ''), onImageClick, annotationMap, canDelete, onDelete)}</li>);
        } else if (trimmed === '') {
            flush();
        } else {
            flush();
            if (trimmed.startsWith('**Status**:')) {
                const statusMatch = trimmed.match(/\*\*Status\*\*:\s*\[?(IMPROVED|WORSENED|SAME|PARTIALLY IMPROVED)\]?/i);
                const statusText  = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';
                result.push(
                    <div key={i} className="eval-card__status-row">
                        <strong>Status:</strong>
                        <span className={`eval-status-badge eval-status-badge--${statusText.toLowerCase().replace(' ', '-')}`}>
                            {statusText}
                        </span>
                    </div>
                );
            } else if (trimmed.includes('/') && !isNaN(trimmed.split('/')[0].trim().split(' ').pop())) {
                result.push(<div key={i} className="eval-card__large-score">{renderInline(trimmed, onImageClick, annotationMap, canDelete, onDelete)}</div>);
            } else if (trimmed.startsWith('**')) {
                result.push(<p key={i} className="eval-card__subheading">{renderInline(trimmed, onImageClick, annotationMap, canDelete, onDelete)}</p>);
            } else {
                result.push(<p key={i} className="eval-card__note">{renderInline(trimmed, onImageClick, annotationMap, canDelete, onDelete)}</p>);
            }
        }
    });

    flush();
    return result;
}

// ---------------------------------------------------------------------------
// Memoized sub-components
// ---------------------------------------------------------------------------

const IMG_BTN_BASE = {
    backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc',
    borderRadius: '6px', padding: '4px 8px', fontSize: '0.85em', cursor: 'pointer',
    fontWeight: '600', margin: '0 4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease', display: 'inline-block',
};

const ImgTagButton = memo(function ImgTagButton({ index, onImageClick }) {
    const handleClick      = useCallback((e) => { e.preventDefault(); e.stopPropagation(); onImageClick?.(index); }, [index, onImageClick]);
    const handleMouseEnter = useCallback((e) => { e.currentTarget.style.backgroundColor = '#bae6fd'; e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)'; }, []);
    const handleMouseLeave = useCallback((e) => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)'; }, []);
    return (
        <button className="img-tag-btn" style={IMG_BTN_BASE} onClick={handleClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            Image {index + 1}
        </button>
    );
});

const DiagramCard = memo(function DiagramCard({ critique, onImageClick, annotationMap, canDelete, onDelete }) {
    const handleImgClick   = useCallback((e) => { e.preventDefault(); onImageClick(critique.index); }, [critique.index, onImageClick]);
    const handleMouseEnter = useCallback((e) => { e.currentTarget.style.backgroundColor = '#bae6fd'; e.currentTarget.style.borderColor = '#38bdf8'; e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)'; }, []);
    const handleMouseLeave = useCallback((e) => { e.currentTarget.style.backgroundColor = '#e0f2fe'; e.currentTarget.style.borderColor = '#7dd3fc'; e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)'; }, []);

    return (
        <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--line-soft)', borderRadius: '8px', padding: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {critique.index !== undefined && (
                        <button style={{ backgroundColor: '#e0f2fe', color: '#0369a1', border: '1px solid #7dd3fc', borderRadius: '6px', padding: '4px 10px', fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', transition: 'all 0.2s ease' }}
                            onClick={handleImgClick} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
                            Image {critique.index + 1}
                        </button>
                    )}
                    {renderInline(critique.type, onImageClick, annotationMap, canDelete, onDelete)}
                </h4>
            </div>
            {critique.summary && <p style={{ margin: '0 0 0.75rem 0', fontStyle: 'italic', color: 'var(--text-main)' }}>{renderInline(critique.summary, onImageClick, annotationMap, canDelete, onDelete)}</p>}
            {critique.details.length > 0 && (
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)' }}>
                    {critique.details.map((detail, dIdx) => {
                        const splitDetail = detail.split(/^(.*?):/);
                        if (splitDetail.length > 1) {
                            return <li key={dIdx} style={{ marginBottom: '4px' }}><strong>{splitDetail[1]}:</strong> {renderInline(splitDetail[2], onImageClick, annotationMap, canDelete, onDelete)}</li>;
                        }
                        return <li key={dIdx} style={{ marginBottom: '4px' }}>{renderInline(detail, onImageClick, annotationMap, canDelete, onDelete)}</li>;
                    })}
                </ul>
            )}
        </div>
    );
});

const DiagramAnalysisSection = memo(function DiagramAnalysisSection({ body, onImageClick, annotationMap, canDelete, onDelete }) {
    const critiques = useMemo(() => parseDiagramCritiques(body), [body]);
    if (critiques.length === 0) return <p className="eval-card__note">No diagram analysis available.</p>;
    if (critiques.length === 1 && critiques[0].type === 'General Note') return <p className="eval-card__note">{critiques[0].details[0]}</p>;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {critiques.map((critique, idx) => (
                <DiagramCard key={idx} critique={critique} onImageClick={onImageClick} annotationMap={annotationMap} canDelete={canDelete} onDelete={onDelete} />
            ))}
        </div>
    );
});

const PageThumbnail = memo(function PageThumbnail({ img, idx, onClick }) {
    const handleClick      = useCallback(() => onClick(idx), [idx, onClick]);
    const handleMouseEnter = useCallback((e) => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 4px 14px var(--shadow)'; }, []);
    const handleMouseLeave = useCallback((e) => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 2px 6px var(--shadow)'; }, []);
    return (
        <div className="preview-item" onClick={handleClick} title={`Click to view analysis — Page ${idx + 1}`}
            style={{ flex: '0 0 110px', height: '140px', borderRadius: '8px', border: '1px solid var(--line-soft)', overflow: 'hidden', background: '#fff', boxShadow: '0 2px 6px var(--shadow)', cursor: 'pointer', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}
            onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            <img src={`data:image/jpeg;base64,${img}`} alt={`Page ${idx + 1}`} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
        </div>
    );
});

const ImageLightbox = memo(function ImageLightbox({ images, startIndex, onClose, critiques }) {
    const [current, setCurrent] = useState(startIndex);
    const prev = useCallback(() => setCurrent((i) => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setCurrent((i) => (i + 1) % images.length), [images.length]);

    useEffect(() => {
        function onKey(e) { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowLeft') prev(); if (e.key === 'ArrowRight') next(); }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, prev, next]);

    const currentCritique = critiques[current];

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <button onClick={onClose} style={{ position: 'absolute', top: '16px', right: '20px', background: 'none', border: 'none', color: '#fff', fontSize: '2rem', cursor: 'pointer', lineHeight: 1 }} aria-label="Close">&times;</button>
            <span style={{ position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)', color: '#ccc', fontSize: '0.85rem' }}>Page {current + 1} of {images.length}</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', width: '100%', position: 'relative' }}>
                {images.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); prev(); }} style={{ position: 'absolute', left: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.8rem', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} aria-label="Previous page">&#8249;</button>
                )}
                <img src={`data:image/jpeg;base64,${images[current]}`} alt={`Page ${current + 1}`} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '80vw', maxHeight: '100%', objectFit: 'contain', borderRadius: '6px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)', background: '#fff' }} />
                {images.length > 1 && (
                    <button onClick={(e) => { e.stopPropagation(); next(); }} style={{ position: 'absolute', right: '16px', background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: '1.8rem', borderRadius: '50%', width: '44px', height: '44px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }} aria-label="Next page">&#8250;</button>
                )}
            </div>
            {currentCritique && (
                <div onClick={(e) => e.stopPropagation()} style={{ marginTop: '20px', width: '80vw', maxWidth: '800px', background: 'var(--surface)', color: 'var(--text-main)', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 4px 20px rgba(0,0,0,0.5)', borderLeft: '4px solid var(--primary)', overflowY: 'auto', maxHeight: '20vh' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--primary)' }}>AI Diagram Analysis</h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>{currentCritique}</p>
                </div>
            )}
        </div>
    );
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_MOD = {
    Summary: 'summary', 'Rubric Evaluation': 'rubric', Strengths: 'strengths',
    Weaknesses: 'weaknesses', 'Missing Sections': 'missing', Recommendations: 'recommendations',
    Conclusion: 'conclusion', 'Revision Analysis': 'revision', 'Remaining Issues': 'weaknesses',
    'Next Steps': 'recommendations', 'Diagram Analysis': 'diagrams',
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

function EvaluationReport({ text, images = [], annotations = [], canDelete = false, onDeleteAnnotation }) {
    const [lightboxIndex, setLightboxIndex] = useState(null);

    // Build annotation map: id → { ...annotation, index (1-based) }
    const annotationMap = useMemo(() => {
        const map = {};
        (annotations || []).forEach((ann, i) => {
            map[ann.id] = { ...ann, index: i + 1 };
        });
        return map;
    }, [annotations]);

    // Inject [ANN:N] markers into the text before parsing
    const markedText = useMemo(
    () => injectAnnotationMarkers(text?.replace(/\r\n/g, '\n').replace(/\r/g, '\n'), annotations),
    [text, annotations],
    );

    const parsed = useMemo(() => parseEvaluationSections(markedText), [markedText]);
    const { headerContent, sections } = parsed || {};

    const diagramCritiques = useMemo(
        () => sections ? extractDiagramCritiques(sections) : {},
        [sections],
    );

    const handleImageClick    = useCallback((index) => { if (images && images.length > index) setLightboxIndex(index); }, [images]);
    const handleCloseLightbox = useCallback(() => setLightboxIndex(null), []);

    if (!parsed) return <div className="report-content">{text}</div>;

    return (
        <div className="eval-report">
            {lightboxIndex !== null && (
                <ImageLightbox images={images} startIndex={lightboxIndex} onClose={handleCloseLightbox} critiques={diagramCritiques} />
            )}

            {/* Document Information */}
            <div className="eval-card eval-card--metadata">
                <div className="eval-card__header">
                    <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>Document Information</span>
                </div>
                <div className="eval-card__body">
                    {renderBody(headerContent, handleImageClick, annotationMap, canDelete, onDeleteAnnotation)}
                </div>
            </div>

            {/* Page thumbnails */}
            {images.length > 0 && (
                <div className="eval-card eval-card--metadata">
                    <div className="eval-card__header">
                        <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>PAGES</span>
                    </div>
                    <div className="eval-card__body">
                        <div className="image-preview-grid" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {images.map((img, idx) => (
                                <PageThumbnail key={idx} img={img} idx={idx} onClick={setLightboxIndex} />
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic sections */}
            {sections.map((section, i) => (
                <div key={i} className={`eval-card eval-card--${SECTION_MOD[section.heading] || 'default'}`}>
                    <div className="eval-card__header">
                        <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>{section.heading}</span>
                    </div>
                    <div className="eval-card__body">
                        {section.heading === 'Diagram Analysis'
                            ? <DiagramAnalysisSection body={section.body} onImageClick={handleImageClick} annotationMap={annotationMap} canDelete={canDelete} onDelete={onDeleteAnnotation} />
                            : renderBody(section.body, handleImageClick, annotationMap, canDelete, onDeleteAnnotation)
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}

export default EvaluationReport;