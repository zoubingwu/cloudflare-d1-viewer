export interface GetUserResponse {
  result: GetUserResult[];
  result_info: GetUserResultInfo;
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface GetUserResult {
  id: string;
  name: string;
  type: string;
  settings: Settings;
  legacy_flags: LegacyFlags;
  created_on: Date;
}

export interface LegacyFlags {
  enterprise_zone_quota: EnterpriseZoneQuota;
}

export interface EnterpriseZoneQuota {
  maximum: number;
  current: number;
  available: number;
}

export interface Settings {
  enforce_twofactor: boolean;
  api_access_enabled: null;
  access_approval_expiry: null;
  use_account_custom_ns_by_default: boolean;
  default_nameservers: string;
  abuse_contact_email: null;
}

export interface GetUserResultInfo {
  page: number;
  per_page: number;
  total_pages: number;
  count: number;
  total_count: number;
}

export interface ListDatabaseResponse {
  result: ListDatabaseResult[];
  result_info: ListDatabaseResultInfo;
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface ListDatabaseResult {
  uuid: string;
  name: string;
  version: string;
  created_at: Date;
  file_size: number;
  num_tables: number;
}

export interface ListDatabaseResultInfo {
  page: number;
  per_page: number;
  count: number;
  total_count: number;
}

export interface RunSQLResponse {
  result: RunSQLResult[];
  success: boolean;
  errors: any[];
  messages: any[];
}

export interface RunSQLResult {
  results: RunSQLResultResults;
  success: boolean;
  meta?: RunSQLResultMeta;
}

export interface RunSQLResultMeta {
  served_by: string;
  duration: number;
  changes: number;
  last_row_id: number;
  changed_db: boolean;
  size_after: number;
  rows_read: number;
  rows_written: number;
}

export interface RunSQLResultResults {
  columns: string[];
  rows: Array<any[]>;
}

export interface ExportDatabaseResponse {
  errors: any[];
  messages: any[];
  result: {
    at_bookmark: string;
    error: string;
    messages: string[];
    result: {
      filename: string;
      signed_url: string;
    };
    status: "active" | "completed" | "error";
    success: boolean;
    type: string;
  };
  success: boolean;
}
