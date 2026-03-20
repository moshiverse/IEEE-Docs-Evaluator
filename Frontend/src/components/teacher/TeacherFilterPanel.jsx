import { useEffect, useRef, useState } from 'react';
import '../../styles/components/teacher-filter-panel.css';

function TeacherFilterPanel({
  sections = [],
  teamCodes = [],
  docTypes = [],
  statusOptions = [],
  stats = null,
  selectedSection,
  selectedTeamCode,
  selectedDocType,
  selectedStatus = '',
  onSectionChange,
  onTeamCodeChange,
  onDocTypeChange,
  onStatusChange,
  onClear,
}) {
  const showStatus = typeof onStatusChange === 'function' && statusOptions.length > 0;

  return (
    <section className="teacher-filter-panel" aria-label="Submission Filters">
      <div className="teacher-filter-panel__header">
        <h2 className="teacher-filter-panel__title">Quick Filters</h2>
        <button type="button" className="btn" onClick={onClear}>Reset Filters</button>
      </div>

      <div className={`filter-container${!stats ? ' filter-container--compact' : ''}`}>
        <div className={`filter-dropdowns${!stats ? ' filter-dropdowns--row' : ''}`}>
          <div className="filter-group">
            <label className="filter-label">Section</label>
            <CustomDropdown
              value={selectedSection}
              options={sections}
              placeholder="All Sections"
              onChange={onSectionChange}
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">Team Code</label>
            <CustomDropdown
              value={selectedTeamCode}
              options={teamCodes}
              placeholder="All Teams"
              onChange={onTeamCodeChange}
            />
          </div>
        </div>

        {stats && (
          <div className="filter-stats-row">
            <div className="filter-stats-item">
              <span className="filter-stats-label">
                {stats.studentName ? 'Student' : 'Students'}
              </span>
              <span className={`filter-stats-value${stats.studentName ? ' filter-stats-value--name' : ''}`}>
                {stats.studentName || stats.studentCount}
              </span>
            </div>
            <div className="filter-stats-separator" />
            <div className="filter-stats-docs">
              <span className="filter-stats-label">Submissions</span>
              <div className="filter-stats-docs-grid">
                {stats.docCounts.map((doc) => (
                  <div key={doc.type} className="filter-stats-doc">
                    <span className="filter-stats-doc-type">{doc.type}</span>
                    <span className="filter-stats-doc-count">{doc.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="filter-divider"></div>

      <div className="filter-link-rows">
        <nav className="document-links" aria-label="Document Type Filters">
          <h3 className="document-links-title">Document Type</h3>
          <ul className="document-links-list">
            <li>
              <button
                type="button"
                onClick={() => onDocTypeChange('')}
                className={`document-link ${selectedDocType === '' ? 'document-link--active' : ''}`}
                title="Show all document types"
              >
                All
              </button>
            </li>
            {docTypes.map((docType) => (
              <li key={docType}>
                <button
                  type="button"
                  onClick={() => onDocTypeChange(docType)}
                  className={`document-link ${selectedDocType === docType ? 'document-link--active' : ''}`}
                  title={`Filter by ${docType}`}
                >
                  {docType}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {showStatus && (
          <nav className="document-links" aria-label="Status Filters">
            <h3 className="document-links-title">Status</h3>
            <ul className="document-links-list">
              {statusOptions.map((status) => (
                <li key={status.value || 'all'}>
                  <button
                    type="button"
                    onClick={() => onStatusChange(status.value)}
                    className={`document-link ${selectedStatus === status.value ? 'document-link--active' : ''}`}
                    title={`Filter by ${status.label} status`}
                  >
                    {status.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}

function CustomDropdown({ value, options, placeholder, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(val) {
    onChange(val);
    setIsOpen(false);
  }

  return (
    <div className="custom-dropdown" ref={ref}>
      <button
        type="button"
        className={`custom-dropdown__trigger filter-select${isOpen ? ' custom-dropdown__trigger--open' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="custom-dropdown__text">{value || placeholder}</span>
        <span className="custom-dropdown__arrow">{isOpen ? '\u25B2' : '\u25BC'}</span>
      </button>
      {isOpen && (
        <ul className="custom-dropdown__list" role="listbox">
          <li
            className={`custom-dropdown__item${!value ? ' custom-dropdown__item--active' : ''}`}
            role="option"
            aria-selected={!value}
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </li>
          {options.map((opt) => (
            <li
              key={opt}
              className={`custom-dropdown__item${value === opt ? ' custom-dropdown__item--active' : ''}`}
              role="option"
              aria-selected={value === opt}
              onClick={() => handleSelect(opt)}
            >
              {opt}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default TeacherFilterPanel;
