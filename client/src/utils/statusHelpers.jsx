import {
  ClockIcon,
  CheckIcon,
  CheckCircleIcon,
  ChefHatIcon,
  PackageIcon,
  TruckIcon,
  MapPinIcon,
  CloseIcon,
} from '../components/icons';

/**
 * Get status badge info (label, icon component, badge color class)
 * @param {string} status - Status in snake_case (e.g., 'ready_for_pickup')
 * @returns {object} - { label: string, Icon: Component|null, badgeColor: string }
 */
export const getStatusBadge = (status) => {
  const badges = {
    pending: { label: 'Pending', Icon: ClockIcon, badgeColor: 'status-pending' },
    confirmed: { label: 'Confirmed', Icon: CheckIcon, badgeColor: 'status-confirmed' },
    preparing: { label: 'Preparing', Icon: ChefHatIcon, badgeColor: 'status-preparing' },
    ready_for_pickup: { label: 'Ready for Pickup', Icon: PackageIcon, badgeColor: 'status-ready' },
    picked_up: { label: 'Picked up', Icon: CheckIcon, badgeColor: 'status-picked' },
    on_the_way: { label: 'On the Way', Icon: TruckIcon, badgeColor: 'status-way' },
    arrived: { label: 'Arrived', Icon: MapPinIcon, badgeColor: 'status-arrived' },
    delivered: { label: 'Delivered', Icon: CheckCircleIcon, badgeColor: 'status-delivered' },
    cancelled: { label: 'Cancelled', Icon: CloseIcon, badgeColor: 'status-cancelled' },
  };

  return badges[status] || { label: status, Icon: null, badgeColor: 'status-default' };
};

/**
 * Get display node for status (icon + human-readable label)
 * @param {string} status - Status in snake_case
 * @returns {JSX.Element} - <><Icon /> Delivered</>
 */
export const getStatusLabel = (status) => {
  const badge = getStatusBadge(status);
  return (
    <>
      {badge.Icon ? <badge.Icon size={14} className="status-badge-icon" /> : null}
      {badge.label}
    </>
  );
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
