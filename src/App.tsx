import {
  ActionIcon,
  Alert,
  Anchor,
  AppShell,
  Burger,
  Button,
  Group,
  Loader,
  Modal,
  NavLink,
  NumberInput,
  PasswordInput,
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
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconRefresh,
  IconSettings,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import wretch from "wretch";
import { GetUserResponse, ListDatabaseResponse, RunSQLResponse } from "./cf";

const permissions = [{ key: "d1", type: "edit" }];

function generateCloudflareTokenLink(name: string): string {
  const permissionGroupKeys = encodeURIComponent(JSON.stringify(permissions));
  return `https://dash.cloudflare.com/profile/api-tokens?permissionGroupKeys=${permissionGroupKeys}&name=${encodeURIComponent(name)}`;
}

function App() {
  const [navbarOpened, { toggle: toggleNavbar }] = useDisclosure(true);
  const [token, setToken, removeToken] = useLocalStorage<string>({
    key: "cf-api-token",
    getInitialValueInEffect: false,
    defaultValue: "",
  });
  const [value, setValue] = useState<string>(token);
  const [opened, setOpened] = useState(!token);
  const [accountId, setAccountId] = useState<string>("");
  const [databaseId, setDatabaseId] = useState<string>("");
  const [table, setTable] = useState<string>("");
  const [limit, setLimit] = useState<number>(50);
  const [page, setPage] = useState<number>(1);

  const {
    data: accounts,
    isLoading: isLoadingAccounts,
    error: errorAccounts,
  } = useQuery({
    queryKey: ["accounts", token],
    queryFn: () =>
      wretch("/api/client/v4/accounts")
        .headers({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        })
        .get()
        .json<GetUserResponse>(),
    enabled: !!token,
  });

  const {
    data: databases,
    isLoading: isLoadingDatabases,
    error: errorDatabases,
  } = useQuery({
    queryKey: ["databases", accountId],
    queryFn: () =>
      wretch(`/api/client/v4/accounts/${accountId}/d1/database`)
        .headers({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        })
        .get()
        .json<ListDatabaseResponse>(),
    enabled: !!accountId && !!token,
  });

  const {
    data: tablesData,
    isLoading: isLoadingTables,
    error: errorTables,
  } = useQuery({
    queryKey: ["tables", databaseId],
    queryFn: () =>
      wretch(
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
        .json<RunSQLResponse>(),
    enabled: !!accountId && !!databaseId && !!token,
  });

  const tables = useMemo(() => {
    return (
      (tablesData?.result
        .at(0)
        ?.results.rows.flat()
        .filter((i) => i !== "_cf_KV") as string[]) ?? []
    );
  }, [tablesData]);

  const {
    data: selectResult,
    isLoading: isLoadingRows,
    isRefetching: isRefetchingRows,
    error: errorRows,
    refetch: refetchRows,
  } = useQuery({
    queryKey: ["rows", databaseId, table, limit, page],
    queryFn: () =>
      wretch(
        `/api/client/v4/accounts/${accountId}/d1/database/${databaseId}/raw`,
      )
        .headers({
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        })
        .post({
          sql: `SELECT * FROM ${table} LIMIT ? OFFSET ?`,
          params: [limit, (page - 1) * limit],
        })
        .json<RunSQLResponse>(),
    enabled: !!accountId && !!databaseId && !!token && !!table,
  });

  const tableData = useMemo(() => {
    const columns = selectResult?.result.at(0)?.results.columns;
    const rows = selectResult?.result.at(0)?.results.rows;

    return {
      head: columns ?? [],
      body: rows,
      caption: rows && rows.length === 0 ? "No data" : undefined,
    };
  }, [selectResult]);

  useEffect(() => {
    if (accounts?.result.length && !accountId) {
      setAccountId(accounts.result[0].id);
    }
  }, [accounts, accountId]);

  useEffect(() => {
    if (databases?.result.length && !databaseId) {
      setDatabaseId(databases.result[0].uuid);
    }
  }, [databases, databaseId]);

  useEffect(() => {
    if (tables?.length && !table) {
      setTable(tables.at(0)!);
    }
  }, [tables, table]);

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
            <Select
              placeholder="Account"
              size="xs"
              data={accounts?.result.map((account) => ({
                value: account.id,
                label: account.name,
              }))}
              value={accountId}
              onChange={(value) => value && setAccountId(value)}
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
              onChange={(value) => value && setDatabaseId(value)}
              rightSection={
                isLoadingAccounts || isLoadingDatabases ? (
                  <Loader size={12} />
                ) : errorDatabases ? (
                  <IconAlertCircle />
                ) : null
              }
            />
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
              size="xs"
              w={60}
              min={1}
              value={page}
              onChange={(value) => value && setPage(Number(value))}
            />

            <ActionIcon variant="subtle" onClick={() => refetchRows()}>
              <IconRefresh size={16} />
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
        ) : (
          tables.map((i) => (
            <NavLink
              key={i}
              label={i}
              active={i === table}
              color="blue"
              onClick={() => setTable(i)}
            />
          ))
        )}
      </AppShell.Navbar>

      <AppShell.Main>
        {isLoadingAccounts ||
        isLoadingDatabases ||
        isLoadingTables ||
        isLoadingRows ||
        isRefetchingRows ? (
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
            <Table
              stickyHeader
              striped
              highlightOnHover
              withRowBorders={false}
              data={tableData}
            />
          </Table.ScrollContainer>
        )}
      </AppShell.Main>

      <Modal
        opened={opened}
        centered
        title={<Text fw={700}>Connect to Cloudflare</Text>}
        onClose={() => setOpened(false)}
        size="lg"
      >
        <Stack component="form" gap={8}>
          <PasswordInput
            label="API Token"
            placeholder="Enter your API token"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            mb={8}
          />
          <div>
            <Button
              className="mt-2"
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

          <Alert color="blue" mt={8}>
            <Text size="xs" c="blue">
              API token is needed to fetch data using Cloudflare API. We have to
              use a proxy server to avoid CORS issues and your token will only
              be stored in your browser's local storage (not on server, never)
              for user experience. If you are still uncomfortable with that, you
              can clone this project{" "}
              <Anchor
                href="https://github.com/zoubingwu/cloudflare-d1-viewer"
                target="_blank"
                c="blue"
                fw={700}
              >
                here
              </Anchor>{" "}
              and host it on your own Cloudflare Pages.
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
