"use client";

import { useEffect, useState } from "react";

export function ShareAccessUrl() {
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  if (!origin) {
    return null;
  }

  const onlineUrl = `${origin}/online`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(onlineUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const isTunnel = origin.includes("trycloudflare.com");
  const isLanDomain = origin.includes("sslip.io") || origin.includes("nip.io");

  return (
    <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-stone-800 shadow-sm">
      <p className="font-medium text-stone-900">접속 주소 (PC·모바일 공유)</p>
      <p className="mt-2 break-all font-mono text-xs text-stone-700">{onlineUrl}</p>
      <button
        type="button"
        onClick={handleCopy}
        className="mt-3 rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800"
      >
        {copied ? "복사됨" : "주소 복사"}
      </button>
      <p className="mt-2 text-xs text-stone-500">
        {isTunnel
          ? "Cloudflare 무료 도메인 — LTE·다른 Wi-Fi에서도 접속 가능"
          : isLanDomain
            ? "sslip.io 무료 LAN 도메인 — 같은 Wi-Fi에서 접속"
            : "다른 네트워크 테스트: PC에서 npm run dev:public 실행"}
      </p>
    </div>
  );
}
