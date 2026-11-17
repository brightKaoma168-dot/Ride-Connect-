(() => {
  'use strict';

  const STORE = 'rideconnect-mvp-v1';
  const DEMO_REQUESTS = [
    { id: 'RC-DEMO-01', pickup: 'Mbala town centre', destination: 'Mbala market', passengers: 1, fare: 35 },
    { id: 'RC-DEMO-02', pickup: 'Mbala bus station', destination: 'Mbala town centre', passengers: 2, fare: 28 }
  ];
  const defaultState = () => ({ passengers: [], drivers: [], rides: [], demoStatuses: {}, availability: false, passengerSession: null, driverSession: null });
  let state = loadState();
  let toastTimer;
  const filters = { passenger: 'all', driver: 'all', admin: 'all', search: '' };

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaultState();
      return { ...defaultState(), ...saved,
        passengers: Array.isArray(saved.passengers) ? saved.passengers : [],
        drivers: Array.isArray(saved.drivers) ? saved.drivers : [],
        rides: Array.isArray(saved.rides) ? saved.rides : [],
        demoStatuses: saved.demoStatuses && typeof saved.demoStatuses === 'object' && !Array.isArray(saved.demoStatuses) ? saved.demoStatuses : {}
      };
    } catch (error) { return defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); }
    catch (error) { showToast('Could not save demo data in this browser.'); }
  }
  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  }
  function cleanPhone(value) {
    const raw = String(value || '').trim();
    return /^[+()\d\s-]+$/.test(raw) ? raw.replace(/[\s()-]/g, '') : '';
  }
  function normalizePhone(value) {
    let digits = cleanPhone(value).replace(/\D/g, '');
    if (digits.startsWith('260')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  }
  function validZambianPhone(value) { return /^(?:\+?260|0)?[79]\d{8}$/.test(cleanPhone(value)); }
  function displayPhone(value) { return '+260 ' + normalizePhone(value); }
  function setMessage(id, message) {
    const el = document.getElementById(id);
    if (el) { el.textContent = message || ''; el.classList.toggle('has-message', !!message); }
  }
  function showToast(message, type = 'success') {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }
  function go(view, mode) {
    const name = ['home', 'book', 'driver', 'admin', 'passenger-auth', 'driver-auth'].includes(view) ? view : 'home';
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${name}`));
    document.querySelectorAll('.main-nav [data-view]').forEach(link => link.classList.toggle('selected', link.dataset.view === name));
    document.getElementById('main-nav').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    if (name === 'passenger-auth' || name === 'driver-auth') setAuthMode(name === 'passenger-auth' ? 'passenger' : 'driver', mode || 'register');
    if (['book', 'driver', 'admin'].includes(name)) render();
    const hash = name === 'passenger-auth' ? 'passenger-login' : name === 'driver-auth' ? 'driver-login' : name;
    if (window.location.hash !== `#${hash}`) window.location.hash = hash;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function goFromHash() {
    const hash = location.hash.replace(/^#/, '');
    const view = ({ 'passenger-login': 'passenger-auth', 'driver-login': 'driver-auth' })[hash] || hash;
    if (!['home', 'book', 'driver', 'admin', 'passenger-auth', 'driver-auth'].includes(view)) return;
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
    document.querySelectorAll('.main-nav [data-view]').forEach(link => link.classList.toggle('selected', link.dataset.view === view));
    if (view === 'passenger-auth' || view === 'driver-auth') setAuthMode(view === 'passenger-auth' ? 'passenger' : 'driver', 'register');
    if (['book', 'driver', 'admin'].includes(view)) render();
  }
  function setAuthMode(role, mode) {
    const isDriver = role === 'driver';
    const form = document.getElementById(`${role}-auth-form`);
    if (!form) return;
    form.dataset.mode = mode;
    document.querySelectorAll(`.tab[data-role="${role}"]`).forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode));
    const name = document.getElementById(`${role}-name-wrap`);
    const vehicle = document.getElementById('driver-vehicle-fields');
    if (name) { name.hidden = mode === 'login'; name.querySelector('input').required = mode === 'register'; }
    if (vehicle) { vehicle.hidden = mode === 'login'; vehicle.querySelectorAll('input').forEach(input => { input.required = mode === 'register'; }); }
    document.getElementById(`${role}-auth-submit`).innerHTML = `${mode === 'register' ? (isDriver ? 'Create driver profile' : 'Create passenger account') : 'Log in'} <span>→</span>`;
    setMessage(`${role}-auth-message`, '');
  }
  function authSubmit(role, form) {
    const data = new FormData(form);
    const mode = form.dataset.mode || 'register';
    const phone = normalizePhone(data.get('phone'));
    const collection = role === 'driver' ? state.drivers : state.passengers;
    const messageId = `${role}-auth-message`;
    if (!validZambianPhone(data.get('phone'))) { setMessage(messageId, 'Enter a valid Zambian mobile number (for example, 97 123 4567).'); return; }
    if (mode === 'register') {
      const name = String(data.get('name') || '').trim();
      if (name.length < 2) { setMessage(messageId, 'Please enter your full name.'); return; }
      if (role === 'driver' && (!String(data.get('vehicle') || '').trim() || !String(data.get('registration') || '').trim())) {
        setMessage(messageId, 'Enter your vehicle details and registration.'); return;
      }
      let profile = collection.find(person => normalizePhone(person.phone) === phone);
      if (!profile) {
        profile = { id: `${role}-${Date.now()}`, name, phone, createdAt: new Date().toISOString() };
        if (role === 'driver') Object.assign(profile, { vehicle: String(data.get('vehicle')).trim(), registration: String(data.get('registration')).trim(), available: false });
        collection.push(profile);
      } else {
        profile.name = name;
        if (role === 'driver') { profile.vehicle = String(data.get('vehicle')).trim(); profile.registration = String(data.get('registration')).trim(); }
      }
      if (role === 'driver') { state.driverSession = profile.id; state.availability = !!profile.available; }
      else state.passengerSession = profile.id;
      saveState(); render(); showToast('Your demo profile is ready.'); go(role === 'driver' ? 'driver' : 'book');
      return;
    }
    const profile = collection.find(person => normalizePhone(person.phone) === phone);
    if (!profile) { setMessage(messageId, 'No demo account found for that number. Register first on this device.'); return; }
    if (role === 'driver') { state.driverSession = profile.id; state.availability = !!profile.available; }
    else state.passengerSession = profile.id;
    saveState(); render(); showToast('You are signed in to your demo account.'); go(role === 'driver' ? 'driver' : 'book');
  }
  function estimateFare(pickup, destination, passengers) {
    const a = pickup.trim().toLowerCase(), b = destination.trim().toLowerCase();
    if (!a || !b) return null;
    if (a === b) return 20;
    // Illustrative only: no route, distance data, pricing service, or live fare is used.
    const pseudoKm = 2 + ((a.length * 7 + b.length * 11 + a.charCodeAt(0) + b.charCodeAt(0)) % 16);
    return Math.round((15 + pseudoKm * 4 + Math.max(0, Number(passengers) - 1) * 3) / 5) * 5;
  }
  function updateFare() {
    const form = document.getElementById('booking-form');
    if (!form) return;
    const data = new FormData(form);
    const fare = estimateFare(data.get('pickup') || '', data.get('destination') || '', data.get('passengers') || 1);
    document.getElementById('fare-estimate').textContent = fare === null ? 'K —' : `K ${fare}`;
    document.getElementById('fare-hint').textContent = fare === null ? 'Enter both locations to see an estimate' : 'Illustrative demo estimate only';
  }
  function bookingSubmit(form) {
    const data = new FormData(form);
    const pickup = String(data.get('pickup') || '').trim(), destination = String(data.get('destination') || '').trim();
    if (pickup.length < 2 || destination.length < 2) { setMessage('booking-message', 'Enter a pickup and destination to continue.'); return; }
    if (pickup.toLowerCase() === destination.toLowerCase()) { setMessage('booking-message', 'Pickup and destination must be different.'); return; }
    if (!validZambianPhone(data.get('phone'))) { setMessage('booking-message', 'Enter a valid Zambian mobile number (for example, 97 123 4567).'); return; }
    const fare = estimateFare(pickup, destination, data.get('passengers'));
    state.rides.unshift({ id: `RC-${Date.now().toString(36).toUpperCase()}`, pickup, destination, passengers: Number(data.get('passengers')), phone: normalizePhone(data.get('phone')), fare, status: 'pending', demo: false, passengerId: state.passengerSession || null, createdAt: new Date().toISOString() });
    saveState(); form.reset(); updateFare(); setMessage('booking-message', ''); render(); showToast('Demo ride request created. No driver has been contacted.');
  }
  function allRides() {
    return [...state.rides, ...DEMO_REQUESTS.map(ride => ({ ...ride, demo: true, status: state.demoStatuses[ride.id]?.status || 'pending', driverId: state.demoStatuses[ride.id]?.driverId || null }))];
  }
  function timeLabel(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'Time unavailable' : date.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  }
  function renderRide(ride, options = {}) {
    const status = escapeHtml(ride.status);
    const driverActions = options.driverActions && ride.status === 'pending'
      ? `<button class="mini-button" data-ride-action="accept" data-ride-id="${escapeHtml(ride.id)}">Accept</button><button class="mini-button reject" data-ride-action="reject" data-ride-id="${escapeHtml(ride.id)}">Reject</button>` : '';
    const cancelAction = options.cancel && ride.status === 'pending' ? `<button class="mini-button reject" data-ride-action="cancel" data-ride-id="${escapeHtml(ride.id)}">Cancel</button>` : '';
    const sample = ride.demo ? '<span class="sample-tag">Sample scenario</span>' : '';
    return `<article class="request-card status-card-${status}"><div class="request-main"><div class="request-card-top"><span class="request-id">${escapeHtml(ride.id)}${ride.demo ? ' • SAMPLE' : ''}</span><span class="status ${status}">${status}</span></div><div class="request-route"><span class="pickup-text"><i aria-hidden="true">●</i>${escapeHtml(ride.pickup)}</span><span class="route-sep" aria-hidden="true">→</span><span class="destination-text"><i aria-hidden="true">◆</i>${escapeHtml(ride.destination)}</span></div><div class="request-meta"><span>${escapeHtml(ride.passengers)} passenger${ride.passengers === 1 ? '' : 's'}</span><span>Demo estimate: K ${escapeHtml(ride.fare)}</span>${ride.phone ? `<span>${escapeHtml(displayPhone(ride.phone))}</span>` : sample}<span>${escapeHtml(timeLabel(ride.createdAt))}</span></div></div><div class="request-actions">${driverActions}${cancelAction}</div></article>`;
  }
  function filterRides(rides, filter, search) {
    const needle = search.trim().toLowerCase();
    return rides.filter(ride => (filter === 'all' || ride.status === filter) && (!needle || [ride.id, ride.pickup, ride.destination, ride.phone].some(value => String(value || '').toLowerCase().includes(needle))));
  }
  function ensureToolbar(id, kind) {
    let toolbar = document.getElementById(id);
    if (toolbar) return toolbar;
    const target = document.getElementById(kind === 'admin' ? 'admin-rides' : `${kind}-requests`);
    if (!target) return null;
    toolbar = document.createElement('div');
    toolbar.id = id;
    toolbar.className = 'request-toolbar';
    const search = kind === 'admin' ? '<label class="sr-only" for="admin-ride-search">Search ride requests</label><input id="admin-ride-search" type="search" placeholder="Search route or request ID" data-filter-search="admin">' : '';
    toolbar.innerHTML = `${search}<label class="sr-only" for="${kind}-status-filter">Filter requests by status</label><select id="${kind}-status-filter" data-status-filter="${kind}"><option value="all">All statuses</option><option value="pending">Pending</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select>`;
    target.parentNode.insertBefore(toolbar, target);
    toolbar.querySelector('[data-status-filter]').value = filters[kind];
    return toolbar;
  }
  function renderRequests(elementId, rides, options = {}) {
    const target = document.getElementById(elementId);
    if (!target) return;
    if (!rides.length) {
      target.innerHTML = options.empty || '<div class="empty-state"><span class="empty-icon">↗</span><strong>No requests yet</strong><span>New ride requests will appear here.</span></div>';
      return;
    }
    target.innerHTML = rides.map(ride => renderRide(ride, options)).join('');
  }
  function render() {
    const rides = allRides();
    const passengerRides = state.rides.filter(ride => !state.passengerSession || ride.passengerId === state.passengerSession || !ride.passengerId);
    ensureToolbar('passenger-request-toolbar', 'passenger');
    document.getElementById('passenger-request-count').textContent = `${passengerRides.length} request${passengerRides.length === 1 ? '' : 's'}`;
    const shownPassengerRides = filterRides(passengerRides, filters.passenger, '');
    renderRequests('passenger-requests', shownPassengerRides, { cancel: true, empty: passengerRides.length ? '<div class="empty-state"><strong>No matching requests</strong><span>Try another status filter.</span></div>' : '<div class="empty-state"><span class="empty-icon">↗</span><strong>Your ride list is ready</strong><span>Book a demo ride to see its status here. No driver is contacted.</span><button class="mini-button" data-go="book">Plan a ride</button></div>' });

    const driver = state.drivers.find(person => person.id === state.driverSession);
    document.getElementById('driver-display-name').textContent = driver ? driver.name : 'Explore demo requests';
    document.getElementById('driver-avatar').textContent = driver ? driver.name.trim().charAt(0).toUpperCase() : 'D';
    const availability = document.getElementById('availability-toggle');
    availability.checked = !!(driver && state.availability);
    availability.disabled = !driver;
    document.getElementById('availability-label').textContent = driver ? (state.availability ? 'Available' : 'Unavailable') : 'Register or log in';
    const driverRides = rides.filter(ride => ride.status === 'pending' || (ride.status === 'accepted' && ride.driverId === state.driverSession));
    ensureToolbar('driver-request-toolbar', 'driver');
    document.getElementById('driver-request-count').textContent = `${driverRides.length} request${driverRides.length === 1 ? '' : 's'}`;
    renderRequests('driver-requests', filterRides(driverRides, filters.driver, ''), { driverActions: true, empty: '<div class="empty-state"><span class="empty-icon">✳</span><strong>No requests to show</strong><span>Pending demo requests appear here. This dashboard is not connected to live drivers or bookings.</span></div>' });

    document.getElementById('stat-drivers').textContent = state.drivers.length;
    document.getElementById('stat-passengers').textContent = state.passengers.length;
    document.getElementById('stat-rides').textContent = state.rides.length;
    document.getElementById('stat-pending').textContent = state.rides.filter(ride => ride.status === 'pending').length;
    const driversEl = document.getElementById('admin-drivers');
    driversEl.innerHTML = state.drivers.length ? state.drivers.map(person => `<div class="admin-person"><div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(displayPhone(person.phone))} • ${escapeHtml(person.vehicle)} · ${escapeHtml(person.registration)}</small></div><button class="availability-control ${person.available ? '' : 'offline'}" data-driver-availability="${escapeHtml(person.id)}">${person.available ? 'Available' : 'Unavailable'}</button></div>`).join('') : '<div class="empty-state"><strong>No driver profiles yet</strong><span>Driver demo registrations will appear here.</span><button class="mini-button" data-go="driver-auth" data-mode="register">Explore driver registration</button></div>';
    const passengersEl = document.getElementById('admin-passengers');
    passengersEl.innerHTML = state.passengers.length ? state.passengers.map(person => `<div class="admin-person"><div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(displayPhone(person.phone))}</small></div><small>Passenger</small></div>`).join('') : '<div class="empty-state"><strong>No passenger profiles yet</strong><span>Passenger demo registrations will appear here.</span></div>';
    ensureToolbar('admin-request-toolbar', 'admin');
    const adminRides = filterRides(state.rides, filters.admin, filters.search);
    renderRequests('admin-rides', adminRides, { empty: state.rides.length ? '<div class="empty-state"><strong>No matching ride requests</strong><span>Adjust the status or search filter.</span></div>' : '<div class="empty-state"><span class="empty-icon">↗</span><strong>No passenger requests yet</strong><span>Ride requests created in the passenger demo flow will appear here.</span></div>' });
    document.getElementById('passenger-status-filter').value = filters.passenger;
    document.getElementById('driver-status-filter').value = filters.driver;
    document.getElementById('admin-status-filter').value = filters.admin;
    document.getElementById('admin-ride-search').value = filters.search;
  }

  document.addEventListener('click', event => {
    const navigation = event.target.closest('[data-go], [data-view]');
    if (navigation) {
      event.preventDefault();
      const mode = navigation.dataset.mode || (navigation.closest('.nav-actions') && navigation.textContent.trim().startsWith('Log in') ? 'login' : undefined);
      go(navigation.dataset.go || navigation.dataset.view, mode);
      return;
    }
    const tab = event.target.closest('[data-auth-mode]');
    if (tab) { setAuthMode(tab.dataset.role, tab.dataset.authMode); return; }
    const action = event.target.closest('[data-ride-action]');
    if (action) {
      const ride = allRides().find(item => item.id === action.dataset.rideId);
      if (!ride) return;
      if (action.dataset.rideAction !== 'cancel' && (!state.driverSession || !state.drivers.some(person => person.id === state.driverSession))) {
        showToast('Register or log in as a driver to manage requests.', 'error'); go('driver-auth', 'login'); return;
      }
      if (action.dataset.rideAction === 'cancel') {
        if (!window.confirm('Cancel this demo ride request?')) return;
        ride.status = 'cancelled';
      } else if (action.dataset.rideAction === 'accept') {
        if (!state.availability) { showToast('Set yourself available before accepting requests.', 'error'); return; }
        if (!window.confirm(`Accept the demo request from ${ride.pickup} to ${ride.destination}?`)) return;
        ride.status = 'accepted'; ride.driverId = state.driverSession;
      } else if (action.dataset.rideAction === 'reject') {
        if (!window.confirm(`Reject the demo request from ${ride.pickup} to ${ride.destination}?`)) return;
        ride.status = 'rejected';
      }
      if (ride.demo) state.demoStatuses[ride.id] = { status: ride.status, driverId: ride.driverId || null };
      saveState(); render();
      showToast(ride.status === 'accepted' ? 'Demo request accepted. No passenger has been contacted.' : ride.status === 'rejected' ? 'Demo request rejected.' : 'Demo request cancelled.');
      return;
    }
    const driverControl = event.target.closest('[data-driver-availability]');
    if (driverControl) {
      const person = state.drivers.find(item => item.id === driverControl.dataset.driverAvailability);
      if (!person) return;
      person.available = !person.available;
      if (person.id === state.driverSession) state.availability = person.available;
      saveState(); render(); showToast(`Driver marked ${person.available ? 'available' : 'unavailable'}.`);
    }
  });
  document.addEventListener('change', event => {
    const select = event.target.closest('[data-status-filter]');
    if (select) { filters[select.dataset.statusFilter] = select.value; render(); }
  });
  document.addEventListener('input', event => {
    if (event.target.matches('[data-filter-search="admin"]')) {
      filters.search = event.target.value;
      const selectionStart = event.target.selectionStart;
      render();
      const input = document.getElementById('admin-ride-search');
      input.focus(); input.setSelectionRange(selectionStart, selectionStart);
    }
  });
  document.getElementById('menu-toggle').addEventListener('click', event => {
    const menu = document.getElementById('main-nav');
    const open = menu.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      document.getElementById('main-nav').classList.remove('open');
      document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    }
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.topbar')) {
      document.getElementById('main-nav').classList.remove('open');
      document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    }
  });
  document.getElementById('passenger-auth-form').addEventListener('submit', event => { event.preventDefault(); authSubmit('passenger', event.currentTarget); });
  document.getElementById('driver-auth-form').addEventListener('submit', event => { event.preventDefault(); authSubmit('driver', event.currentTarget); });
  document.getElementById('booking-form').addEventListener('submit', event => { event.preventDefault(); bookingSubmit(event.currentTarget); });
  document.getElementById('booking-form').addEventListener('input', updateFare);
  document.getElementById('booking-form').addEventListener('change', updateFare);
  document.getElementById('availability-toggle').addEventListener('change', event => {
    const driver = state.drivers.find(person => person.id === state.driverSession);
    if (!driver) { event.currentTarget.checked = false; showToast('Register or log in as a driver to set availability.', 'error'); return; }
    state.availability = event.currentTarget.checked;
    driver.available = state.availability;
    saveState(); render(); showToast(`You are now ${state.availability ? 'available' : 'unavailable'}.`);
  });

  const headerLogin = document.querySelector('.nav-actions [data-go="passenger-auth"]');
  if (headerLogin) headerLogin.dataset.mode = 'login';
  window.addEventListener('hashchange', goFromHash);
  goFromHash();
  render();
  updateFare();
})();
