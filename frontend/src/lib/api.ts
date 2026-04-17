import { clearToken, getToken } from "./auth-storage";

function apiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  if (typeof window === "undefined") {
    return (process.env.API_PROXY_TARGET ?? "http://127.0.0.1:8000").replace(/\/$/, "");
  }
  return "";
}

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
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      ...options,
      headers,
      body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
    });
  } catch (e) {
    const hint =
      "Could not reach the API. From the repo, start the backend on port 8000 (e.g. `uvicorn app.main:app --reload --port 8000` in the `backend` folder), then refresh. If you use `NEXT_PUBLIC_API_URL`, it must match where the API is running.";
    if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
      throw new ApiError(hint, 0);
    }
    throw e;
  }
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
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, {
      method: "POST",
      headers,
      body: formData,
    });
  } catch (e) {
    const hint =
      "Could not reach the API. Start the backend on port 8000, or fix NEXT_PUBLIC_API_URL.";
    if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
      throw new ApiError(hint, 0);
    }
    throw e;
  }
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
  let res: Response;
  try {
    res = await fetch(`${apiBase()}${path}`, { headers });
  } catch (e) {
    const hint = "Could not reach the API. Start the backend on port 8000, or fix NEXT_PUBLIC_API_URL.";
    if (e instanceof TypeError && String(e.message).toLowerCase().includes("fetch")) {
      throw new ApiError(hint, 0);
    }
    throw e;
  }
  if (res.status === 401) {
    clearToken();
  }
  if (!res.ok) {
    const text = await res.text();
    let msg = res.statusText;
    if (text) {
      try {
        const data = JSON.parse(text) as unknown;
        if (typeof data === "object" && data !== null && "detail" in data) {
          msg = String((data as { detail: unknown }).detail);
        }
      } catch {
        if (text.length < 500) msg = text;
      }
    }
    throw new ApiError(msg, res.status);
  }
  return res.blob();
}
