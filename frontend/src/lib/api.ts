import { clearToken, getToken } from "./auth-storage";

const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const headers: HeadersInit = {
    ...(options.headers ?? {}),
  };
  const token = getToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  if (options.json !== undefined) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });
  if (res.status === 401) {
    clearToken();
  }
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    let msg = res.statusText;
    if (typeof data === "object" && data !== null && "detail" in data) {
      const d = (data as { detail: unknown }).detail;
      if (Array.isArray(d)) {
        msg = d.map((x: unknown) => (typeof x === "object" && x && "msg" in x ? String((x as { msg: unknown }).msg) : String(x))).join(", ");
      } else {
        msg = String(d);
      }
    }
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export async function apiUploadFile<T>(path: string, formData: FormData): Promise<T> {
  const headers: HeadersInit = {};
  const token = getToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
  if (res.status === 401) {
    clearToken();
  }
  const text = await res.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!res.ok) {
    let msg = res.statusText;
    if (typeof data === "object" && data !== null && "detail" in data) {
      msg = String((data as { detail: unknown }).detail);
    }
    throw new ApiError(msg, res.status, data);
  }
  return data as T;
}

export async function apiDownloadBlob(path: string): Promise<Blob> {
  const headers: HeadersInit = {};
  const token = getToken();
  if (token) {
    (headers as Record<string, string>)["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${base}${path}`, { headers });
  if (res.status === 401) {
    clearToken();
  }
  if (!res.ok) {
    throw new ApiError(res.statusText, res.status);
  }
  return res.blob();
}
