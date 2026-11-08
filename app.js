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

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE));
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return defaultState();
      return {
        ...defaultState(),
        ...saved,
        passengers: Array.isArray(saved.passengers) ? saved.passengers : [],
        drivers: Array.isArray(saved.drivers) ? saved.drivers : [],
        rides: Array.isArray(saved.rides) ? saved.rides : [],
        demoStatuses: saved.demoStatuses && typeof saved.demoStatuses === 'object' && !Array.isArray(saved.demoStatuses) ? saved.demoStatuses : {}
      };
    } catch (error) {
      return defaultState();
    }
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
    if (!/^[+()\d\s-]+$/.test(raw)) return '';
    return raw.replace(/[\s()-]/g, '');
  }

  function normalizePhone(value) {
    let digits = cleanPhone(value).replace(/\D/g, '');
    if (digits.startsWith('260')) digits = digits.slice(3);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return digits;
  }

  function validZambianPhone(value) {
    const cleaned = cleanPhone(value);
    return /^(?:\+?260|0)?[79]\d{8}$/.test(cleaned);
  }

  function displayPhone(value) { return '+260 ' + normalizePhone(value); }
  function setMessage(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message || '';
  }

  function showToast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function go(view, mode) {
    const name = ['home', 'book', 'driver', 'admin', 'passenger-auth', 'driver-auth'].includes(view) ? view : 'home';
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${name}`));
    document.querySelectorAll('.main-nav [data-view]').forEach(link => link.classList.toggle('selected', link.dataset.view === name));
    document.getElementById('main-nav').classList.remove('open');
    document.getElementById('menu-toggle').setAttribute('aria-expanded', 'false');
    if (name === 'passenger-auth' || name === 'driver-auth') setAuthMode(name === 'passenger-auth' ? 'passenger' : 'driver', mode || 'register');
    if (name === 'book' || name === 'driver' || name === 'admin') render();
    window.location.hash = name === 'passenger-auth' ? 'passenger-login' : name === 'driver-auth' ? 'driver-login' : name;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function goFromHash() {
    const value = location.hash.replace(/^#/, '');
    const alias = { 'passenger-login': 'passenger-auth', 'driver-login': 'driver-auth' };
    const view = alias[value] || value;
    if (!['home', 'book', 'driver', 'admin', 'passenger-auth', 'driver-auth'].includes(view)) return;
    document.querySelectorAll('.view').forEach(section => section.classList.toggle('active', section.id === `view-${view}`));
    if (view === 'passenger-auth' || view === 'driver-auth') setAuthMode(view === 'passenger-auth' ? 'passenger' : 'driver', 'register');
    if (view === 'book' || view === 'driver' || view === 'admin') render();
  }

  function setAuthMode(role, mode) {
    const isDriver = role === 'driver';
    const form = document.getElementById(`${role}-auth-form`);
    if (!form) return;
    form.dataset.mode = mode;
    document.querySelectorAll(`.tab[data-role="${role}"]`).forEach(tab => tab.classList.toggle('active', tab.dataset.authMode === mode));
    const name = document.getElementById(`${role}-name-wrap`);
    const vehicle = document.getElementById('driver-vehicle-fields');
    if (name) name.hidden = mode === 'login';
    if (vehicle) vehicle.hidden = mode === 'login';
    if (name) name.querySelector('input').required = mode === 'register';
    if (vehicle) vehicle.querySelectorAll('input').forEach(input => { input.required = mode === 'register'; });
    document.getElementById(`${role}-auth-submit`).innerHTML = `${mode === 'register' ? (isDriver ? 'Create driver profile' : 'Create passenger account') : 'Log in'} <span>→</span>`;
    setMessage(`${role}-auth-message`, '');
  }

  function authSubmit(role, form) {
    const data = new FormData(form);
    const mode = form.dataset.mode || 'register';
    const phone = normalizePhone(data.get('phone'));
    const collection = role === 'driver' ? state.drivers : state.passengers;
    const msg = `${role}-auth-message`;
    if (!validZambianPhone(data.get('phone'))) {
      setMessage(msg, 'Enter a valid Zambian mobile number (for example, 97 123 4567).');
      return;
    }
    if (mode === 'register') {
      const name = String(data.get('name') || '').trim();
      if (name.length < 2) { setMessage(msg, 'Please enter your full name.'); return; }
      if (role === 'driver' && (!String(data.get('vehicle') || '').trim() || !String(data.get('registration') || '').trim())) {
        setMessage(msg, 'Enter your vehicle details and registration.');
        return;
      }
      let profile = collection.find(person => normalizePhone(person.phone) === phone);
      if (!profile) {
        profile = { id: `${role}-${Date.now()}`, name, phone, createdAt: new Date().toISOString() };
        if (role === 'driver') Object.assign(profile, { vehicle: String(data.get('vehicle')).trim(), registration: String(data.get('registration')).trim(), available: false });
        collection.push(profile);
      } else {
        profile.name = name;
        if (role === 'driver') {
          profile.vehicle = String(data.get('vehicle')).trim();
          profile.registration = String(data.get('registration')).trim();
        }
      }
      if (role === 'driver') { state.driverSession = profile.id; state.availability = !!profile.available; }
      else state.passengerSession = profile.id;
      saveState();
      render();
      showToast('Your demo profile is ready.');
      go(role === 'driver' ? 'driver' : 'book');
      return;
    }
    const profile = collection.find(person => normalizePhone(person.phone) === phone);
    if (!profile) { setMessage(msg, 'No demo account found for that number. Register first on this device.'); return; }
    if (role === 'driver') { state.driverSession = profile.id; state.availability = !!profile.available; }
    else state.passengerSession = profile.id;
    saveState();
    render();
    showToast('You are signed in to your demo account.');
    go(role === 'driver' ? 'driver' : 'book');
  }

  function estimateFare(pickup, destination, passengers) {
    const a = pickup.trim().toLowerCase();
    const b = destination.trim().toLowerCase();
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
    const pickup = String(data.get('pickup') || '').trim();
    const destination = String(data.get('destination') || '').trim();
    if (pickup.length < 2 || destination.length < 2) { setMessage('booking-message', 'Enter a pickup and destination to continue.'); return; }
    if (pickup.toLowerCase() === destination.toLowerCase()) { setMessage('booking-message', 'Pickup and destination must be different.'); return; }
    if (!validZambianPhone(data.get('phone'))) { setMessage('booking-message', 'Enter a valid Zambian mobile number (for example, 97 123 4567).'); return; }
    const fare = estimateFare(pickup, destination, data.get('passengers'));
    state.rides.unshift({ id: `RC-${Date.now().toString(36).toUpperCase()}`, pickup, destination, passengers: Number(data.get('passengers')), phone: normalizePhone(data.get('phone')), fare, status: 'pending', demo: false, passengerId: state.passengerSession || null, createdAt: new Date().toISOString() });
    saveState();
    form.reset();
    updateFare();
    setMessage('booking-message', '');
    render();
    showToast('Demo ride request created. No driver has been contacted.');
  }

  function allRides() {
    const samples = DEMO_REQUESTS.map(ride => ({
      ...ride,
      demo: true,
      status: state.demoStatuses[ride.id]?.status || 'pending',
      driverId: state.demoStatuses[ride.id]?.driverId || null
    }));
    return [...state.rides, ...samples];
  }

  function renderRide(ride, options = {}) {
    const status = escapeHtml(ride.status);
    const driverActions = options.driverActions && ride.status === 'pending'
      ? `<button class="mini-button" data-ride-action="accept" data-ride-id="${escapeHtml(ride.id)}">Accept</button><button class="mini-button reject" data-ride-action="reject" data-ride-id="${escapeHtml(ride.id)}">Reject</button>` : '';
    const cancelAction = options.cancel && ride.status === 'pending'
      ? `<button class="mini-button reject" data-ride-action="cancel" data-ride-id="${escapeHtml(ride.id)}">Cancel</button>` : '';
    const sample = ride.demo ? '<span>Sample scenario</span>' : '';
    return `<article class="request-card"><div class="request-main"><span class="request-id">${escapeHtml(ride.id)}${ride.demo ? ' • SAMPLE' : ''}</span><div class="request-route"><span>● ${escapeHtml(ride.pickup)}</span><span class="route-sep">→</span><span>◆ ${escapeHtml(ride.destination)}</span></div><div class="request-meta"><span>${escapeHtml(ride.passengers)} passenger${ride.passengers === 1 ? '' : 's'}</span><span>Demo estimate: K ${escapeHtml(ride.fare)}</span>${ride.phone ? `<span>${escapeHtml(displayPhone(ride.phone))}</span>` : sample}</div></div><div class="request-actions"><span class="status ${status}">${status}</span>${driverActions}${cancelAction}</div></article>`;
  }

  function renderRequests(elementId, rides, options = {}) {
    const target = document.getElementById(elementId);
    if (!target) return;
    target.innerHTML = rides.length ? rides.map(ride => renderRide(ride, options)).join('') : '<div class="empty-state">No ride requests yet. New demo requests will appear here.</div>';
  }

  function render() {
    const rides = allRides();
    const passengersRides = state.rides.filter(ride => !state.passengerSession || ride.passengerId === state.passengerSession || !ride.passengerId);
    document.getElementById('passenger-request-count').textContent = `${passengersRides.length} request${passengersRides.length === 1 ? '' : 's'}`;
    renderRequests('passenger-requests', passengersRides, { cancel: true });

    const display = state.drivers.find(driver => driver.id === state.driverSession);
    document.getElementById('driver-display-name').textContent = display ? display.name : 'Explore demo requests';
    document.getElementById('driver-avatar').textContent = display ? display.name.trim().charAt(0).toUpperCase() : 'D';
    const toggle = document.getElementById('availability-toggle');
    toggle.checked = !!(display && state.availability);
    toggle.disabled = !display;
    document.getElementById('availability-label').textContent = display ? (state.availability ? 'Available' : 'Unavailable') : 'Register or log in';
    const driverRides = rides.filter(ride => ride.status === 'pending' || (ride.status === 'accepted' && ride.driverId === state.driverSession));
    document.getElementById('driver-request-count').textContent = `${driverRides.length} request${driverRides.length === 1 ? '' : 's'}`;
    renderRequests('driver-requests', driverRides, { driverActions: true });

    document.getElementById('stat-drivers').textContent = state.drivers.length;
    document.getElementById('stat-passengers').textContent = state.passengers.length;
    document.getElementById('stat-rides').textContent = state.rides.length;
    document.getElementById('stat-pending').textContent = state.rides.filter(ride => ride.status === 'pending').length;
    const driversEl = document.getElementById('admin-drivers');
    driversEl.innerHTML = state.drivers.length ? state.drivers.map(driver => `<div class="admin-person"><div><strong>${escapeHtml(driver.name)}</strong><small>${escapeHtml(displayPhone(driver.phone))} • ${escapeHtml(driver.vehicle)} · ${escapeHtml(driver.registration)}</small></div><button class="availability-control ${driver.available ? '' : 'offline'}" data-driver-availability="${escapeHtml(driver.id)}">${driver.available ? 'Available' : 'Unavailable'}</button></div>`).join('') : '<div class="empty-state">No driver profiles registered on this device.</div>';
    const passengersEl = document.getElementById('admin-passengers');
    passengersEl.innerHTML = state.passengers.length ? state.passengers.map(person => `<div class="admin-person"><div><strong>${escapeHtml(person.name)}</strong><small>${escapeHtml(displayPhone(person.phone))}</small></div><small>Passenger</small></div>`).join('') : '<div class="empty-state">No passenger profiles registered on this device.</div>';
    renderRequests('admin-rides', state.rides);
  }

  document.addEventListener('click', event => {
    const goButton = event.target.closest('[data-go], [data-view]');
    if (goButton) {
      event.preventDefault();
      const mode = goButton.dataset.mode || (goButton.closest('.nav-actions') && goButton.textContent.trim().startsWith('Log in') ? 'login' : undefined);
      go(goButton.dataset.go || goButton.dataset.view, mode);
      return;
    }
    const tab = event.target.closest('[data-auth-mode]');
    if (tab) { setAuthMode(tab.dataset.role, tab.dataset.authMode); return; }
    const action = event.target.closest('[data-ride-action]');
    if (action) {
      const ride = allRides().find(item => item.id === action.dataset.rideId);
      if (!ride) return;
      if (!state.driverSession || !state.drivers.some(driver => driver.id === state.driverSession)) {
        showToast('Register or log in as a driver to manage requests.');
        go('driver-auth', 'login');
        return;
      }
      if (action.dataset.rideAction === 'cancel') ride.status = 'cancelled';
      else if (action.dataset.rideAction === 'accept') {
        if (!state.availability) { showToast('Set yourself available before accepting requests.'); return; }
        ride.status = 'accepted';
        ride.driverId = state.driverSession;
      } else if (action.dataset.rideAction === 'reject') ride.status = 'rejected';
      if (ride.demo) state.demoStatuses[ride.id] = { status: ride.status, driverId: ride.driverId || null };
      saveState();
      render();
      showToast(`Demo request ${ride.status}.`);
      return;
    }
    const availabilityButton = event.target.closest('[data-driver-availability]');
    if (availabilityButton) {
      const driver = state.drivers.find(person => person.id === availabilityButton.dataset.driverAvailability);
      if (!driver) return;
      driver.available = !driver.available;
      if (driver.id === state.driverSession) state.availability = driver.available;
      saveState();
      render();
      showToast(`Driver marked ${driver.available ? 'available' : 'unavailable'}.`);
    }
  });

  document.getElementById('menu-toggle').addEventListener('click', event => {
    const menu = document.getElementById('main-nav');
    const open = menu.classList.toggle('open');
    event.currentTarget.setAttribute('aria-expanded', String(open));
  });
  document.getElementById('passenger-auth-form').addEventListener('submit', event => { event.preventDefault(); authSubmit('passenger', event.currentTarget); });
  document.getElementById('driver-auth-form').addEventListener('submit', event => { event.preventDefault(); authSubmit('driver', event.currentTarget); });
  document.getElementById('booking-form').addEventListener('submit', event => { event.preventDefault(); bookingSubmit(event.currentTarget); });
  document.getElementById('booking-form').addEventListener('input', updateFare);
  document.getElementById('booking-form').addEventListener('change', updateFare);
  document.getElementById('availability-toggle').addEventListener('change', event => {
    const driver = state.drivers.find(person => person.id === state.driverSession);
    if (!driver) {
      event.currentTarget.checked = false;
      showToast('Register or log in as a driver to set availability.');
      return;
    }
    state.availability = event.currentTarget.checked;
    driver.available = state.availability;
    saveState();
    render();
    showToast(`You are now ${state.availability ? 'available' : 'unavailable'}.`);
  });

  // The header login button shares the passenger screen with registration but opens its login tab.
  const passengerLoginButton = document.querySelector('.nav-actions [data-go="passenger-auth"]');
  if (passengerLoginButton) passengerLoginButton.dataset.mode = 'login';
  window.addEventListener('hashchange', goFromHash);
  goFromHash();
  render();
  updateFare();
})();
