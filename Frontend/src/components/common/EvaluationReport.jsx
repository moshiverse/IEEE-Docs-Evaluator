/* eslint-disable react/prop-types */
import React, { useState, useEffect, useCallback } from 'react';

function renderInline(text) {
    if (!text) return null;
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) => {
        const m = part.match(/^\*\*([^*]+)\*\*$/);
        return m ? <strong key={i}>{m[1]}</strong> : part || null;
    });
}

function renderBody(body) {
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
            list.push(<li key={i}>{renderInline(trimmed.slice(2))}</li>);
        } else if (/^\d+[.)]\s/.test(trimmed)) {
            list.push(<li key={i}>{renderInline(trimmed.replace(/^\d+[.)]\s/, ''))}</li>);
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
                result.push(<div key={i} className="eval-card__large-score">{renderInline(trimmed)}</div>);
            }
            else if (trimmed.startsWith('**')) {
                result.push(<p key={i} className="eval-card__subheading">{renderInline(trimmed)}</p>);
            }
            else {
                result.push(<p key={i} className="eval-card__note">{renderInline(trimmed)}</p>);
            }
        }
    });
    flush();
    return result;
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
    'Diagram Analysis': 'rubric',
};

// Sub-component for the Lightbox overlay
function ImageLightbox({ images, startIndex, onClose }) {
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

    return (
        <div
            onClick={onClose}
            style={{
                position: 'fixed', inset: 0, zIndex: 9999,
                background: 'rgba(0,0,0,0.85)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
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

            {images.length > 1 && (
                <button
                    onClick={e => { e.stopPropagation(); prev(); }}
                    style={{
                        position: 'absolute', left: '16px',
                        background: 'rgba(255,255,255,0.15)', border: 'none',
                        color: '#fff', fontSize: '1.8rem', borderRadius: '50%',
                        width: '44px', height: '44px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                    maxWidth: '90vw', maxHeight: '90vh',
                    objectFit: 'contain', borderRadius: '6px',
                    boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
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
                    }}
                    aria-label="Next page"
                >
                    &#8250;
                </button>
            )}
        </div>
    );
}

function EvaluationReport({ text, images = [] }) {
    const [lightboxIndex, setLightboxIndex] = useState(null);

    const parsed = parseEvaluationSections(text);
    if (!parsed) return <div className="report-content">{text}</div>;
    const { headerContent, sections } = parsed;

    return (
        <div className="eval-report">
            {/* Render Lightbox if an image is clicked */}
            {lightboxIndex !== null && (
                <ImageLightbox
                    images={images}
                    startIndex={lightboxIndex}
                    onClose={() => setLightboxIndex(null)}
                />
            )}

            <div className="eval-card eval-card--metadata">
                <div className="eval-card__header">
                    <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>
                        Document Metadata</span>
                </div>
                <div className="eval-card__body">
                    {renderBody(headerContent)}
                </div>
            </div>

            {/* Visuals Preview Card */}
            {images.length > 0 && (
                <div className="eval-card eval-card--metadata">
                    <div className="eval-card__header">
                        <span className="eval-card__heading" style={{ color: 'var(--text-main)' }}>
                            Visuals Analyzed by AI</span>
                    </div>
                    <div className="eval-card__body">
                        <div className="image-preview-grid" style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                            {images.map((img, idx) => (
                                <div
                                    key={img.slice(0, 20)}
                                    className="preview-item"
                                    onClick={() => setLightboxIndex(idx)}
                                    title={`Click to enlarge — Page ${idx + 1}`}
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

            {sections.map((section, i) => (
                <div key={i} className={`eval-card eval-card--${SECTION_MOD[section.heading] || 'default'}`}>
                    <div className="eval-card__header"><span className="eval-card__heading">{section.heading}</span></div>
                    <div className="eval-card__body">{renderBody(section.body)}</div>
                </div>
            ))}
        </div>
    );
}

export default EvaluationReport;