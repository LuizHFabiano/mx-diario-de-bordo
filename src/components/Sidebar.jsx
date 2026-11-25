import { ICONS } from "../icons";
import logoMx from "../assets/logo-mx.png";
import logoMxDark from "../assets/logo-mx-dark.png";
import { useAuth } from "../context/AuthContext";

const NAV_ITEMS = [
  { key: "hoje", label: "Diários de Hoje", icon: ICONS.doc },
  { key: "passados", label: "Diários Passados", icon: ICONS.archive },
  { key: "escalas", label: "Escalas", icon: ICONS.calendar || ICONS.doc },
];

export function Sidebar({ view, onChangeView, theme }) {
  const { currentUser } = useAuth();
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
        {currentUser?.role === "ADMIN" && (
          <button
            type="button"
            className={`nav__item${view === "admin" ? " is-active" : ""}`}
            onClick={() => onChangeView("admin")}
          >
            <img src={ICONS.lock} alt="" />
            <span>Administração</span>
          </button>
        )}
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
