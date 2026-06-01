# ADR 0032 — Step-up auth: email-OTP + sensitive action token

Fecha: 2026-06-01 (Fase 5 Corte 2)

## Estado

Aceptado.

## Contexto

Auth.js v5 actual usa magic-link passwordless. Suficiente para login + navegación. **Insuficiente** para acciones irreversibles que mueven dinero (refunds), cierran libros (close period) o exponen secretos (rotar webhook secret). El estándar PSDD exige re-auth fresca + token de acción sensible con TTL corto.

## Decisión

- Sub-módulo `modules/payments/step-up` con dos funciones:
  - `issueSensitiveActionToken({userId, action, subjectId}) → {token, otp, expiresAt}`. Emite token opaco (32 bytes random) + OTP 6-dígitos. Persiste **solo hashes SHA-256** + TTL 10 min + estado `ISSUED`. Envía OTP por email (Resend).
  - `consumeSensitiveActionToken({token, otp, userId, action, subjectId}): boolean`. Verifica hash + TTL + scope exacto (action+subjectId+userId). Marca USED al primer consumo.
- **Scope obligatorio**: un token para `payment.refund:p1` **no** vale para `payment.refund:p2`.
- **Single-use**: status `USED` bloquea reusar.
- **TTL 10 min**: balance entre UX (admin abre dashboard, decide refund, mira email) y exposición.
- **Hashes en DB**, no plaintext. Sin riesgo si el DB se filtra.

## Consecuencias

- Refund requiere 3 ingredientes: sesión magic-link válida + token + OTP del correo.
- Si admin pierde acceso al email → no puede refundear → fallback humano (otro admin).
- Patrón reusable para futuras acciones (cerrar período, rotar webhook secret, exportar dump).

## Alternativas descartadas

- TOTP (Authenticator app): mejor seguridad pero requiere onboarding por user. Diferido a Fase 6+.
- WebAuthn: idéntico — diferido.
- Sin step-up para refund: viola PSDD §16; refund es la acción de mayor blast radius.
