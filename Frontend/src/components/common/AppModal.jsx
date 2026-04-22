import '../../styles/components/modal.css';

function AppModal({ isOpen, title, subtitle, onClose, children, footer, containerClassName = '' }) {
  if (!isOpen) return null;

  return (
    <div 
      className="app-modal__overlay" 
      onMouseDown={(e) => {
        // STRICT CHECK: Only close if the user clicked directly on the dark overlay.
        // This prevents the modal from closing if you highlight text and release the mouse outside.
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Notice we removed the onClick stopPropagation here, it is no longer needed! */}
      <div className={`app-modal__container ${containerClassName}`.trim()}>
        <header className="app-modal__header">
          <div>
            <h2 className="app-modal__title">{title}</h2>
            {subtitle && <p className="app-modal__subtitle">{subtitle}</p>}
          </div>
          <button className="app-modal__close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </header>
        <section className="app-modal__body">{children}</section>
        {footer && <footer className="app-modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export default AppModal;