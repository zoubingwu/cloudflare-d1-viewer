# Cloudflare D1 Viewer

Cloudflare D1 Viewer is a simple web app that allows you to interact with your Cloudflare D1 databases through a user-friendly interface. It provides a convenient way to view your D1 databases without leaving your browser. You can try it out at [https://cloudflare-d1-viewer.pages.dev/](https://cloudflare-d1-viewer.pages.dev/).

## Features

- Connect to your Cloudflare account using an API token
- View your local SQLite databases purely in browser
- Select and view databases associated with your account
- Browse tables within selected databases
- Paginate through large result sets

## Getting Started

### Prerequisites

- Node.js
- pnpm (version 9.10.0 or later)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/zoubingwu/cloudflare-d1-viewer
   cd cloudflare-d1-viewer
   ```

2. Install dependencies:
   ```
   pnpm install
   ```

3. Start the development server:
   ```
   pnpm run watch
   pnpm run dev:pages
   ```

4. Open your browser and navigate to `http://localhost:8787`

## Building and Deploying

To build the project for production:

```
pnpm build
```

To deploy to Cloudflare Pages:

```
pnpm deploy
```

## Usage

1. Open the application in your browser
2. Click on the settings icon to open the "Connect to Cloudflare" modal
3. Enter your Cloudflare API token (with D1:Edit permission)
4. Select your account and database from the dropdowns
5. Browse tables and view data

## Security Note

The application stores your API token in your browser's local storage for convenience. If you're uncomfortable with this, you can clone the project and host it on your own Cloudflare Pages instance.

You don't need API token to view local SQLite databases and all operations are performed locally in your browser.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgements

- Cloudflare for their D1 database service and Workers platform
- The Mantine team for their excellent UI library
- The React Query team for simplifying data fetching
