import { dashboardTemplate } from '../templates/dashboard';

export async function handleDashboard(request, env) {
  return new Response(dashboardTemplate, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}