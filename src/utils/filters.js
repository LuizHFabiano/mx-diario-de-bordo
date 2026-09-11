export function filterTasksList(tasks, filterUserEmail, filterCategoryIds) {
  return tasks.filter((task) => {
    const userOk = filterUserEmail === 'all' || task.userEmail === filterUserEmail;
    const categoryKey = task.categoryId || 'none';
    const categoryOk = filterCategoryIds.size === 0 || filterCategoryIds.has(categoryKey);
    return userOk && categoryOk;
  });
}

export function buildFilterDescription(filterUserEmail, filterCategoryIds, categories, users) {
  const parts = [];
  if (filterUserEmail !== 'all') {
    const user = users.find((u) => u.username === filterUserEmail);
    parts.push(`Usuário: ${user ? user.name : filterUserEmail}`);
  }
  if (filterCategoryIds.size) {
    const names = Array.from(filterCategoryIds).map((id) => {
      if (id === 'none') return 'Sem categoria';
      const category = categories.find((c) => c.id === id);
      return category ? category.name : id;
    });
    parts.push(`Categorias: ${names.join(', ')}`);
  }
  return parts.join(' · ');
}
