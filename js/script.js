// Détecte automatiquement l'URL de l'API
const API_BASE = (
  window.location.hostname === 'localhost'
    ? 'http://localhost:3001/api'
    : `${window.location.protocol}//${window.location.hostname}/api`
);

document.addEventListener('DOMContentLoaded', () => {
  const form        = document.getElementById('site-form');
  const input       = document.getElementById('site-name');
  const msg         = document.getElementById('form-message');
  const tbody       = document.getElementById('sites-tbody');
  const totalEl     = document.getElementById('total-sites');
  const lastEl      = document.getElementById('last-created');
  const filterInput = document.getElementById('filter-input');
  let allSites = [];

  // Récupère et affiche
  async function fetchSites() {
    try {
      const res   = await fetch(`${API_BASE}/sites`);
      const sites = await res.json();
      allSites = sites;
      renderSites(sites);
      updateStats(sites);
    } catch {
      tbody.innerHTML = `<tr><td colspan="5">Erreur de chargement</td></tr>`;
    }
  }

  function updateStats(sites) {
    totalEl.textContent = sites.length;
    lastEl.textContent = sites.length
      ? new Date(sites[sites.length - 1].createdAt)
        .toLocaleDateString('fr-FR')
      : '–';
  }

  function renderSites(sites) {
    if (!sites.length) {
      tbody.innerHTML = `<tr><td colspan="5">Aucun site</td></tr>`;
      return;
    }
    tbody.innerHTML = sites.map(s => `
      <tr data-safe="${s.safeName}">
        <td>${s.siteName}</td>
        <td><a href="${s.url}" target="_blank">${s.url}</a></td>
        <td>${s.status}</td>
        <td>${new Date(s.createdAt).toLocaleString('fr-FR')}</td>
        <td class="actions">
          <i class="fa-solid fa-pen edit" title="Renommer"></i>
          <i class="fa-solid fa-trash delete" title="Supprimer"></i>
        </td>
      </tr>
    `).join('');
    document.querySelectorAll('.delete').forEach(el => el.addEventListener('click', onClickDelete));
    document.querySelectorAll('.edit').forEach(el => el.addEventListener('click', onClickEdit));
  }

  filterInput.addEventListener('input', () => {
    const q = filterInput.value.trim().toLowerCase();
    const list = q
      ? allSites.filter(s =>
        s.siteName.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q)
      )
      : allSites;
    renderSites(list);
    updateStats(list);
  });

  async function onClickDelete(e) {
    const row = e.currentTarget.closest('tr');
    const safe = row.dataset.safe;
    const name = row.querySelector('td').textContent;
    const { isConfirmed } = await Swal.fire({
      title: `Supprimer "${name}" ?`, icon: 'warning',
      showCancelButton: true, confirmButtonText: 'Oui', cancelButtonText: 'Annuler'
    });
    if (!isConfirmed) return;
    try {
      const res = await fetch(`${API_BASE}/sites/${safe}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      allSites = allSites.filter(s => s.safeName !== safe);
      filterInput.dispatchEvent(new Event('input'));
      Swal.fire('Supprimé !', '', 'success');
    } catch {
      Swal.fire('Erreur', "Impossible de supprimer.", 'error');
    }
  }

  async function onClickEdit(e) {
    const row     = e.currentTarget.closest('tr');
    const oldSafe = row.dataset.safe;
    const oldName = row.querySelector('td').textContent;
    const { value: newName } = await Swal.fire({
      title: 'Renommer le site', input: 'text', inputLabel: 'Nouveau nom',
      inputValue: oldName, showCancelButton: true,
      confirmButtonText: 'Valider', cancelButtonText: 'Annuler',
      inputValidator: v => !v.trim() && 'Le nom ne peut pas être vide.'
    });
    if (!newName || newName.trim() === oldName) return;
    try {
      const res = await fetch(`${API_BASE}/sites/${oldSafe}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ newName: newName.trim() })
      });
      if (!res.ok) throw await res.json();
      allSites = allSites.map(s =>
        s.safeName === oldSafe
          ? {
            ...s,
            siteName: newName.trim(),
            safeName: newName.trim().replace(/\s+/g,'').toLowerCase(),
            url: s.url.replace(oldSafe, newName.trim().replace(/\s+/g,'').toLowerCase())
          }
          : s
      );
      filterInput.dispatchEvent(new Event('input'));
      Swal.fire('Renommé !', '', 'success');
    } catch (err) {
      Swal.fire('Erreur', err.message || 'Impossible de renommer.', 'error');
    }
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    msg.textContent = 'Création en cours…';
    try {
      const res  = await fetch(`${API_BASE}/create-site`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ siteName: name })
      });
      const data = await res.json();
      msg.textContent = res.ok ? data.message : data.message || 'Erreur';
      if (res.ok) {
        input.value = '';
        filterInput.value = '';
        await fetchSites();
      }
    } catch {
      msg.textContent = 'Erreur réseau';
    }
  });

  // init
  fetchSites();
});
