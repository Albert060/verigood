// Helpers compartidos entre specs e2e.
// Asume seed dev_demo_data.sql aplicado:
//   admin@verigood.com / demo1234
//   profesor@verigood.com / demo1234

const ADMIN = { email: 'admin@verigood.com', password: 'demo1234' };
const PROFESOR = { email: 'profesor@verigood.com', password: 'demo1234' };

// Login UI normal (rellena formulario y espera redirección).
const loginAs = async (page, user) => {
  await page.goto('/login');
  await page.getByPlaceholder(/correo|email/i).fill(user.email);
  await page.getByPlaceholder(/contraseña|password/i).fill(user.password);
  await page.getByRole('button', { name: /entrar|iniciar|login/i }).click();
  // Tras login redirige según rol. Esperamos cualquier landing del dashboard.
  await page.waitForURL(/\/(dashboard|superadmin)/);
};

module.exports = { ADMIN, PROFESOR, loginAs };
