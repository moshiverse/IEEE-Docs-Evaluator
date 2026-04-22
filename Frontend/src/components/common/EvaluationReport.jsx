/* eslint-disable react/prop-types */
import React from 'react';

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

    // Added 'Remaining Issues' and 'Next Steps' to give them their own cards
    const KW = 'Summary|Rubric Evaluation|Strengths|Weaknesses|Missing Sections|Recommendations|Conclusion|Revision Analysis|Remaining Issues|Next Steps';
    const splitRe = new RegExp(`(?:^|\\n)(?=\\s*#{1,3}\\s*(?:\\*\\*)?(?:${KW})(?:\\*\\*)?|\\s*\\*\\*(?:${KW}):?\\*\\*|\\s*(?:${KW}):?\\s*(?:\\n|$))`);
    
    const firstSectionMatch = normalized.match(splitRe);
    let headerContent = "";
    let mainContent = normalized;

    if (firstSectionMatch) {
        headerContent = normalized.slice(0, firstSectionMatch.index).trim();
        mainContent = normalized.slice(firstSectionMatch.index).trim();
    }

    const blocks = mainContent.split(splitRe).filter(b => b.trim());
    // Fixed Heading Regex to be more aggressive with whitespace
    const headingRe = new RegExp(`^\\s*(?:#{1,3}\\s*)?\\*?\\*?(${KW}):?\\*?\\*?:?\\s*(.*)`, "i");

    const sections = blocks.map((block) => {
        const cleanBlock = block.trim(); // CRITICAL FIX: Trim the block before matching
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
    'Remaining Issues': 'weaknesses', // Reuse weakness styling
    'Next Steps': 'recommendations'   // Reuse recommendation styling
};

function EvaluationReport({ text }) {
    const parsed = parseEvaluationSections(text);
    if (!parsed) return <div className="report-content">{text}</div>;
    const { headerContent, sections } = parsed;

    return (
        <div className="eval-report">
            {headerContent && (
                <div className="eval-card eval-card--metadata">
                    <div className="eval-card__header"><span className="eval-card__heading">Document Metadata</span></div>
                    <div className="eval-card__body">{renderBody(headerContent)}</div>
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