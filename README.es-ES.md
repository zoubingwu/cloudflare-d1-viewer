# Visor de Cloudflare D1

Cloudflare D1 Viewer es una aplicación web sencilla que te permite interactuar con tus bases de datos D1 de Cloudflare a través de una interfaz intuitiva. Ofrece una forma práctica de visualizar tus bases de datos D1 sin necesidad de salir de tu navegador. Puedes probarla en [https://cloudflare-d1-viewer.pages.dev/](https://cloudflare-d1-viewer.pages.dev/).

## Características

- Conéctate a tu cuenta de Cloudflare utilizando un token de API.
- Visualiza tus bases de datos SQLite locales directamente desde el navegador.
- Selecciona y visualiza las bases de datos asociadas a tu cuenta.
- Explora las tablas dentro de las bases de datos seleccionadas.
- Paginación de grandes conjuntos de resultados.

## Introducción

### Requisitos previos

- Node.js
- pnpm (versión 9.10.0 o superior)

### Instalación

1. Clona el repositorio:
   ```
   git clone https://github.com/zoubingwu/cloudflare-d1-viewer
   cd cloudflare-d1-viewer
   ```

2. Instala las dependencias:
   ```
   pnpm install
   ```

3. Inicia el servidor de desarrollo:
   ```
   pnpm run watch
   pnpm run dev:pages
   ```

4. Abre tu navegador y accede a `http://localhost:8787`.

## Construcción y despliegue

Para construir el proyecto en modo producción:

```
pnpm build
```

Para desplegarlo en Cloudflare Pages:

```
pnpm deploy
```

## Uso

1. Abre la aplicación en tu navegador.
2. Haz clic en el icono de configuración para abrir el modal "Conectar a Cloudflare".
3. Introduce tu token de API de Cloudflare (con permisos de edición de D1).
4. Selecciona tu cuenta y base de datos desde los desplegables.
5. Explora las tablas y visualiza los datos.

## Nota de seguridad

La aplicación guarda tu token de API en el almacenamiento local del navegador para mayor comodidad. Si no estás de acuerdo con esto, puedes clonar el proyecto y alojarlo en tu propia instancia de Cloudflare Pages.

No necesitas un token de API para visualizar bases de datos SQLite locales, ya que todas las operaciones se realizan localmente en tu navegador.

## Contribuciones

¡Aceptamos contribuciones! No dudes en enviar una solicitud de extracción.

## Licencia

MIT

## Agradecimientos

- Cloudflare por su servicio de bases de datos D1 y su plataforma Workers.
- El equipo de Mantine por su excelente biblioteca de componentes de interfaz de usuario.
- El equipo de React Query por simplificar la obtención de datos.
