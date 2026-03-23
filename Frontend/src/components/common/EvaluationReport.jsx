function renderInline(text) 
{
    return text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
    {
        const m = part.match(/^\*\*([^*]+)\*\*$/);
        return m ? <strong key={i}>{m[1]}</strong> : part || null;
    });
}

function renderBody(body) 
{
    if(!body) return null;

    const result = [];
    let list = [];

    const flush = () => 
    {
        if(list.length) 
        {
            result.push(<ul key={`ul-${result.length}`} className="eval-card__list">{list}</ul>);
            list = [];
        }
    };

    body.split('\n').forEach((line, i) => 
    {
        const trimmed = line.trim();

        if(trimmed.startsWith('- ') || trimmed.startsWith('* ')) 
        {
            list.push(<li key={i}>{renderInline(trimmed.slice(2))}</li>);
        }
        else if(/^\d+[.)]\s/.test(trimmed))
        {
            list.push(<li key={i}>{renderInline(trimmed.replace(/^\d+[.)]\s/, ''))}</li>);
        }
        else if(trimmed === '') 
        {
            flush();
        } 
        else 
        {
            flush();
            result.push(<p key={i} className="eval-card__note">{renderInline(trimmed)}</p>);
        }
    });

    flush();
    return result;
}

function parseEvaluationSections(text) 
{
    if (!text) return null;

    // Strip enclosing quotation marks added by some AI providers (e.g. OpenRouter)
    let normalized = text.trim();
    if (normalized.startsWith('"') && normalized.endsWith('"')) 
    {
        normalized = normalized.slice(1, -1).trim();
    }

    // Heading keyword pattern used throughout
    const KW = 'Summary|Strengths|Weaknesses|Conclusion';

    // Split at any known section heading in all supported formats.
    // The lookahead matches headings that may appear at start-of-string or after \n:
    //   ### **Summary**   ### Summary   **Summary**   **Summary:**   Summary:   Summary
    const splitRe = new RegExp(
        `(?:^|\\n)(?=\\s*#{1,3}\\s*(?:\\*\\*)?(?:${KW})(?:\\*\\*)?|\\s*\\*\\*(?:${KW}):?\\*\\*|\\s*(?:${KW}):?\\s*(?:\\n|$))`,
    );
    const blocks = normalized.split(splitRe).filter(b => b.trim());

    // Match heading from the first line of each block
    const headingRe = new RegExp(
        `^\\s*(?:#{1,3}\\s*)?\\*\\*(${KW}):?\\*\\*:?\\s*(.*)` +   // **Heading**, **Heading:**, ### **Heading**
        `|^\\s*(?:#{1,3}\\s+)(${KW}):?\\s*$` +                       // ### Heading, ## Heading
        `|^\\s*(${KW}):?\\s*$`                                        // Heading, Heading:
    );

    const sections = blocks.map((block) => 
    {
        const nl = block.indexOf('\n');
        const firstLine = nl === -1 ? block : block.slice(0, nl);
        const rest = nl === -1 ? '' : block.slice(nl + 1);

        const m = firstLine.match(headingRe);
        if (!m) return null;

        const heading = (m[1] || m[3] || m[4]).trim();
        const inlineBody = (m[2] || '').trim();
        const fullBody = [inlineBody, rest.trim()].filter(Boolean).join('\n');
        return { heading, body: fullBody };
    }).filter(Boolean);

    return sections.length > 0 ? sections : null;
}

const SECTION_MOD = { Summary: 'summary', Strengths: 'strengths', Weaknesses: 'weaknesses', Conclusion: 'conclusion' };

function EvaluationReport({ text }) 
{
    const sections = parseEvaluationSections(text);

    if(!sections) return <div className="report-content">{text}</div>;

    return (
        <div className="eval-report">
        {sections.map((section, i) => 
        (
            <div key={i} className={`eval-card eval-card--${SECTION_MOD[section.heading] || 'default'}`}>
            <div className="eval-card__header">
                <span className="eval-card__heading">{section.heading}</span>
            </div>
            <div className="eval-card__body">{renderBody(section.body)}</div>
            </div>
        ))}
        </div>
    );
}

export default EvaluationReport;