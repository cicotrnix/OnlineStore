# Mapa maestro — responsabilidad, envíos y disclaimers

> **⚠️ NO es asesoría legal.** Borrador de trabajo para revisión de abogado en USA. Objetivo: cubrir **toda exposición de responsabilidad** de vender baterías de litio **aftermarket** B2B desde Kon (entidad US) a negocios en LATAM, con disclaimers **claros y concisos**. Cada exposición → el disclaimer corto → dónde aparece. Esto alimenta `docs/legal/*.md` (las 4 páginas) y el copy de punto de venta.
>
> **Regla:** el disclaimer que de verdad cubre ante una disputa es el que el cliente **ve y acepta antes de pagar** — no el enterrado en Terms. Por eso hay capa de punto de venta (PDP + checkout) además de las páginas legales.

## Tabla — exposición → disclaimer → dónde aparece

| # | Exposición de responsabilidad | Disclaimer (conciso) | Dónde aparece |
|---|---|---|---|
| 1 | Uso de marca Apple / parecer producto oficial | "Producto aftermarket. No afiliado, autorizado ni respaldado por Apple Inc. Las marcas son de sus dueños; se usan solo para indicar compatibilidad." | Footer global · Terms §2 · PDP |
| 2 | ~~iOS "Pieza desconocida"~~ — **NO aplica** | El producto son **celdas**: la celda reutiliza el circuito Apple original y el tag-on flex **habilita** la salud de la celda nueva → no aparece el aviso y la salud se muestra. Es un **beneficio de producto** (va en el copy de PDP), no un disclaimer. | — (argumento de venta, no disclaimer) |
| 3 | Daño por instalación incorrecta (el comprador instala/revende) | "Instalación solo por técnicos calificados. No nos responsabilizamos por daños derivados de instalación, manipulación o uso indebidos." | PDP · Terms §8/§9 · inserto de empaque |
| 4 | Seguridad del litio / mal manejo | "Celdas de litio: almacenar y manipular según normas. No usar celdas dañadas, hinchadas o perforadas. Sin responsabilidad por mal uso." | Shipping policy · Terms §8 · empaque |
| 5 | Claim de capacidad (overpromising) | "'Extended Capacity' = mayor capacidad que la batería OEM equivalente, según especificaciones del fabricante (mAh por modelo en la ficha). La autonomía real varía según equipo y uso." | PDP · Terms §10 · ver `claims-map.md` |
| 6 | Alcance de garantía | "Garantía limitada de 12 meses solo por defectos de fabricación. No cubre instalación incorrecta, mal uso, daño físico o por líquidos." | PDP (link) · Refund/Return · Terms §9 |
| 7 | Daños indirectos / al dispositivo | "Responsabilidad total limitada al precio del producto. Sin responsabilidad por daños indirectos, incidentales o al dispositivo donde se instale, ni lucro cesante." | Terms §11 · checkout (link) |
| 8 | Reventa B2B — el comprador re-afirma a SUS clientes | "El comprador es responsable de sus propias representaciones a terceros y del cumplimiento legal en su reventa/instalación; no debe afirmar más allá de lo documentado." | Terms §10/§12 |
| 9 | Validez del tax ID / exención fiscal | "El comprador es el único responsable de la validez de su tax ID / certificado y de cualquier impuesto, multa o interés por una exención inválida; indemniza a Kon por ello." | Terms §7 · onboarding |
| 10 | Envío de litio = mercancía peligrosa | "Productos de litio (UN3480/UN3481, Clase 9). Envío bajo reglas de mercancías peligrosas: solo terrestre, posible recargo de manejo, sin envío aéreo ni a casillas." | Shipping policy · checkout |
| 11 | Riesgo de pérdida / título | "El riesgo pasa al entregar al transportista (FOB origen). Reclamos por daño/pérdida en tránsito se gestionan con el transportista; avisar dentro de [N] días." | Shipping policy · Terms §6 |
| 12 | Export LATAM — importador de registro | "Para destinos fuera de USA, el comprador es el importador de registro y responsable de aranceles, impuestos, aduana y cumplimiento de importación / mercancías peligrosas del destino." | Shipping policy §5 · checkout |
| 13 | Devolución de litio (no se puede mandar suelto) | "Toda devolución requiere RMA. No enviar baterías en empaque común; seguir las instrucciones hazmat del RMA. Celdas usadas/instaladas o dañadas no son retornables." | Refund/Return §2/§5 |
| 14 | Solo negocios / mayor de edad / autoridad | "Plataforma exclusiva B2B. Al registrarte declarás que comprás en el marco de un negocio, que estás autorizado a representarlo y que sos mayor de edad." | Terms §1 · onboarding |
| 15 | Imágenes/specs ilustrativas + compatibilidad | "Imágenes ilustrativas. Las especificaciones provienen de la documentación del fabricante. Confirmá el modelo compatible antes de comprar." | PDP |

## Capa de punto de venta (microcopy — claro y conciso)

### PDP — bloque de disclaimers (bajo el botón de compra)
**en-US:** "Aftermarket replacement cell — not affiliated with Apple. For installation by qualified technicians only (reuses the device's original battery circuit; the tag-on flex enables battery-health reporting). 'Extended Capacity' means higher capacity than the equivalent OEM battery per manufacturer specs; real runtime varies. 12-month limited warranty (manufacturing defects only). See Terms, Warranty & Shipping."

**es-419:** "Celda de reemplazo aftermarket — no afiliada a Apple. Solo para instalación por técnicos calificados (reutiliza el circuito original del equipo; el tag-on flex habilita la lectura de salud de batería). 'Extended Capacity' = mayor capacidad que la batería OEM equivalente según el fabricante; la autonomía real varía. Garantía limitada de 12 meses (solo defectos de fabricación). Ver Términos, Garantía y Envíos."

### Checkout — acknowledgment (checkbox obligatorio antes de pagar)
**en-US:** "I'm purchasing as a business (for resale or repair) and confirm I've read and accept the Terms of Sale, Warranty, Shipping (lithium/hazmat) and Refund policies. I understand these are aftermarket parts and that I'm the importer of record for shipments outside the US."

**es-419:** "Compro como negocio (para reventa o reparación) y confirmo que leí y acepto los Términos de venta, Garantía, Envíos (litio/hazmat) y Devoluciones. Entiendo que son piezas aftermarket y que soy el importador de registro para envíos fuera de USA."

### Factura — pie
**en-US:** "Payment by wire/ACH to the account above (beneficiary: Kon LLC dba PiPower). Lithium goods ship as Class 9 dangerous goods. Returns require an RMA. Limited 12-month warranty; liability limited to product price."

**es-419:** "Pago por wire/ACH a la cuenta indicada (beneficiario: Kon LLC dba PiPower). Mercancía de litio se envía como Clase 9. Las devoluciones requieren RMA. Garantía limitada 12 meses; responsabilidad limitada al precio del producto."

## Gap-check vs las páginas legales existentes (`docs/legal/`)

| Exposición | ¿Cubierta en los drafts? | Acción |
|---|---|---|
| 1 No-Apple | ✓ Terms §2 + (agregar al footer global) | Wirear disclaimer en footer |
| 2 iOS "Unknown Part" | **NO aplica** (celdas reutilizan circuito original; tag-on habilita salud) | Removido de Terms/PDP — es beneficio de producto, no disclaimer |
| 3 Instalación por técnico | ✓ Terms §8/§9 | Reforzar en PDP |
| 4 Seguridad litio | ✓ Terms §8 + Shipping | OK |
| 5 Claim Extended Capacity | parcial (Terms §10) | Alinear con decisión "Extended Capacity sin %"; PDP microcopy |
| 6 Garantía 12 meses | ✓ Terms §9 / Refund (placeholder [N]) | Fijar **12 meses** (norma de industria, ver `industry-reference.md`) |
| 7 Limitación de responsabilidad | ✓ Terms §11 | OK |
| 8 Reventa B2B | ✓ Terms §10/§12 | OK |
| 9 Tax / cert | ✓ Terms §7 | OK |
| 10 Hazmat envío | ✓ Shipping §2 | OK |
| 11 Riesgo de pérdida | ✓ Shipping §4 / Terms §6 | Fijar [N] días de aviso |
| 12 Importador de registro | ✓ Shipping §5 | Reforzar en checkout |
| 13 Devoluciones litio | ✓ Refund §2/§5 | OK |
| 14 Solo B2B / edad | ✓ Terms §1 | Reforzar en onboarding |
| 15 Imágenes/compatibilidad | ✗ no está | **Agregar** a PDP |

**Faltante real (1):** (15) imágenes ilustrativas + confirmar compatibilidad → agregar a PDP. (El #2 iOS "Pieza desconocida" se **descartó**: no aplica a celdas — la celda reutiliza el circuito original y el tag-on flex habilita la salud. Es **argumento de venta**, no disclaimer.) Lo demás ya vive en los drafts; falta fijar placeholders ([N] días de aviso / restocking) y wirear el footer + el acknowledgment de checkout.

## Notas para counsel (validar)
- Limitación de responsabilidad y disclaimer de garantía: confirmar enforceability en el estado de Kon y para venta a negocios extranjeros.
- Acknowledgment de checkout (checkbox) como prueba de aceptación: confirmar que el registro de aceptación quede guardado (fecha + versión de términos).
- Claim de venta "se muestra la salud de batería / sin aviso de Pieza desconocida": es argumento de marketing (PDP), no disclaimer. Redactarlo con precisión — es válido para una celda **bien instalada** reutilizando el circuito original (responsabilidad del técnico), no una garantía absoluta de PiPower.
