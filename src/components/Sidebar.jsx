import { ICONS } from "../icons";
import logoMx from "../assets/logo-mx.png";
import logoMxDark from "../assets/logo-mx-dark.png";

const NAV_ITEMS = [
  { key: "hoje", label: "Diários de Hoje", icon: ICONS.doc },
  { key: "passados", label: "Diários Passados", icon: ICONS.archive },
];

export function Sidebar({ view, onChangeView, theme }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <img
          className="brand__logo brand__logo--full"
          src={theme === "dark" ? logoMxDark : logoMx}
          alt="MX Soluções"
        />
      </div>
      <nav className="nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`nav__item${view === item.key ? " is-active" : ""}`}
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
          className={`nav__item${view === "config" ? " is-active" : ""}`}
          onClick={() => onChangeView("config")}
        >
          <img src={ICONS.gear} alt="" />
          <span>Configurações</span>
        </button>
      </div>
    </aside>
  );
}
