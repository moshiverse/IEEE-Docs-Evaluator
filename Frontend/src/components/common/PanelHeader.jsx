function PanelHeader({ title, subtitle, actions }) {
  return (
    <header className="panel-header">
      <div>
        <h1 className="panel-header__title">{title}</h1>
        {subtitle && <p className="panel-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="panel-header__actions">{actions}</div>}
    </header>
  );
}

export default PanelHeader;
