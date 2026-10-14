import { ApiError, getErrorMessage } from "./errors";

/* ─────────────────────────────────────────────────────────
   SSE 클라이언트 — 대기열/좌석 스트림 공용

   브라우저 기본 EventSource 대신 fetch 로 읽는다. EventSource 는 응답 상태
   코드와 에러 바디를 못 보기 때문에 SESSION_NOT_FOUND(404) / FORBIDDEN(403)
   같이 UI 분기가 필요한 실패를 "error" 하나로 뭉뚱그린다. 여기서는 스트림이
   열리기 전 실패를 apiFetch 와 동일한 ApiError(code, status) 로 변환한다.

   재연결도 직접 한다(기본 EventSource 의 3초 자동 재시도 대체):
   - 끊김 → RETRY_DELAY_MS 후 같은 URL 재연결
   - 이벤트를 한 건이라도 받으면 재시도 카운터 리셋
   - 연속 MAX_RETRIES 회 실패하면 포기하고 onFatal
   ───────────────────────────────────────────────────────── */

const RETRY_DELAY_MS = 3_000;
const MAX_RETRIES = 5;

export interface SseHandlers {
  /** 이름 있는 이벤트 수신. data 는 JSON.parse 결과. */
  onEvent: (eventName: string, data: unknown) => void;
  /** 재연결로도 복구 불가한 실패. 스트림은 이 시점에 종료된다. */
  onFatal: (error: ApiError) => void;
  /** 연결이 끊겨 재시도에 들어감. attempt 는 연속 실패 횟수(1부터). */
  onDisconnect?: (attempt: number) => void;
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string };
}

/** SSE 프레임 하나를 { event, data } 로 파싱. 주석(`: ping`) 프레임은 null. */
function parseFrame(raw: string): { event: string; data: string } | null {
  let event = "message";
  const dataLines: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    if (line === "" || line.startsWith(":")) continue;
    const sep = line.indexOf(":");
    const field = sep === -1 ? line : line.slice(0, sep);
    const value = sep === -1 ? "" : line.slice(sep + 1).replace(/^ /, "");
    if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }
  if (dataLines.length === 0) return null;
  return { event, data: dataLines.join("\n") };
}

/**
 * SSE 스트림 연결. 반환된 함수를 호출하면 연결을 닫고 재연결도 멈춘다.
 * (화면 이탈·언마운트 시 반드시 호출할 것.)
 */
export function openSseStream(url: string, handlers: SseHandlers): () => void {
  const controller = new AbortController();
  let closed = false;
  let retries = 0;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const fail = (code: string, status: number) => {
    if (closed) return;
    closed = true;
    handlers.onFatal(new ApiError(getErrorMessage(code), code, status));
  };

  const scheduleRetry = () => {
    if (closed) return;
    retries += 1;
    if (retries > MAX_RETRIES) {
      fail("NETWORK_ERROR", 0);
      return;
    }
    handlers.onDisconnect?.(retries);
    retryTimer = setTimeout(() => void connect(), RETRY_DELAY_MS);
  };

  const connect = async (): Promise<void> => {
    if (closed) return;
    let res: Response;
    try {
      res = await fetch(url, {
        credentials: "include",
        headers: { Accept: "text/event-stream" },
        signal: controller.signal,
      });
    } catch {
      // abort 는 close() 경로이므로 재시도하지 않는다.
      if (!closed) scheduleRetry();
      return;
    }

    if (!res.ok || !res.body) {
      // 스트림이 열리기 전 거절 — 바디에 실패 코드가 담겨 온다.
      let code: string | undefined;
      try {
        const envelope = (await res.json()) as ErrorEnvelope;
        code = envelope.error?.code;
      } catch {
        // 바디 파싱 실패는 상태 코드만으로 판정
      }
      fail(code ?? "INTERNAL_ERROR", res.status);
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (closed) return;
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        // 프레임 구분자는 빈 줄. 마지막 조각은 다음 청크와 이어붙인다.
        const frames = buffer.split(/\r?\n\r?\n/);
        buffer = frames.pop() ?? "";
        for (const raw of frames) {
          const frame = parseFrame(raw);
          if (!frame) continue;
          retries = 0;
          try {
            handlers.onEvent(frame.event, JSON.parse(frame.data));
          } catch {
            // 깨진 payload 한 건은 무시하고 다음 프레임을 계속 읽는다.
          }
        }
      }
    } catch {
      // 읽는 도중 끊김 → 재연결
    }
    if (!closed) scheduleRetry();
  };

  void connect();

  return () => {
    if (closed) return;
    closed = true;
    if (retryTimer) clearTimeout(retryTimer);
    controller.abort();
  };
}
