import { dashboardTemplate } from '../template/dashboard';

export async function handleDashboard(request, env) {
  return new Response(dashboardTemplate, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
    },
  });
}