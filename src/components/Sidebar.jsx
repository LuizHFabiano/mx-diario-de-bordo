import { ICONS } from '../icons';

const NAV_ITEMS = [
  { key: 'hoje', label: 'Diários de Hoje', icon: ICONS.doc },
  { key: 'passados', label: 'Diários Passados', icon: ICONS.archive },
];

export function Sidebar({ view, onChangeView }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand__mark" />
        <div className="brand__text">
          <strong>MX</strong>
          <span>SOLUÇÕES</span>
        </div>
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav__item${view === item.key ? ' is-active' : ''}`}
            onClick={() => onChangeView(item.key)}
          >
            <img src={item.icon} alt="" />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar__footer">
        <button
          type="button"
          className={`nav__item${view === 'config' ? ' is-active' : ''}`}
          onClick={() => onChangeView('config')}
        >
          <img src={ICONS.gear} alt="" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
}
