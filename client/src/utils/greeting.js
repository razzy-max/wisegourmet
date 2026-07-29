export function buildGreeting({ isAuthenticated, fullName } = {}) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const firstName = isAuthenticated ? String(fullName || '').trim().split(/\s+/)[0] : '';

  return firstName ? `${timeOfDay}, ${firstName}` : timeOfDay;
}
