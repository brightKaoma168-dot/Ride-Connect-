/* Restrict driver request filters to statuses used by the driver queue. */
(() => {
  'use strict';

  const driverFilter = document.getElementById('driver-status-filter');
  if (!driverFilter) return;

  const options = [
    ['all', 'All statuses'],
    ['pending', 'Pending'],
    ['accepted', 'Accepted']
  ];
  const previousValue = driverFilter.value;
  driverFilter.replaceChildren(...options.map(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    return option;
  }));
  driverFilter.value = options.some(([value]) => value === previousValue) ? previousValue : 'all';
})();
