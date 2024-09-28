export function generateMockTableData(columnCount: number, rowCount: number) {
  const lorem =
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.";

  const head = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);

  const body = Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, colIndex) => {
      if (colIndex === 0) return `Row ${rowIndex + 1}`;
      if (colIndex === 1) return rowIndex * 1000000;
      if (colIndex === 2) return new Date(2024, 0, rowIndex + 1).toISOString();
      return lorem.slice(0, Math.random() * lorem.length + 50);
    }),
  );

  return { head, body };
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const permissions = [{ key: "d1", type: "edit" }];

export function generateCloudflareTokenLink(name: string): string {
  const permissionGroupKeys = encodeURIComponent(JSON.stringify(permissions));
  return `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${permissionGroupKeys}&name=${encodeURIComponent(name)}`;
}
