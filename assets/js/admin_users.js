// ─────────────────────────────────────────────────────────────────────────────
// admin_users.js — Admin User Management page
// All mock data and setTimeout fakes removed. Real authFetch() calls.
// Requires api-client.js to be loaded first.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const dashboard             = document.querySelector('[data-admin-users]');
  const adminNameNode         = document.getElementById('admin-name');
  const userCountNode         = document.getElementById('user-count');
  const usersBody             = document.getElementById('users-body');
  const userSearch            = document.getElementById('user-search');
  const userModal             = document.getElementById('user-modal');
  const userForm              = document.getElementById('user-form');
  const modalTitle            = document.getElementById('user-modal-title');
  const openCreateModalButton = document.getElementById('open-create-modal');
  const closeModalButton      = document.getElementById('close-modal');
  const cancelModalButton     = document.getElementById('cancel-modal');
  const userRoleSelect        = document.getElementById('user-role');
  const territoryLabel        = document.getElementById('territory-label');
  const passwordLabel         = document.getElementById('password-label');
  const passwordNote          = document.getElementById('password-note');
  const userIdInput           = document.getElementById('user-id');
  const formActionInput       = document.getElementById('form-action');
  const fullNameInput         = document.getElementById('full-name');
  const territoryInput        = document.getElementById('territory');
  const phoneInput            = document.getElementById('phone-num');
  const passwordInput         = document.getElementById('default-password');
  const submitButton          = document.getElementById('submit-user');

  if (!dashboard) return;

  let usersCache = [];

  const escapeHtml = (v) => String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  const getTerritoryLabel = (role) => (role === 'Grama Niladhari' ? 'Division' : 'Area');

  const updateModalFields = () => {
    const role  = String(userRoleSelect?.value || 'Grama Niladhari');
    const label = getTerritoryLabel(role);
    const isUpdate = formActionInput?.value === 'update';
    if (territoryLabel) territoryLabel.textContent = label;
    if (passwordLabel)  passwordLabel.textContent  = isUpdate ? 'Reset Password (optional)' : 'Default Password';
    if (passwordNote)   passwordNote.textContent   = isUpdate ? 'Leave blank to keep the current password.' : 'Default password is required when creating a new account.';
    if (territoryInput) territoryInput.placeholder = label;
  };

  const openModal = (mode, user = null) => {
    if (!userModal || !userForm) return;
    userForm.reset();
    formActionInput.value     = mode;
    userIdInput.value         = user ? String(user.user_id) : '';
    userRoleSelect.value      = user ? user.role : 'Grama Niladhari';
    userRoleSelect.disabled   = mode === 'update';
    fullNameInput.value       = user?.full_name  || '';
    territoryInput.value      = user?.territory  || '';
    phoneInput.value          = user?.phone_num  || '';
    passwordInput.value       = '';
    passwordInput.required    = mode === 'create';
    if (modalTitle) modalTitle.textContent = mode === 'create' ? 'Add user' : 'Edit user';
    updateModalFields();
    userModal.hidden = false;
    if (typeof gsap !== 'undefined') {
      gsap.fromTo('.modal-card', { scale: 0.95, y: 12, opacity: 0 }, { scale: 1, y: 0, opacity: 1, duration: 0.35, ease: 'power3.out' });
    }
  };

  const closeModal = () => {
    if (userModal) userModal.hidden = true;
    if (userRoleSelect) userRoleSelect.disabled = false;
  };

  const renderUsers = (users) => {
    if (!usersBody) return;
    const list = Array.isArray(users) ? users : [];
    if (userCountNode) userCountNode.textContent = `${list.length} record${list.length === 1 ? '' : 's'}`;
    if (list.length === 0) {
      usersBody.innerHTML = `<tr><td colspan="7" class="empty-state">No users found.</td></tr>`;
      return;
    }
    usersBody.innerHTML = list.map((u) => `
      <tr data-role="${escapeHtml(u.role)}" data-user-id="${escapeHtml(u.user_id)}">
        <td>${escapeHtml(u.role)}</td>
        <td>${escapeHtml(u.user_id)}</td>
        <td>${escapeHtml(u.full_name)}</td>
        <td>${escapeHtml(u.territory)}</td>
        <td>${escapeHtml(u.phone_num)}</td>
        <td><span class="password-badge ${u.password_set ? 'set' : 'unset'}">${u.password_set ? 'Set' : 'Missing'}</span></td>
        <td>
          <div class="row-actions">
            <button type="button" class="action-button action-edit" data-action="edit" data-role="${escapeHtml(u.role)}" data-user-id="${escapeHtml(u.user_id)}" aria-label="Edit user"><i class="fa-solid fa-pen"></i></button>
            <button type="button" class="action-button action-delete" data-action="delete" data-role="${escapeHtml(u.role)}" data-user-id="${escapeHtml(u.user_id)}" aria-label="Delete user"><i class="fa-solid fa-trash"></i></button>
          </div>
        </td>
      </tr>
    `).join('');
    if (typeof gsap !== 'undefined') {
      gsap.from('.users-table tbody tr', { duration: 0.45, opacity: 0, y: 10, stagger: 0.05, ease: 'power2.out' });
    }
  };

  const getFilteredUsers = () => {
    const query = String(userSearch?.value || '').trim().toLowerCase();
    if (!query) return [...usersCache];
    return usersCache.filter((u) =>
      [u.role, u.user_id, u.full_name, u.territory, u.phone_num]
        .some((f) => String(f || '').toLowerCase().includes(query))
    );
  };

  window.filterUsers = () => renderUsers(getFilteredUsers());
  const refreshUsers = () => renderUsers(getFilteredUsers());

  const fetchUsers = async () => {
    const data = await authFetch('/api/admin/users');
    if (!data || data.status !== 'success') {
      if (usersBody) usersBody.innerHTML = `<tr><td colspan="7" class="empty-state">Unable to load users.</td></tr>`;
      return;
    }
    usersCache = Array.isArray(data.users) ? data.users : [];
    refreshUsers();
  };

  // ── Event listeners ───────────────────────────────────────────────────────
  userRoleSelect?.addEventListener('change', updateModalFields);
  openCreateModalButton?.addEventListener('click', () => openModal('create'));
  closeModalButton?.addEventListener('click', closeModal);
  cancelModalButton?.addEventListener('click', closeModal);
  userModal?.addEventListener('click', (e) => { if (e.target === userModal) closeModal(); });

  usersBody?.addEventListener('click', async (e) => {
    const target = e.target instanceof Element ? e.target.closest('[data-action]') : null;
    if (!target) return;

    const action     = target.getAttribute('data-action');
    const role       = target.getAttribute('data-role')    || '';
    const userId     = target.getAttribute('data-user-id') || '';
    const selectedUser = usersCache.find((u) => u.role === role && String(u.user_id) === userId);

    if (action === 'edit' && selectedUser) {
      openModal('update', selectedUser);
      return;
    }

    if (action === 'delete' && selectedUser) {
      if (!window.confirm(`Delete ${selectedUser.role} #${selectedUser.user_id}?`)) return;
      try {
        const data = await authFetch(`/api/admin/users/${selectedUser.user_id}?role=${encodeURIComponent(selectedUser.role)}`, {
          method: 'DELETE',
        });
        if (!data || data.status !== 'success') throw new Error(data?.message || 'Delete failed.');
        usersCache = usersCache.filter((u) => !(u.role === role && String(u.user_id) === userId));
        refreshUsers();
      } catch (err) {
        window.alert(err.message || 'Unable to delete user.');
      }
    }
  });

  userForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const action = String(formActionInput?.value || 'create');
    const payload = {
      role:             userRoleSelect?.value    || 'Grama Niladhari',
      full_name:        fullNameInput?.value     || '',
      territory:        territoryInput?.value    || '',
      phone_num:        phoneInput?.value        || '',
      default_password: passwordInput?.value     || '',
    };

    if (action === 'update' && payload.default_password.trim() === '') {
      delete payload.default_password;
    }

    if (submitButton) submitButton.disabled = true;

    try {
      let data;
      if (action === 'create') {
        data = await authFetch('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) });
      } else {
        const userId = userIdInput?.value || '';
        data = await authFetch(`/api/admin/users/${userId}`, { method: 'PUT', body: JSON.stringify(payload) });
      }

      if (!data || data.status !== 'success') throw new Error(data?.message || 'Save failed.');

      // Update local cache
      if (data.user) {
        const idx = usersCache.findIndex((u) => u.role === data.user.role && String(u.user_id) === String(data.user.user_id));
        if (idx >= 0) usersCache[idx] = data.user;
        else usersCache.unshift(data.user);
      }

      refreshUsers();
      closeModal();
      window.alert('User saved successfully.');
    } catch (err) {
      window.alert(err.message || 'Unable to save user.');
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  try {
    const session = getSession('Admin');
    if (!session) return;

    if (adminNameNode) adminNameNode.textContent = session.name || 'Admin';

    await fetchUsers();

    if (typeof gsap !== 'undefined') {
      gsap.from('.sidebar', { duration: 0.8, x: -28, opacity: 0, ease: 'power3.out' });
      gsap.from('.topbar',  { duration: 0.8, y: -20, opacity: 0, delay: 0.08, ease: 'power3.out' });
      gsap.from('.panel',   { duration: 0.8, y: 24,  opacity: 0, delay: 0.16, ease: 'power3.out' });
    }
  } catch {
    logout();
  }
});
