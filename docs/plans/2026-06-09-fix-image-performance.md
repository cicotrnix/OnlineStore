# Fix performance — imágenes de producto lentas (1 MB c/u)

> Brief Cowork → Claude Code CLI. Branch nueva desde `main`. Gate verde. No mergear.
> **Problema medido:** cada PNG en `public/products/*.png` pesa **~1 MB** (14 archivos, ~14.6 MB total). Se sirven vía `<img>` plano, sin optimizar, desde el VPS. El catálogo (grilla con muchas) se arrastra. Además `sharp` no está instalado → el `next/image` existente (logos) usa el fallback WASM lento.

## Causa

1. Imágenes de producto: `ProductCard.tsx` y `products/[slug]/page.tsx` (y `cart/page.tsx`) usan `<img src={product.imageUrl}>` plano → 0 optimización, 0 lazy-load, 1 MB por imagen.
2. `sharp` ausente en `package.json` → `next/image` (logo, hero del home, header) cae al optimizador WASM lento en prod.

## Fix

### 1. Instalar sharp

`pnpm add sharp` (dependencia normal, no dev). Confirmar que el build de Docker/Coolify lo incluye (está en `dependencies`, debería). Esto solo ya acelera los `next/image` actuales y borra el warning de los logs.

### 2. Convertir imágenes de producto a `next/image`

En `components/commerce/ProductCard.tsx`, `app/(storefront)/products/[slug]/page.tsx`, y `app/(storefront)/cart/page.tsx`: reemplazar `<img src={product.imageUrl} ... />` por `next/image`.

- Verificar el formato de `product.imageUrl`: si es path local (`/products/x.png`) → `next/image` directo. Si alguno es URL externa → agregar `images.remotePatterns` en `next.config`.
- Patrón con contenedor sizeado (las cards ya tienen un wrapper con tamaño): usar `fill` + `sizes`:

```tsx
import Image from 'next/image'
// dentro del wrapper relativo con tamaño fijo:
<div className="relative aspect-square w-full overflow-hidden rounded-...">
  <Image
    src={product.imageUrl}
    alt={product.name}
    fill
    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 240px"
    className="object-cover"
  />
</div>
```

- En la grilla (ProductCard), dejar lazy-load por default (no poner `priority`). En el PDP, la imagen principal puede llevar `priority` (es above-the-fold).
- Ajustar `sizes` al ancho real de cada uso (card chica vs PDP grande) para que Next sirva la resolución correcta.

### 3. (Opcional, recomendado) Pre-optimizar las fuentes

Los PNG fuente de 1 MB siguen pesando en el repo/build y en el primer request que sharp procesa. Opcional: convertir los `public/products/*.png` a webp redimensionado (ej. ancho máx 800px) para bajar el peso fuente. No es bloqueante —`next/image` ya sirve versiones chicas— pero aliviana repo y primer render. Si se hace, actualizar `product.imageUrl`/loader a las nuevas rutas.

## Aceptación (gate — frenar si algo es rojo)

1. `pnpm format` + `pnpm lint && pnpm typecheck && pnpm test && STORE_ID=pipower pnpm build` verdes.
2. `sharp` en `dependencies` de `package.json`.
3. Cero `<img>` planos para imágenes de producto en ProductCard / PDP / cart (todas vía `next/image`). El warning de sharp desaparece del log de arranque.
4. Verificación manual/local: catálogo carga las imágenes notablemente más rápido; en el navegador, las imágenes servidas son webp y de tamaño reducido (no 1 MB).
5. Sin tocar `MAINTENANCE_MODE`, schema, pagos. No romper el layout de las cards (mismo aspecto visual).
6. Commit(s) chicos. Push + PR. **No mergear** — review en Cowork.
