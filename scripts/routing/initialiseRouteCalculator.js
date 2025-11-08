import { createRouteCalculator } from './routeCalculator.js';

export function initialiseRouteCalculator() {
  const root = document.querySelector('[data-role="route-calculator"]');
  if (!root) {
    return null;
  }

  return createRouteCalculator(root);
}
