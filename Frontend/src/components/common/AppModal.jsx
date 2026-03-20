import '../../styles/components/modal.css';

function AppModal({ isOpen, title, subtitle, onClose, children, footer }) {
  if (!isOpen) return null;

  return (
    <div className="app-modal__overlay" onClick={onClose}>
      <div className="app-modal__container" onClick={(e) => e.stopPropagation()}>
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
