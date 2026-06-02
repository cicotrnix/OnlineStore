/**
 * HTML inline para la respuesta 503 de mantenimiento. Edge-safe (sin
 * importar componentes React). Marca PiPower + verde #88D810 + noindex.
 */
export const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>PiPower — Próximamente</title>
  <style>
    :root { --accent: #88D810; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; height: 100%; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; color: #111827; }
    .wrap { min-height: 100%; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { max-width: 480px; width: 100%; background: #fff; border-radius: 16px; padding: 40px 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); text-align: center; }
    .logo { display: inline-flex; align-items: center; justify-content: center; }
    .logo img { height: 80px; width: auto; }
    .accent { display: block; width: 64px; height: 4px; border-radius: 999px; background: var(--accent); margin: 20px auto; }
    h1 { font-size: 22px; font-weight: 500; margin: 16px 0 8px; letter-spacing: -0.01em; }
    p { font-size: 14px; color: #4b5563; line-height: 1.55; margin: 0; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card" role="status" aria-live="polite">
      <div class="logo">
        <img src="/logo-pipower.png" alt="PiPower" />
      </div>
      <span class="accent" aria-hidden="true"></span>
      <h1>Estamos preparando la tienda mayorista</h1>
      <p>Volvé pronto. Si tenés un link de acceso anticipado, abrilo para entrar.</p>
    </section>
  </main>
</body>
</html>`
