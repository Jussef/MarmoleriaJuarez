# Terramiz · Arte · Piedra · Diseño

Sitio web estático (HTML, CSS y JS sin dependencias) para Terramiz: marmolería, cubiertas de granito, terrazo, lavaderos, mosaicos de pasta y grabados.

- `Sitio/index.html`: página principal
- `Sitio/css/styles.css`: estilos
- `Sitio/js/main.js`: menú móvil, animaciones y formulario (se envía por WhatsApp)
- `Sitio/img/`: imágenes optimizadas para web
- `Sitio/new-img/`: imágenes originales en alta resolución

Para cambiar el número de WhatsApp, busca `520000000000` en `index.html` y `js/main.js`.

## Panel de administración (demo)

Entra a `/admin` (por ejemplo, `terramiz.com/admin`). Desde ahí se editan el banner, los textos, las imágenes y los popups de promociones, y se consultan los mensajes del formulario y las visitas.

- Por ahora no hay backend: la información se guarda en `localStorage` del navegador (`js/store.js`). Por eso sólo se ve en el mismo navegador donde se editó.
- Para probarlo en local, levanta un servidor: `cd Sitio && python3 -m http.server 8000` y abre `http://localhost:8000/admin/`.
- Para pasar a producción hay que cambiar la implementación de `TZStore` en `js/store.js` por llamadas a una API o base de datos. El sitio y el panel no necesitan cambios.
