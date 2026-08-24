"use client";

import { useEffect, useState } from "react";
import { getServerTime } from "@/lib/live";

// 모듈 싱글턴: 앱 전체가 하나의 drift 값을 공유한다.
// 여러 컴포넌트가 훅을 호출해도 fetch 는 최초 1회만.
let driftMs = 0;
let bootstrapPromise: Promise<void> | null = null;
let bootstrapped = false;

async function bootstrapServerTime(): Promise<void> {
  if (bootstrapPromise) return bootstrapPromise;
  bootstrapPromise = (async () => {
    const t0 = Date.now();
    try {
      const { now } = await getServerTime();
      const t1 = Date.now();
      const rtt = t1 - t0;
      // 편도 지연 rtt/2 만큼 서버 시각을 앞당겨 보정
      driftMs = Date.parse(now) + rtt / 2 - t1;
    } catch {
      driftMs = 0;
    } finally {
      bootstrapped = true;
    }
  })();
  return bootstrapPromise;
}

/** 서버 기준 현재 시각(ms). drift 부트스트랩 전에는 로컬 시각과 동일. */
export function nowServer(): number {
  return Date.now() + driftMs;
}

/** 현재까지 계산된 drift (ms). 부트스트랩 전 0. */
export function getDrift(): number {
  return driftMs;
}

/**
 * 앱 어디에서든 호출하면 최초 1회 /api/time 부트스트랩을 트리거.
 * ready=true 가 되면 drift 반영된 nowServer() 사용 가능.
 */
export function useServerTime(): {
  ready: boolean;
  driftMs: number;
  nowServer: () => number;
} {
  const [ready, setReady] = useState(bootstrapped);

  useEffect(() => {
    let alive = true;
    bootstrapServerTime().then(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  return { ready, driftMs, nowServer };
}
