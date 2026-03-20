import '../../styles/components/loading-screen.css';

function LoadingScreen({ title = 'Loading...', subtitle = '' }) {
  return (
    <div className="loading-screen">
      <div className="loading-screen__content">
        <div className="loading-screen__spinner" aria-hidden="true">
          <span className="loading-screen__ring" />
          <span className="loading-screen__ring loading-screen__ring--delay" />
        </div>
        <h2 className="loading-screen__title">{title}</h2>
        {subtitle && <p className="loading-screen__subtitle">{subtitle}</p>}
      </div>
    </div>
  );
}

export default LoadingScreen;
