import '../../styles/components/tutorial.css';

function TutorialButton({ onClick, label = 'Quick Tutorial' }) {
  return (
    <button
      type="button"
      className="tutorial-button"
      onClick={onClick}
      aria-label={label}
    >
      <span className="tutorial-button__icon">?</span>
      <span>{label}</span>
    </button>
  );
}

export default TutorialButton;
