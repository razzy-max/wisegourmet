/**
 * Convert snake_case status to human-readable label with emoji
 * @param {string} status - Status in snake_case (e.g., 'ready_for_pickup')
 * @returns {object} - { label: string, emoji: string, badgeColor: string }
 */
export const getStatusBadge = (status) => {
  const badges = {
    pending: { label: 'Pending', emoji: '⏳', badgeColor: 'status-pending' },
    confirmed: { label: 'Confirmed', emoji: '✓', badgeColor: 'status-confirmed' },
    preparing: { label: 'Preparing', emoji: '👨‍🍳', badgeColor: 'status-preparing' },
    ready_for_pickup: { label: 'Ready for Pickup', emoji: '📦', badgeColor: 'status-ready' },
    picked_up: { label: 'Picked up', emoji: '✓', badgeColor: 'status-picked' },
    on_the_way: { label: 'On the Way', emoji: '🚚', badgeColor: 'status-way' },
    arrived: { label: 'Arrived', emoji: '📍', badgeColor: 'status-arrived' },
    delivered: { label: 'Delivered', emoji: '✓', badgeColor: 'status-delivered' },
    cancelled: { label: 'Cancelled', emoji: '✕', badgeColor: 'status-cancelled' },
  };

  return badges[status] || { label: status, emoji: '•', badgeColor: 'status-default' };
};

/**
 * Get display text for status (human-readable, with emoji)
 * @param {string} status - Status in snake_case
 * @returns {string} - Display text like "✓ Delivered"
 */
export const getStatusLabel = (status) => {
  const badge = getStatusBadge(status);
  return `${badge.emoji} ${badge.label}`;
};

/**
 * Get CSS class for status badge color
 * @param {string} status - Status in snake_case
 * @returns {string} - CSS class name
 */
export const getStatusBadgeClass = (status) => {
  return getStatusBadge(status).badgeColor;
};

/**
 * Get status stepper circle CSS class (filled green, amber, or empty gray)
 * @param {string} currentStatus - Current status in snake_case
 * @param {string} stepStatus - Step status in snake_case
 * @returns {string} - CSS class like 'stepper-circle-done', 'stepper-circle-current', 'stepper-circle-future'
 */
export const getStepperCircleClass = (currentStatus, stepStatus) => {
  // Define the order of statuses in the timeline
  const statusOrder = [
    'pending',
    'confirmed',
    'preparing',
    'ready_for_pickup',
    'picked_up',
    'on_the_way',
    'arrived',
    'delivered',
  ];

  const currentIndex = statusOrder.indexOf(currentStatus);
  const stepIndex = statusOrder.indexOf(stepStatus);

  if (stepIndex < currentIndex) {
    return 'stepper-circle-done';
  } else if (stepIndex === currentIndex) {
    return 'stepper-circle-current';
  } else {
    return 'stepper-circle-future';
  }
};
