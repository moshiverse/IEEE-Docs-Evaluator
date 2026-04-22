/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- Helper: Extract and structure the Diagram Analysis ---
function parseDiagramCritiques(bodyText) {
    if (!bodyText) return [];

    const critiques = [];
    const lines = bodyText.split('\n');
    let currentCritique = null;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Match the start of a new image critique: "* [IMG-1] - Use Case Diagram:"
        const headerMatch = trimmed.match(/^\*?\s*\[IMG-(\d+)\]\s*-\s*(.+?):(.*)/i);
        
        if (headerMatch) {
            // Save the previous critique if it exists
            if (currentCritique) critiques.push(currentCritique);

            currentCritique = {
                index: parseInt(headerMatch[1], 10) - 1, // 0-based
                type: headerMatch[2].trim(),
                summary: headerMatch[3].trim(),
                details: []
            };
        } else if (currentCritique) {
            // It's a detail line for the current critique (e.g., "- Notation observed: ...")
            // Clean up list markers for cleaner rendering in the card
            let cleanLine = trimmed.replace(/^[-*]\s*/, '');
            if (cleanLine) {
                 currentCritique.details.push(cleanLine);
            }
        } else {
             // Handle the "No diagrams detected" case or preamble text
             if (!trimmed.includes('CRITICAL: You MUST provide')) {
                  critiques.push({ type: 'General Note', details: [trimmed] });
             }
        }
    });

    if (currentCritique) critiques.push(currentCritique);
    return critiques;
}

// ... existing extractDiagramCritiques function (keep this for the lightbox)
function extractDiagramCritiques(sections) {
    const diagramSection = sections.find(s => s.heading === 'Diagram Analysis');
    if (!diagramSection) return {};

    const critiques = {};
    const lines = diagramSection.body.split('\n');
    lines.forEach(line => {
        const match = line.match(/\*?\s*\[IMG-(\d+)\]\s*-(.+)/i);
        if (match) {
            const index = parseInt(match[1], 10) - 1; 
            critiques[index] = match[2].trim();
        }
    });
    return critiques;
}

function renderInline(text, onImageClick) {
    if (!text) return null;

    const boldParts = text.split(/(\*\*[^*]+\*\*)/);

    return boldParts.map((boldPart, i) => {
        const boldMatch = boldPart.match(/^\*\*([^*]+)\*\*$/);
        
        if (boldMatch) {
            return <strong key={i}>{processImgTags(boldMatch[1], onImageClick, `bold-${i}`)}</strong>;
        } else {
            return <span key={i}>{processImgTags(boldPart, onImageClick, `normal-${i}`)}</span>;
        }
    });
}

function processImgTags(text, onImageClick, keyPrefix) {
    if (!text) return null;
    
    const parts = text.split(/(\[IMG-\d+\])/i);
    
    return parts.map((part, j) => {
        const imgMatch = part.match(/\[IMG-(\d+)\]/i);
        if (imgMatch) {
            const index = parseInt(imgMatch[1], 10) - 1;
            return (
                <button 
                    key={`${keyPrefix}-img-${j}`}
                    className="img-tag-btn"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onImageClick) {
                            onImageClick(index);
                        }
                    }}
                    style={{
                        /* EXPLICIT BUTTON STYLES - Hardcoded colors to guarantee visibility */
                        backgroundColor: '#e0f2fe', /* Light blue background */
                        color: '#0369a1',           /* Dark blue text */
                        border: '1px solid #7dd3fc',/* Noticeable blue border */
                        borderRadius: '6px',        /* Rounded corners */
                        padding: '4px 8px',         /* Good padding */
                        fontSize: '0.85em',
                        cursor: 'pointer',
                        fontWeight: '600',
                        margin: '0 4px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)', /* Subtle shadow */
                        transition: 'all 0.2s ease',
                        display: 'inline-block'     /* Ensure it behaves like a block for padding */
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#bae6fd'; /* Slightly darker blue on hover */
                        e.currentTarget.style.borderColor = '#38bdf8';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#e0f2fe';
                        e.currentTarget.style.borderColor = '#7dd3fc';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                    }}
                >
                    {/* Make the text clearer, e.g., "Image 1" instead of "[IMG-1]" */}
                    Image {index + 1}
                </button>
            );
        }
        return <React.Fragment key={`${keyPrefix}-text-${j}`}>{part}</React.Fragment>;
    });
}

function renderBody(body, onImageClick) {
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
            list.push(<li key={i}>{renderInline(trimmed.slice(2), onImageClick)}</li>);
        } else if (/^\d+[.)]\s/.test(trimmed)) {
            list.push(<li key={i}>{renderInline(trimmed.replace(/^\d+[.)]\s/, ''), onImageClick)}</li>);
        } else if (trimmed === '') {
            flush();
        } else {
            flush();
            if (trimmed.startsWith('**Status**:')) {
                const statusMatch = trimmed.match(/\*\*Status\*\*:\s*\[?(IMPROVED|WORSENED|SAME)\]?/i);
                const statusText = statusMatch ? statusMatch[1].toUpperCase() : 'UNKNOWN';
                result.push(
                    <div key={i} className="eval-card__status-row">
                        <strong>Status:</strong>
                        <span className={`eval-status-badge eval-status-badge--${statusText.toLowerCase()}`}>
                            {statusText}
                        </span>
                    </div>
                );
            }
            else if (trimmed.includes('/') && !isNaN(trimmed.split('/')[0].trim().split(' ').pop())) {
                result.push(<div key={i} className="eval-card__large-score">{renderInline(trimmed, onImageClick)}</div>);
            }
            else if (trimmed.startsWith('**')) {
                result.push(<p key={i} className="eval-card__subheading">{renderInline(trimmed, onImageClick)}</p>);
            }
            else {
                result.push(<p key={i} className="eval-card__note">{renderInline(trimmed, onImageClick)}</p>);
            }
        }
    });
    flush();
    return result;
}

// --- NEW: Custom Renderer for the Diagram Analysis Section ---
function renderDiagramAnalysisCards(body, onImageClick) {
    const critiques = parseDiagramCritiques(body);

    if (critiques.length === 0) {
        return <p className="eval-card__note">No diagram analysis available.</p>;
    }

    if (critiques.length === 1 && critiques[0].type === 'General Note') {
        return <p className="eval-card__note">{critiques[0].details[0]}</p>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {critiques.map((critique, idx) => (
                <div 
                    key={idx} 
                    style={{
                        background: 'var(--surface-sunken)',
                        border: '1px solid var(--line-soft)',
                        borderRadius: '8px',
                        padding: '1rem',
                        position: 'relative'
                    }}
                >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <h4 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {critique.index !== undefined && (
                                <button
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onImageClick(critique.index);
                                    }}
                                    style={{
                                        /* EXPLICIT BUTTON STYLES - Hardcoded colors to guarantee visibility */
                                        backgroundColor: '#e0f2fe',
                                        color: '#0369a1',
                                        border: '1px solid #7dd3fc',
                                        borderRadius: '6px',
                                        padding: '4px 10px',
                                        fontSize: '0.85rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                                        transition: 'all 0.2s ease',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = '#bae6fd';
                                        e.currentTarget.style.borderColor = '#38bdf8';
                                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = '#e0f2fe';
                                        e.currentTarget.style.borderColor = '#7dd3fc';
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                                    }}
                                >
                                    Image {critique.index + 1}
                                </button>
                            )}
                            {/* Pass onImageClick down here so any inline tags in the type are clickable */}
                            {renderInline(critique.type, onImageClick)}
                        </h4>
                    </div>
                    
                    {critique.summary && (
                        <p style={{ margin: '0 0 0.75rem 0', fontStyle: 'italic', color: 'var(--text-muted)' }}>
                            {/* Pass onImageClick down here */}
                            {renderInline(critique.summary, onImageClick)}
                        </p>
                    )}

                    {critique.details.length > 0 && (
                        <ul style={{ margin: 0, paddingLeft: '1.2rem', color: 'var(--text-main)' }}>
                            {critique.details.map((detail, dIdx) => {
                                // Bold the labels like "Notation observed:" or "Issues:"
                                const splitDetail = detail.split(/^(.*?):/);
                                if (splitDetail.length > 1) {
                                    return (
                                        <li key={dIdx} style={{ marginBottom: '4px' }}>
                                            {/* Pass onImageClick down here */}
                                            <strong>{splitDetail[1]}:</strong> {renderInline(splitDetail[2], onImageClick)}
                                        </li>
                                    );
                                }
                                // Pass onImageClick down here
                                return <li key={dIdx} style={{ marginBottom: '4px' }}>{renderInline(detail, onImageClick)}</li>;
                            })}
                        </ul>
                    )}
                </div>
            ))}
        </div>
    );
}

function parseEvaluationSections(text) {
    if (!text) return null;
    let normalized = text.trim();
    if (normalized.startsWith('"') && normalized.endsWith('"')) normalized = normalized.slice(1, -1).trim();

    const KW = 'Summary|Rubric Evaluation|Strengths|Weaknesses|Missing Sections|Recommendations|Conclusion|Revision Analysis|Remaining Issues|Next Steps|Diagram Analysis';
    const splitRe = new RegExp(`(?:^|\\n)(?=\\s*#{1,3}\\s*(?:\\*\\*)?(?:${KW})(?:\\*\\*)?|\\s*\\*\\*(?:${KW}):?\\*\\*|\\s*(?:${KW}):?\\s*(?:\\n|$))`);

    const firstSectionMatch = normalized.match(splitRe);
    let headerContent = "";
    let mainContent = normalized;

    if (firstSectionMatch) {
        headerContent = normalized.slice(0, firstSectionMatch.index).trim();
        mainContent = normalized.slice(firstSectionMatch.index).trim();
    }

    const blocks = mainContent.split(splitRe).filter(b => b.trim());
    const headingRe = new RegExp(`^\\s*(?:#{1,3}\\s*)?\\*?\\*?(${KW}):?\\*?\\*?:?\\s*(.*)`, "i");

    const sections = blocks.map((block) => {
        const cleanBlock = block.trim();
        const nl = cleanBlock.indexOf('\n');
        const firstLine = nl === -1 ? cleanBlock : cleanBlock.slice(0, nl);
        const rest = nl === -1 ? '' : cleanBlock.slice(nl + 1);

        const m = firstLine.match(headingRe);
        if (!m) return null;

        const heading = m[1].trim();
        const inlineBody = (m[2] || '').trim();
        const fullBody = [inlineBody, rest.trim()].filter(Boolean).join('\n');
        return { heading, body: fullBody };
    }).filter(Boolean);

    return { headerContent, sections };
}

const SECTION_MOD = {
    Summary: 'summary',
    'Rubric Evaluation': 'rubric',
    Strengths: 'strengths',
    Weaknesses: 'weaknesses',
    'Missing Sections': 'missing',
    Recommendations: 'recommendations',
    Conclusion: 'conclusion',
    'Revision Analysis': 'revision',
    'Remaining Issues': 'weaknesses',
    'Next Steps': 'recommendations',
    'Diagram Analysis': 'diagrams', // Specific class if needed
};

// Sub-component for the Lightbox overlay
function ImageLightbox({ images, startIndex, onClose, critiques }) {
    const [current, setCurrent] = useState(startIndex);

    const prev = useCallback(() => setCurrent(i => (i - 1 + images.length) % images.length), [images.length]);
    const next = useCallback(() => setCurrent(i => (i + 1) % images.length), [images.length]);

    useEffect(() => {
        function onKey(e) {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        }
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [onClose, prev, next]);

    const currentCritique = critiques[current];

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.9)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                padding: '20px'
            }}
        >
            <button
                onClick={onClose}
                style={{
                    position: 'absolute', top: '16px', right: '20px',
                    background: 'none', border: 'none', color: '#fff',
                    fontSize: '2rem', cursor: 'pointer', lineHeight: 1,
                }}
                aria-label="Close"
            >
                &times;
            </button>

            <span style={{
                position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
                color: '#ccc', fontSize: '0.85rem',
            }}>
                Page {current + 1} of {images.length}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '70vh', width: '100%', position: 'relative' }}>
                {images.length > 1 && (
                    <button
                        onClick={e => { e.stopPropagation(); prev(); }}
                        style={{
                            position: 'absolute', left: '16px',
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            color: '#fff', fontSize: '1.8rem', borderRadius: '50%',
                            width: '44px', height: '44px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10
                        }}
                        aria-label="Previous page"
                    >
                        &#8249;
                    </button>
                )}

                <img
                    src={`data:image/jpeg;base64,${images[current]}`}
                    alt={`Page ${current + 1}`}
                    onClick={e => e.stopPropagation()}
                    style={{
                        maxWidth: '80vw', maxHeight: '100%',
                        objectFit: 'contain', borderRadius: '6px',
                        boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
                        background: '#fff' 
                    }}
                />

                {images.length > 1 && (
                    <button
                        onClick={e => { e.stopPropagation(); next(); }}
                        style={{
                            position: 'absolute', right: '16px',
                            background: 'rgba(255,255,255,0.15)', border: 'none',
                            color: '#fff', fontSize: '1.8rem', borderRadius: '50%',
                            width: '44px', height: '44px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            zIndex: 10
                        }}
                        aria-label="Next page"
                    >
                        &#8250;
                    </button>
                )}
            </div>
            
            {/* AI Analysis Panel in Lightbox */}
            {currentCritique && (
                 <div 
                    onClick={e => e.stopPropagation()}
                    style={{
                        marginTop: '20px',
                        width: '80vw',
                        maxWidth: '800px',
                        background: 'var(--surface)',
                        color: 'var(--text-main)',
                        padding: '1.5rem',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                        borderLeft: '4px solid var(--primary)',
                        overflowY: 'auto',
                        maxHeight: '20vh'
                    }}
                >
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', color: 'var(--primary)' }}>
                        AI Diagram Analysis
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5' }}>
                        {currentCritique}
                    </p>
                </div>
            )}
        </div>
    );
}

function EvaluationReport({ text, images = [] }) {
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const parsed = parseEvaluationSections(text);
    if (!parsed) return <div className="report-content">{text}</div>;
    const { headerContent, sections } = parsed;

    const diagramCritiques = useMemo(() => extractDiagramCritiques(sections), [sections]);

    const handleImageClick = useCallback((index) => {
        if (images && images.length > index) {
            setLightboxIndex(index);
        }
    }, [images]);

    return (
        <div className="eval-report">
            {lightboxIndex !== null && (
                <ImageLightbox
                    images={images}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                    critiques={diagramCritiques}
                />
            )}

            <div className="eval-card eval-card--metadata">
                <div className="eval-card__header">
                    <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>Document Information</span>
                </div>
                <div className="eval-card__body">
                    {renderBody(headerContent, handleImageClick)}
                </div>
            </div>

            {/* Visuals Preview Card */}
            {images.length > 0 && (
                <div className="eval-card eval-card--metadata">
                    <div className="eval-card__header">
                        <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>PAGES</span>
                    </div>
                    <div className="eval-card__body">
                        <div className="image-preview-grid" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {images.map((img, idx) => (
                                <div
                                    key={idx} 
                                    className="preview-item"
                                    onClick={() => setLightboxIndex(idx)}
                                    title={`Click to view analysis — Page ${idx + 1}`}
                                    style={{
                                        flex: '0 0 110px',
                                        height: '140px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--line-soft)',
                                        overflow: 'hidden',
                                        background: '#fff',
                                        boxShadow: '0 2px 6px var(--shadow)',
                                        cursor: 'pointer',
                                        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.transform = 'scale(1.04)';
                                        e.currentTarget.style.boxShadow = '0 4px 14px var(--shadow)';
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.transform = 'scale(1)';
                                        e.currentTarget.style.boxShadow = '0 2px 6px var(--shadow)';
                                    }}
                                >
                                    <img
                                        src={`data:image/jpeg;base64,${img}`}
                                        alt={`Page ${idx + 1}`}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Dynamic Sections */}
            {sections.map((section, i) => (
                <div key={i} className={`eval-card eval-card--${SECTION_MOD[section.heading] || 'default'}`}>
                    <div className="eval-card__header">
                        <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>
                            {section.heading}
                        </span>
                    </div>
                    <div className="eval-card__body">
                        {/* Check if this is the Diagram Analysis section and use the custom renderer */}
                        {section.heading === 'Diagram Analysis' 
                            ? renderDiagramAnalysisCards(section.body, handleImageClick) 
                            : renderBody(section.body, handleImageClick)
                        }
                    </div>
                </div>
            ))}
        </div>
    );
}

export default EvaluationReport;