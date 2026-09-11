import { useState } from "react";
import { useAppData } from "../context/AppDataContext";
import { useAuth } from "../context/AuthContext";
import { useSimulatedNow } from "../hooks/useSimulatedNow";
import { timeStore } from "../lib/timeStore";
import { Header } from "../components/Header";
import { Button } from "../components/Button";
import { ICONS } from "../icons";
import { toDatetimeLocalValue, timeStrToMinutes } from "../utils/dateUtils";

export function ConfigView() {
  const { currentUser, logout, changePassword } = useAuth();
  const isAdmin = currentUser.role === "ADMIN";
  const {
    settings,
    categories,
    updateSettings,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useAppData();
  const now = useSimulatedNow(1000);

  const [scheduleForm, setScheduleForm] = useState({
    dayStart: settings.dayStart,
    dayEnd: settings.dayEnd,
  });
  const [scheduleError, setScheduleError] = useState("");

  const [catName, setCatName] = useState("");
  const [catColor, setCatColor] = useState("#3562E0");
  const [editingCategoryId, setEditingCategoryId] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    current: "",
    next: "",
    next2: "",
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  const [simValue, setSimValue] = useState(toDatetimeLocalValue(now));

  async function handleScheduleSubmit(e) {
    e.preventDefault();
    setScheduleError("");
    if (
      timeStrToMinutes(scheduleForm.dayEnd) <=
      timeStrToMinutes(scheduleForm.dayStart)
    ) {
      setScheduleError("O horário final deve ser depois do inicial.");
      return;
    }
    await updateSettings({
      dayStart: scheduleForm.dayStart,
      dayEnd: scheduleForm.dayEnd,
    });
  }

  function startEditCategory(category) {
    setEditingCategoryId(category.id);
    setCatName(category.name);
    setCatColor(category.color);
  }

  function cancelEditCategory() {
    setEditingCategoryId(null);
    setCatName("");
    setCatColor("#3562E0");
  }

  async function handleCategorySubmit(e) {
    e.preventDefault();
    if (!catName.trim()) return;
    if (editingCategoryId) {
      await updateCategory(editingCategoryId, {
        name: catName.trim(),
        color: catColor,
      });
    } else {
      await addCategory(catName.trim(), catColor);
    }
    cancelEditCategory();
  }

  async function handleDeleteCategory(id) {
    if (
      !window.confirm(
        "Excluir esta categoria? As atividades vinculadas ficarão sem categoria.",
      )
    )
      return;
    if (editingCategoryId === id) cancelEditCategory();
    await deleteCategory(id);
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess(false);
    if (passwordForm.next !== passwordForm.next2) {
      setPasswordError("A confirmação não corresponde à nova senha.");
      return;
    }
    const res = await changePassword(passwordForm.current, passwordForm.next);
    if (!res.ok) {
      setPasswordError(res.error);
      return;
    }
    setPasswordSuccess(true);
    setPasswordForm({ current: "", next: "", next2: "" });
  }

  function applySimulatedTime() {
    if (!simValue) return;
    const chosen = new Date(simValue);
    timeStore.setOffset(chosen.getTime() - Date.now());
  }

  function resetSimulatedTime() {
    timeStore.setOffset(0);
    setSimValue(toDatetimeLocalValue(new Date()));
  }

  return (
    <>
      <Header
        title="Configurações"
        subtitle={currentUser.username}
        actions={null}
      />
      <div className="content-wrapper">
        <div className="config-grid">
          <div className="config-card">
            <h3>Horário do expediente</h3>
            <p className="hint">Compartilhado por toda a equipe.</p>
            <form onSubmit={handleScheduleSubmit}>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="cfgStart">Início</label>
                  <input
                    id="cfgStart"
                    type="time"
                    required
                    value={scheduleForm.dayStart}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        dayStart: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="field">
                  <label htmlFor="cfgEnd">Fim</label>
                  <input
                    id="cfgEnd"
                    type="time"
                    required
                    value={scheduleForm.dayEnd}
                    disabled={!isAdmin}
                    onChange={(e) =>
                      setScheduleForm({
                        ...scheduleForm,
                        dayEnd: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              {scheduleError && (
                <p className="field__error is-visible">{scheduleError}</p>
              )}
              <div className="config-actions">
                <Button type="submit" variant="primary" disabled={!isAdmin}>
                  Salvar horário
                </Button>
              </div>
            </form>
          </div>

          <div className="config-card">
            <h3>Categorias</h3>
            <p className="hint">
              Categorias são globais e ficam disponíveis para todos os usuários.
            </p>
            <div>
              {categories.length === 0 && (
                <p className="hint">Nenhuma categoria cadastrada.</p>
              )}
              {categories.map((c) => (
                <div key={c.id} className="category-row">
                  <span
                    className="category-row__dot"
                    style={{ background: c.color }}
                  />
                  <span className="category-row__name">{c.name}</span>
                  <div className="category-row__actions">
                    {isAdmin && <button
                      type="button"
                      className="icon-btn"
                      onClick={() => startEditCategory(c)}
                    >
                      <img src={ICONS.edit} alt="" />
                    </button>}
                    {isAdmin && <button
                      type="button"
                      className="icon-btn"
                      onClick={() => handleDeleteCategory(c.id)}
                    >
                      <img src={ICONS.trash} alt="" />
                    </button>}
                  </div>
                </div>
              ))}
            </div>
            {isAdmin && <form className="add-category-form" onSubmit={handleCategorySubmit}>
              <div className="field">
                <label htmlFor="cfgCatName">Nome</label>
                <input
                  id="cfgCatName"
                  type="text"
                  placeholder="Ex.: Ação, Reunião..."
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                />
              </div>
              <div className="field color-field">
                <label htmlFor="cfgCatColor">Cor</label>
                <input
                  id="cfgCatColor"
                  type="color"
                  value={catColor}
                  onChange={(e) => setCatColor(e.target.value)}
                />
              </div>
              <Button type="submit" variant="primary">
                {editingCategoryId ? "Salvar" : "Adicionar"}
              </Button>
              {editingCategoryId && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={cancelEditCategory}
                >
                  Cancelar
                </Button>
              )}
            </form>}
          </div>

          <div className="config-card">
            <h3>Modo teste</h3>
            <div className="switch-row">
              <p className="hint" style={{ margin: 0 }}>
                Habilitar o botão "Encerrar dia" na tela principal.
              </p>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.allowManualClose}
                  disabled={!isAdmin}
                  onChange={(e) =>
                    updateSettings({ allowManualClose: e.target.checked })
                  }
                />
                <span className="switch-track" />
              </label>
            </div>
          </div>

          <div className="config-card">
            <h3>Alterar senha</h3>
            <p className="hint">
              Confirme a senha atual para definir uma nova.
            </p>
            <form onSubmit={handlePasswordSubmit}>
              <div className="field">
                <label htmlFor="cfgCurrentPass">Senha atual</label>
                <input
                  id="cfgCurrentPass"
                  type="password"
                  required
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      current: e.target.value,
                    })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="cfgNewPass">Nova senha</label>
                <input
                  id="cfgNewPass"
                  type="password"
                  required
                  value={passwordForm.next}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, next: e.target.value })
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="cfgNewPass2">Confirmar nova senha</label>
                <input
                  id="cfgNewPass2"
                  type="password"
                  required
                  value={passwordForm.next2}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, next2: e.target.value })
                  }
                />
              </div>
              {passwordError && (
                <p className="field__error is-visible">{passwordError}</p>
              )}
              {passwordSuccess && (
                <p className="field__success is-visible">
                  Senha alterada com sucesso.
                </p>
              )}
              <div className="config-actions">
                <Button type="submit" variant="primary">
                  Alterar senha
                </Button>
              </div>
            </form>
          </div>

          <div className="config-card">
            <h3>Simular horário (testes)</h3>
            <p className="hint">
              Ajuste o relógio do sistema para testar o encerramento automático
              à meia-noite.
            </p>
            <div className="clock-readout">
              {new Intl.DateTimeFormat("pt-BR", {
                dateStyle: "short",
                timeStyle: "medium",
              }).format(now)}
            </div>
            <div className="field">
              <label htmlFor="cfgSimDate">Data e hora simuladas</label>
              <input
                id="cfgSimDate"
                type="datetime-local"
                value={simValue}
                onChange={(e) => setSimValue(e.target.value)}
              />
            </div>
            <div className="config-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={resetSimulatedTime}
              >
                Usar horário real
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={applySimulatedTime}
              >
                Aplicar
              </Button>
            </div>
          </div>

          <div className="config-card">
            <h3>Sessão</h3>
            <p className="hint">Conectado como {currentUser.name}.</p>
            <Button variant="danger" icon={ICONS.logout} onClick={logout}>
              Sair da conta
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
