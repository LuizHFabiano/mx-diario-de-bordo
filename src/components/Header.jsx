export function Header({ title, subtitle, actions }) {
  return (
    <header className="main__header">
      <div>
        <div className="main__title">{title}</div>
        <div className="main__subtitle">{subtitle}</div>
      </div>
      <div className="header__actions">{actions}</div>
    </header>
  );
}
