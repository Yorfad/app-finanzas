# Mis Finanzas

App web simple (y lista para el teléfono) para registrar ingresos y gastos por categorías.
Hecha con React + TypeScript, pensada para reutilizar la lógica en React Native.

## Uso rápido

```bash
npm install
npm run dev
```

`npm run dev` muestra una URL local y otra de red (`http://192.168.x.x:5173`).
Abre la de red en el teléfono (misma Wi-Fi) para probarla.

Para usarla de verdad en el móvil, publícala (ver abajo) y en el navegador elige
**"Añadir a pantalla de inicio"**: se instala como app y funciona sin conexión.

## Qué hace

- **Registrar movimientos**: monto, gasto/ingreso, descripción, categoría y fecha.
- **Categorías propias** con emoji, color y palabras clave.
- **Se organiza sola**:
  - Sugiere la categoría mientras escribes la descripción (aprende de lo que ya registraste
    y de las palabras clave de cada categoría).
  - Atajos de un toque para los movimientos que repites (ej. "Café · $3").
  - Las categorías más usadas aparecen primero.
  - Si no eliges categoría, va a "Otros"; si borras una categoría, sus movimientos pasan a "Otros".
- **Resumen mensual**: ahorro, % ahorrado, gasto diario promedio, comparación con el mes anterior
  y reparto por categoría.
- **Copia de seguridad** en archivo JSON (exportar/importar).
- **Sincronización en la nube opcional** (Supabase), con acceso por enlace al correo.

## Arquitectura

```
src/
├── core/        TypeScript puro: tipos, cálculos, autocategorización, fechas, dinero.
│                Sin React ni navegador → se copia tal cual a React Native.
├── data/        Persistencia
│   ├── storage.ts        StorageDriver (getItem/setItem/removeItem, igual que AsyncStorage)
│   ├── localStore.ts     "Base de datos" local sobre el driver
│   ├── cloud.ts          Interfaces genéricas de nube (RemoteStore, CloudAdapter)
│   ├── syncEngine.ts     Sincronización local-first
│   └── supabaseCloud.ts  Implementación con Supabase (Postgres)
├── state/       FinanceProvider + hooks useFinance()/useMoney(). React sin DOM → reutilizable en RN.
└── web/         Solo la interfaz web (lo único que se reescribe para móvil nativo).
supabase/schema.sql   Tablas + seguridad por usuario para la nube.
```

### Local-first + nube

1. **Todo se guarda primero en el dispositivo** (instantáneo y sin conexión).
2. Cada cambio queda en una cola de pendientes.
3. Si hay sesión en la nube, a los ~1,5 s se suben los pendientes y se bajan los cambios
   de otros dispositivos (usando un cursor `synced_at` que pone el servidor).
4. Conflictos: gana la versión con `updatedAt` más reciente. Los borrados son lógicos
   (`deleted = true`) para que también se sincronicen.
5. Los montos se guardan como **enteros en centavos** (sin errores de redondeo).

Sin configurar la nube, la app funciona 100% local (los datos viven en el navegador de ese
dispositivo: haz copias de seguridad de vez en cuando).

### Activar la nube (Supabase, plan gratuito)

1. Crea un proyecto en <https://supabase.com>.
2. En **SQL Editor** ejecuta `supabase/schema.sql`.
3. En **Authentication → URL Configuration** añade la URL donde publiques la app
   (y `http://localhost:5173` para desarrollo) en *Redirect URLs*.
4. Copia `.env.example` a `.env.local` y pon `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
   (Project Settings → API).
5. Reinicia `npm run dev`. En **Ajustes → Nube** entra con tu correo; tus datos locales se suben solos.

Cambiar de proveedor (Firebase, API propia…) = escribir otro `CloudAdapter`; el resto no cambia.

### Publicar

`npm run build` genera `dist/`, un sitio estático. Sirve en Vercel, Netlify, Cloudflare Pages
o GitHub Pages (en estos últimos define las variables `VITE_SUPABASE_*` en el panel si usas la nube).

### Pasar a React Native

- Copia `core/`, `data/` y `state/` sin cambios.
- Usa `<FinanceProvider driver={AsyncStorage} createCloud={...}>`
  (`@react-native-async-storage/async-storage` tiene la misma interfaz que `StorageDriver`).
  Para muchos datos, se puede hacer un driver sobre SQLite (`expo-sqlite`).
- Supabase funciona igual en RN (para el enlace mágico hay que configurar deep links).
- Reescribe solo las pantallas de `web/` con componentes nativos; los hooks `useFinance()`
  y `useMoney()` se usan igual.
