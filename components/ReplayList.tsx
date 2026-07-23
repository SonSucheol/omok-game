"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchGameRecords } from "@/lib/records/client";
import type { GameRecordSummary } from "@/lib/records";

export function ReplayList() {
  const [records, setRecords] = useState<GameRecordSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchGameRecords();
        if (!cancelled) {
          setRecords(list);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "불러오기 실패");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <p className="text-sm text-stone-600">기록을 불러오는 중...</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
        {error}
      </p>
    );
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-stone-600">
        종료된 대국이 없습니다. 로컬·AI·온라인 대국이 끝나면 여기에 쌓입니다.
      </p>
    );
  }

  return (
    <ul className="flex w-full max-w-lg flex-col gap-3">
      {records.map((record) => (
        <li key={record.id}>
          <Link
            href={`/replay/${record.id}`}
            className="block rounded-2xl border border-stone-200 bg-white p-4 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md"
          >
            <p className="font-semibold text-stone-900">{record.title}</p>
            <p className="mt-1 text-xs text-stone-500">
              {new Date(record.updatedAt).toLocaleString("ko-KR")}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
