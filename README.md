# Terramiz · Arte · Piedra · Diseño

Sitio web estático (HTML, CSS y JS sin dependencias) para Terramiz: marmolería, cubiertas de granito, terrazo, lavaderos, mosaicos de pasta y grabados.

- `Sitio/index.html`: página principal
- `Sitio/css/styles.css`: estilos
- `Sitio/js/main.js`: menú móvil, animaciones y formulario de contacto
- `Sitio/js/store.js`: textos e imágenes editables (valores originales) y lectura del contenido desde la API
- `Sitio/js/galeria.js`: sección Galería (las fotos se generan con `tools/galeria.py`)
- `Sitio/img/`: imágenes optimizadas para web
- `api/`: funciones de Vercel (contenido, imágenes, estadísticas, mensajes y respaldo)
- `lib/db.js`: conexión a la base de datos y código compartido de la API

## Panel de administración

Entra a `/admin` (por ejemplo, `terramiz.com/admin`). Desde ahí se editan el banner, los textos, las imágenes y los popups de promociones, y se consultan los mensajes del formulario y las visitas.

Todo se guarda en una base de datos Postgres (Neon, desde el Marketplace de Vercel). Las tablas se crean solas la primera vez.

Variables de entorno en Vercel (Settings → Environment Variables):

- `DATABASE_URL`: la crea la integración de Neon.
- `ADMIN_PASSWORD`: contraseña para entrar al panel.

Para probarlo en local hace falta la API, así que se usa `npx vercel dev` (con las mismas variables en un archivo `.env`). `python3 -m http.server` sólo sirve para ver el diseño: el contenido editable y el panel no funcionan sin la API.
