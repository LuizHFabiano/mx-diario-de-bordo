import { ICONS } from '../icons';

export function FilterBar({ users, categories, filterUserEmail, onChangeUser, filterCategoryIds, onToggleCategory }) {
  return (
    <div className="filter-bar">
      <div className="filter-group">
        <img src={ICONS.filter} alt="" style={{ width: 13, height: 13 }} />
        <span className="filter-group__label">Usuário</span>
        <select className="filter-select" value={filterUserEmail} onChange={(e) => onChangeUser(e.target.value)}>
          <option value="all">Todos</option>
          {users.map((u) => (
            <option key={u.username} value={u.username}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-group">
        <span className="filter-group__label">Categoria</span>
        <div className="chip-group">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip${filterCategoryIds.has(c.id) ? ' is-active' : ''}`}
              onClick={() => onToggleCategory(c.id)}
            >
              <span className="chip__dot" style={{ background: c.color }} />
              {c.name}
            </button>
          ))}
          <button
            type="button"
            className={`chip${filterCategoryIds.has('none') ? ' is-active' : ''}`}
            onClick={() => onToggleCategory('none')}
          >
            <span className="chip__dot" style={{ background: '#C9C6C0' }} />
            Sem categoria
          </button>
        </div>
      </div>
    </div>
  );
}
