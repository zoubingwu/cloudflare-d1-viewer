import {
  ActionIcon,
  Alert,
  Anchor,
  AppShell,
  Button,
  Group,
  Loader,
  Modal,
  NavLink,
  NumberInput,
  PasswordInput,
  ScrollArea,
  SegmentedControl,
  Select,
  Skeleton,
  Stack,
  Table,
  Text,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import {
  IconAlertCircle,
  IconExternalLink,
  IconFile,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useMemoizedFn } from "ahooks";
import prettyBytes from "pretty-bytes";
import { useEffect, useMemo, useState } from "react";
import initSqlJs, { Database } from "sql.js";
import wretch from "wretch";
import { GetUserResponse, ListDatabaseResponse, RunSQLResponse } from "./cf";
import { generateCloudflareTokenLink, sleep } from "./helper";

function App() {
  const [navbarOpened, { toggle: toggleNavbar }] = useDisclosure(true);
  const [dbType, setDbType] = useLocalStorage<"cloudflare" | "local">({
    key: "db-type",
    defaultValue: "cloudflare",
    getInitialValueInEffect: false,
  });
  const [localDb, setLocalDb] = useState<Database | null>(null);
  const [loadingLocalDb, setLoadingLocalDb] = useState(false);
  const [localDbFile, setLocalDbFile] = useState<File | null>(null);
  const [token, setToken, removeToken] = useLocalStorage<string>({
    key: "cf-api-token",
    getInitialValueInEffect: false,
    defaultValue: "",
  });
  const [value, setValue] = useState<string>(token);
  const [opened, setOpened] = useState(!token);
  const [accountId, setAccountId] = useState<string>("");
  const [databaseId, setDatabaseId] = useState<string>("");
  const [remoteTable, setRemoteTable] = useState<string>("");
  const [localTable, setLocalTable] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    error: errorAccounts,
  } = useQuery({
    queryKey: ["accounts", token],
    queryFn: async () => {
      const res = await wretch("/api/client/v4/accounts")
        .headers({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        })
        .get()
        .json<GetUserResponse>();

      if (res.result.length && !accountId) {
        setAccountId(res.result[0].id);
      }

      return res;
    },
    enabled: !!token && dbType === "cloudflare",
  });

  const {
    data: databases,
    isLoading: isLoadingDatabases,
    error: errorDatabases,
  } = useQuery({
    queryKey: ["databases", accountId],
    queryFn: async () => {
      const res = await wretch(
        `/api/client/v4/accounts/${accountId}/d1/database`,
      )
        .headers({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        })
        .get()
        .json<ListDatabaseResponse>();

      if (res?.result.length && !databaseId) {
        const defaultDb = res.result.at(0);
        if (defaultDb) {
          setDatabaseId(defaultDb.uuid);
        }
      }

      return res;
    },
    enabled: !!accountId && !!token && dbType === "cloudflare",
  });

  const shouldFetchRemoteTables =
    !!accountId && !!databaseId && !!token && dbType === "cloudflare";
  const shouldFetchLocalTables = !!localDb && dbType === "local";

  const {
    data: tablesData,
    isLoading: isLoadingTables,
    error: errorTables,
  } = useQuery({
    queryKey: ["tables", databaseId, dbType, localDb],
    queryFn: async () => {
      if (dbType === "cloudflare") {
        const res = await wretch(
          `/api/client/v4/accounts/${accountId}/d1/database/${databaseId}/raw`,
        )
          .headers({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          })
          .post({
            sql: 'SELECT name FROM sqlite_master WHERE type="table"',
            params: [],
          })
          .json<RunSQLResponse>();

        if (res.result?.at(0)?.results.rows.length) {
          const defaultTable = res.result
            .at(0)
            ?.results.rows.flat()
            .find((i) => i !== "_cf_KV");
          if (defaultTable) {
            setRemoteTable(defaultTable as string);
          }
        }
        return res;
      }

      await sleep(300);

      try {
        const res = localDb?.exec(
          `SELECT name FROM sqlite_master WHERE type="table"`,
        );

        if (res?.at(0)?.values.length) {
          setLocalTable(res.at(0)?.values.flat().at(0) as string);
        }

        return Promise.resolve({
          success: true,
          errors: [] as any[],
          messages: [] as any[],
          result: [
            {
              results: {
                columns: res?.at(0)?.columns ?? [],
                rows: res?.at(0)?.values ?? [],
              },
              success: true,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching tables from local SQLite:", error);
        return Promise.resolve({
          success: false,
          errors: [error] as any[],
          messages: ["Error fetching tables from local SQLite"] as any[],
          result: [] as any[],
        });
      }
    },
    enabled: shouldFetchRemoteTables || shouldFetchLocalTables,
  });

  const tables = useMemo(() => {
    return (
      (tablesData?.result
        .at(0)
        ?.results.rows.flat()
        .filter((i: any) => i !== "_cf_KV") as string[]) ?? []
    );
  }, [tablesData]);

  const shouldFetchFetchRemoteData = shouldFetchRemoteTables && !!remoteTable;
  const shouldFetchFetchLocalData = shouldFetchLocalTables && !!localTable;

  const {
    data: selectResult,
    isLoading: isLoadingRows,
    isRefetching: isRefetchingRows,
    error: errorRows,
    refetch: refetchRows,
  } = useQuery({
    queryKey: [
      "rows",
      databaseId,
      remoteTable,
      localTable,
      limit,
      page,
      dbType,
      localDb,
    ],
    queryFn: async () => {
      if (dbType === "cloudflare") {
        return wretch(
          `/api/client/v4/accounts/${accountId}/d1/database/${databaseId}/raw`,
        )
          .headers({
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          })
          .post({
            sql: `SELECT * FROM ${remoteTable} LIMIT ? OFFSET ?`,
            params: [limit, (page - 1) * limit],
          })
          .json<RunSQLResponse>();
      }

      await sleep(300);

      try {
        const res = localDb?.exec(
          `SELECT * FROM ${localTable} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        );

        return Promise.resolve({
          success: true,
          errors: [] as any[],
          messages: [] as any[],
          result: [
            {
              results: {
                columns: res?.at(0)?.columns ?? [],
                rows: res?.at(0)?.values ?? [],
              },
              success: true,
            },
          ],
        });
      } catch (error) {
        console.error("Error fetching data from local SQLite:", error);
        return Promise.resolve({
          success: false,
          errors: [error] as any[],
          messages: ["Error fetching data from local SQLite"] as any[],
          result: [
            {
              results: {
                columns: [],
                rows: [],
              },
              success: false,
            },
          ],
        });
      }
    },
    enabled: shouldFetchFetchRemoteData || shouldFetchFetchLocalData,
  });

  const data = useMemo(() => {
    // return generateMockTableData(20, 100); // 20 columns, 100 rows
    const columns = selectResult?.result.at(0)?.results.columns;
    const rows = selectResult?.result.at(0)?.results.rows;

    return {
      head: columns ?? [],
      body: rows ?? [],
    };
  }, [selectResult]);

  const handleOpenLocalSQLiteFile = useMemoizedFn(async () => {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [
          {
            description: "SQLite Database",
            accept: { "application/x-sqlite3": [".sqlite", ".db"] },
          },
        ],
      });
      setLoadingLocalDb(true);
      const file = await fileHandle.getFile();
      setLocalDbFile(file);
      const arrayBuffer = await file.arrayBuffer();
      const SQL = await initSqlJs({
        locateFile: (file) => `/${file}`,
      });
      const db = new SQL.Database(new Uint8Array(arrayBuffer));
      setLocalDb(db);
      setOpened(false);
    } catch (error) {
      console.error("Error opening SQLite file: ", error);
    } finally {
      setLoadingLocalDb(false);
    }
  });

  useEffect(() => {
    const error = errorAccounts || errorDatabases || errorRows || errorTables;
    if (error) {
      // @ts-ignore
      alert(error.json?.errors?.[0]?.message);
    }
  }, [errorAccounts, errorDatabases, errorRows, errorTables]);

  return (
    <AppShell
      header={{ height: 48 }}
      navbar={{
        width: 200,
        breakpoint: "sm",
        collapsed: { mobile: !navbarOpened, desktop: !navbarOpened },
      }}
    >
      <AppShell.Header py={8} px={16}>
        <Group justify="space-between">
          <Group>
            <ActionIcon variant="subtle" onClick={() => toggleNavbar()}>
              {navbarOpened ? (
                <IconLayoutSidebarLeftCollapse size={16} />
              ) : (
                <IconLayoutSidebarLeftExpand size={16} />
              )}
            </ActionIcon>

            <SegmentedControl
              data={[
                { label: "Cloudflare D1", value: "cloudflare" },
                { label: "Local SQLite", value: "local" },
              ]}
              value={dbType}
              onChange={(value) => setDbType(value as "cloudflare" | "local")}
              size="xs"
            />

            {dbType === "cloudflare" && (
              <>
                <Select
                  placeholder="Account"
                  size="xs"
                  data={accounts?.result.map((account) => ({
                    value: account.id,
                    label: account.name,
                  }))}
                  value={accountId}
                  onChange={(value) => value && setAccountId(value)}
                  withCheckIcon={false}
                  rightSection={
                    isLoadingAccounts ? (
                      <Loader size={12} />
                    ) : errorAccounts ? (
                      <IconAlertCircle />
                    ) : null
                  }
                />
                <Select
                  placeholder="Database"
                  size="xs"
                  data={databases?.result.map((db) => ({
                    value: db.uuid,
                    label: db.name,
                  }))}
                  value={databaseId}
                  onChange={(value) => {
                    if (value) {
                      setDatabaseId(value);
                      setRemoteTable("");
                    }
                  }}
                  withCheckIcon={false}
                  rightSection={
                    isLoadingAccounts || isLoadingDatabases ? (
                      <Loader size={12} />
                    ) : errorDatabases ? (
                      <IconAlertCircle />
                    ) : null
                  }
                />
              </>
            )}
            {dbType === "local" && (
              <Button
                size="xs"
                variant="subtle"
                onClick={handleOpenLocalSQLiteFile}
                leftSection={<IconFile size={16} />}
                loading={loadingLocalDb}
                loaderProps={{ variant: "dots" }}
              >
                {localDbFile
                  ? `${localDbFile.name} (${prettyBytes(localDbFile.size, { space: false, maximumFractionDigits: 1 })})`
                  : "Open SQLite File"}
              </Button>
            )}

            <ActionIcon
              variant="subtle"
              title="Clear Token"
              onClick={() => {
                setOpened(true);
              }}
            >
              <IconSettings size={16} />
            </ActionIcon>
          </Group>

          <Group>
            <Select
              placeholder="Limit"
              title="Limit"
              size="xs"
              w={60}
              data={[
                { value: "10", label: "10" },
                { value: "25", label: "25" },
                { value: "50", label: "50" },
                { value: "100", label: "100" },
                { value: "200", label: "200" },
                { value: "500", label: "500" },
              ]}
              value={limit.toString()}
              onChange={(value) => value && setLimit(parseInt(value))}
            />

            <NumberInput
              placeholder="Page"
              title="Page"
              size="xs"
              w={50}
              min={1}
              value={page}
              onChange={(value) => value && setPage(Number(value))}
            />

            <ActionIcon variant="subtle" onClick={() => refetchRows()}>
              {isRefetchingRows ? (
                <Loader size={12} />
              ) : (
                <IconRefresh size={16} />
              )}
            </ActionIcon>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={0}>
        {isLoadingAccounts || isLoadingDatabases || isLoadingTables ? (
          <Stack p={8}>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </Stack>
        ) : tables.length > 0 ? (
          tables.map((i) => (
            <NavLink
              key={i}
              label={i}
              active={
                dbType === "cloudflare" ? i === remoteTable : i === localTable
              }
              color="blue"
              onClick={() => {
                if (dbType === "cloudflare") {
                  setRemoteTable(i);
                } else {
                  setLocalTable(i);
                }
              }}
            />
          ))
        ) : (
          <Text c="dimmed" size="xs" p={8}>
            No tables found
          </Text>
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        {isLoadingAccounts ||
        isLoadingDatabases ||
        isLoadingTables ||
        isLoadingRows ? (
          <Stack p={16}>
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
            <Skeleton height={16} />
          </Stack>
        ) : (
          <Table.ScrollContainer minWidth="100%">
            {data.head.length > 0 && data.body.length > 0 ? (
              <Table striped highlightOnHover withRowBorders={false}>
                <Table.Thead>
                  <Table.Tr>
                    {data.head.map((i) => (
                      <Table.Th key={i}>{i}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {data.body.map((i, index) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: <explanation>
                    <Table.Tr key={index}>
                      {i.map((j) => (
                        <Table.Td key={j}>
                          <ScrollArea.Autosize mah={100}>
                            {j.toString()}
                          </ScrollArea.Autosize>
                        </Table.Td>
                      ))}
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            ) : (
              <Text c="dimmed" size="xs" p={8}>
                No data found
              </Text>
            )}
          </Table.ScrollContainer>
        )}
      </AppShell.Main>

      <Modal
        opened={opened}
        centered
        title={<Text fw={700}>Connect to Database</Text>}
        onClose={() => setOpened(false)}
        size="lg"
      >
        <Stack component="form" gap={8}>
          <PasswordInput
            label="API Token"
            placeholder="Enter your API token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<CloudflareIcon width={16} height={16} />}
              rightSection={<IconExternalLink size={16} />}
              onClick={() => {
                window.open(
                  generateCloudflareTokenLink(`Cloudflare D1 Viewer`),
                  "_blank",
                );
              }}
            >
              Create an API Token on Cloudflare with D1:Edit permission
            </Button>
          </div>

          <Alert
            color="blue"
            mt={8}
            title="Why do I need an API token?"
            icon={<IconAlertCircle size={16} />}
          >
            <Text size="xs" c="blue">
              An API token is required to fetch data via the Cloudflare API. We
              use a proxy server to address CORS issues. For your convenience,
              your token will be stored only in your browser's local
              storage—never on our servers. If you're still uncomfortable with
              that, this is an <b>open source</b> project and you can always
              clone it{" "}
              <Anchor
                href="https://github.com/zoubingwu/cloudflare-d1-viewer"
                target="_blank"
                c="blue"
                fw={700}
              >
                here
              </Anchor>{" "}
              and run it locally or host it on your own Cloudflare Pages
              instance.
            </Text>
          </Alert>

          <Alert
            color="blue"
            title="Local SQLite"
            icon={<IconAlertCircle size={16} />}
          >
            <Text size="xs" c="blue">
              If you are using local SQLite, all operations are performed purely
              in your browser. No data will be sent to the server.
            </Text>
          </Alert>

          <Group justify="flex-end">
            <Button
              variant="outline"
              size="xs"
              mt={16}
              onClick={() => {
                removeToken();
                window.location.reload();
              }}
            >
              Remove token from local storage
            </Button>

            <Button
              size="xs"
              mt={16}
              disabled={!value}
              onClick={() => {
                setToken(value);
                setOpened(false);
              }}
            >
              Save
            </Button>
          </Group>
        </Stack>
      </Modal>
    </AppShell>
  );
}

function CloudflareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      role="img"
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 128 128"
    >
      <title>Cloudflare</title>
      <path
        fill="#fff"
        d="m115.679 69.288l-15.591-8.94l-2.689-1.163l-63.781.436v32.381h82.061z"
      />
      <path
        fill="#f38020"
        d="M87.295 89.022c.763-2.617.472-5.015-.8-6.796c-1.163-1.635-3.125-2.58-5.488-2.689l-44.737-.581c-.291 0-.545-.145-.691-.363s-.182-.509-.109-.8c.145-.436.581-.763 1.054-.8l45.137-.581c5.342-.254 11.157-4.579 13.192-9.885l2.58-6.723c.109-.291.145-.581.073-.872c-2.906-13.158-14.644-22.97-28.672-22.97c-12.938 0-23.913 8.359-27.838 19.952a13.35 13.35 0 0 0-9.267-2.58c-6.215.618-11.193 5.597-11.811 11.811c-.145 1.599-.036 3.162.327 4.615C10.104 70.051 2 78.337 2 88.549c0 .909.073 1.817.182 2.726a.895.895 0 0 0 .872.763h82.57c.472 0 .909-.327 1.054-.8z"
      />
      <path
        fill="#faae40"
        d="M101.542 60.275c-.4 0-.836 0-1.236.036c-.291 0-.545.218-.654.509l-1.744 6.069c-.763 2.617-.472 5.015.8 6.796c1.163 1.635 3.125 2.58 5.488 2.689l9.522.581c.291 0 .545.145.691.363s.182.545.109.8c-.145.436-.581.763-1.054.8l-9.924.582c-5.379.254-11.157 4.579-13.192 9.885l-.727 1.853c-.145.363.109.727.509.727h34.089c.4 0 .763-.254.872-.654c.581-2.108.909-4.325.909-6.614c0-13.447-10.975-24.422-24.458-24.422"
      />
    </svg>
  );
}

export default App;
