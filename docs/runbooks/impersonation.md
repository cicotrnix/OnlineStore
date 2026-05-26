# Runbook · Impersonation

Cómo y cuándo el platform admin "ve como cliente X".

## Cuándo usar

- Soporte: el cliente reporta un bug visible solo con sus precios negociados o su catálogo.
- QA pre-deploy: verificar que un cambio de pricing/catálogo se ve correcto desde la org.
- Demos a stakeholders internos.

## Cuándo NO usar

- Para hacer compras a nombre del cliente. Impersonation **deshabilita** "Agregar al carrito" y bloquea checkout. Si necesitas colocar una orden a nombre del cliente, ese flujo va a Fase 2+ (Order-on-behalf).
- Sin razón documentada. Cada START registra el `reason` para auditoría.

## Cómo iniciar

1. `/admin/customers` → click en la org cliente.
2. Sección "Impersonation" abajo → ingresa motivo (ej: "ticket #1234 — precio incorrecto").
3. Click "Ver storefront como esta org".
4. Sistema inserta `ImpersonationLog(action='START', reason)` y setea `Session.impersonatingOrgId`.
5. Redirect a `/catalog`. Banner amarillo arriba: "Viendo como {org}".

## Cómo terminar

- Click "Salir" en el banner amarillo.
- O cierra sesión.
- O espera 30 min de inactividad — middleware auto-expira e inserta `STOP` con `reason="auto-expired"`.

## Audit

Consulta SQL:

```sql
SELECT l."createdAt", u.email AS admin, o.name AS target_org, l.action, l.reason
FROM "ImpersonationLog" l
JOIN "User" u ON u.id = l."adminUserId"
JOIN "Organization" o ON o.id = l."targetOrgId"
ORDER BY l."createdAt" DESC
LIMIT 100;
```

Reportar a compliance trimestralmente.

## Limitaciones conocidas

- Multi-tab: si el admin tiene 2 tabs abiertas e impersonalsona en una, la otra refleja el cambio al refresh.
- Multi-dispositivo: cada device es su propio Session. Acciones en laptop no se propagan a phone hasta que cada Session refresca su estado.
- Cart aislado: el cart del admin **no se modifica** durante impersonation (la mutación está bloqueada).
