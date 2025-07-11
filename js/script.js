// script.js
const API_BASE = 'http://localhost:3001/api';

document.addEventListener('DOMContentLoaded', () => {
  // 1) références DOM
  const form        = document.getElementById('site-form');
  const input       = document.getElementById('site-name');
  const msg         = document.getElementById('form-message');
  const tbody       = document.getElementById('sites-tbody');
  const totalEl     = document.getElementById('total-sites');
  const lastEl      = document.getElementById('last-created');
  const filterInput = document.getElementById('filter-input');

  // 2) stockage de la liste brute
  let allSites = [];

  // 3) fetch + rendu initial
  async function fetchSites() {
    try {
      const res   = await fetch(`${API_BASE}/sites`);
      const sites = await res.json();
      allSites = sites;               // mémorisation
      renderSites(sites);
      updateStats(sites);
    } catch {
      tbody.innerHTML = `<tr><td colspan="5">Erreur de chargement</td></tr>`;
    }
  }

  // 4) met à jour les compteurs
  function updateStats(sites) {
    totalEl.textContent = sites.length;
    lastEl.textContent = sites.length
      ? new Date(sites[sites.length - 1].createdAt)
        .toLocaleDateString('fr-FR')
      : '–';
  }

  // 5) rend les lignes + attache handlers
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
          <i class="fa-solid fa-pen edit"    title="Renommer"></i>
          <i class="fa-solid fa-trash delete" title="Supprimer"></i>
        </td>
      </tr>
    `).join('');

    document.querySelectorAll('.delete').forEach(el =>
      el.addEventListener('click', onClickDelete)
    );
    document.querySelectorAll('.edit').forEach(el =>
      el.addEventListener('click', onClickEdit)
    );
  }

  // 6) filtrage “live”
  filterInput.addEventListener('input', () => {
    const q = filterInput.value.trim().toLowerCase();
    if (!q) {
      renderSites(allSites);
      updateStats(allSites);
    } else {
      const filtered = allSites.filter(s =>
        s.siteName.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q)
      );
      renderSites(filtered);
      updateStats(filtered);
    }
  });

  // 7) suppression via SweetAlert2
  async function onClickDelete(e) {
    const row      = e.currentTarget.closest('tr');
    const safe     = row.dataset.safe;
    const siteName = row.querySelector('td').textContent;

    const { isConfirmed } = await Swal.fire({
      title: `Supprimer "${siteName}" ?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Oui, supprimer',
      cancelButtonText: 'Annuler'
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/sites/${safe}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      // mise à jour allSites + réaffichage
      allSites = allSites.filter(s => s.safeName !== safe);
      filterInput.dispatchEvent(new Event('input'));
      Swal.fire('Supprimé !', '', 'success');
    } catch {
      Swal.fire('Erreur', 'Impossible de supprimer.', 'error');
    }
  }

  // 8) renommage via SweetAlert2
  async function onClickEdit(e) {
    const row     = e.currentTarget.closest('tr');
    const oldSafe = row.dataset.safe;
    const oldName = row.querySelector('td').textContent;

    const { value: newName } = await Swal.fire({
      title: 'Renommer le site',
      input: 'text',
      inputLabel: 'Nouveau nom',
      inputValue: oldName,
      showCancelButton: true,
      confirmButtonText: 'Valider',
      cancelButtonText: 'Annuler',
      inputValidator: v => !v.trim() ? 'Le nom ne peut pas être vide.' : null
    });
    if (!newName || newName.trim() === oldName) return;

    try {
      const res = await fetch(`${API_BASE}/sites/${oldSafe}`, {
        method: 'PATCH',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ newName: newName.trim() })
      });
      if (!res.ok) {
        const err = await res.json(); throw new Error(err.message);
      }
      // maj allSites et ré-affichage
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

  // 9) création de site
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
      if (res.ok) {
        msg.textContent = data.message;
        input.value = '';
        filterInput.value = '';     // réinitialise le filtre
        await fetchSites();
      } else {
        msg.textContent = data.message || 'Erreur';
      }
    } catch {
      msg.textContent = 'Erreur réseau';
    }
  });

  // 10) lancement initial
  fetchSites();
});
