"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface HistoryItem {
  path: string;
  label: string;
}

const menuItems: HistoryItem[] = [
  { path: "/login", label: "登陆" },
  { path: "/analysis", label: "大屏展示" },
  { path: "/wave-analysis", label: "时域分析" },
  { path: "/spectrum-analysis", label: "频谱分析" },
  { path: "/charts-dashboard", label: "数据对比" },
  { path: "/zhendong", label: "振动数据分析" },
  { path: "/wendufenxi", label: "温度分析" },
  { path: "/lishifenxi", label: "历史趋势" },
  { path: "/weihuweixiu", label: "维护维修" },
  { path: "/jiankangyuce", label: "健康预测" },
  { path: "/guzhangtongji", label: "故障统计" },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("page-history");
    if (saved) {
      setHistory(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    if (pathname === "/login" || pathname === "/analysis") return;

    const current = menuItems.find((item) => item.path === pathname);
    if (!current) return;

    setHistory((prev) => {
      const exists = prev.find((item) => item.path === pathname);
      if (exists) return prev;

      const updated = [...prev, current];
      localStorage.setItem("page-history", JSON.stringify(updated));
      return updated;
    });
  }, [pathname]);

  const removeHistoryItem = (pathToRemove: string) => {
    const updated = history.filter((item) => item.path !== pathToRemove);
    setHistory(updated);
    localStorage.setItem("page-history", JSON.stringify(updated));
  };

  if (pathname === "/login" || pathname === "/analysis") {
    return <>{children}</>;
  }

  return (
    <>
      <header className="bg-[#001529] text-white flex items-center justify-between px-8 py-4 shadow-md border-b border-[#2c3e50]">
        <h1 className="text-2xl font-bold tracking-wide">iBearing智能轴承健康监测系统</h1>
        <nav className="space-x-6 text-sm">
          {menuItems.map((item) => (
            <Link key={item.path} href={item.path} className="hover:underline">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      {history.length > 0 && (
        <div className="bg-[#1f2a38] px-6 py-2 border-b border-[#2c3e50] text-sm text-white">
          <div className="flex items-center flex-wrap gap-2">
            <span className="font-semibold mr-2">历史访问:</span>

            {history.map((item) => (
              <div
                key={item.path}
                className="flex items-center bg-[#334155] rounded-full px-3 py-1 text-sm shadow-sm hover:shadow transition"
              >
                <span
                  onClick={() => router.push(item.path)}
                  className="cursor-pointer text-blue-400 hover:underline mr-1"
                >
                  {item.label}
                </span>
                <button
                  onClick={() => removeHistoryItem(item.path)}
                  className="text-red-400 text-xs hover:text-red-600 font-bold ml-1 px-1 rounded-full"
                  title="删除"
                >
                  ×
                </button>
              </div>
            ))}

            <button
              onClick={() => {
                setHistory([]);
                localStorage.removeItem("page-history");
              }}
              className="text-xs text-gray-300 hover:text-red-400 border border-gray-600 px-2 py-1 rounded-full ml-auto"
              title="清空全部历史记录"
            >
              🧹 清空
            </button>
          </div>
        </div>
      )}

      <main className="min-h-screen px-6 py-4 bg-[#141d2b] text-white">{children}</main>
    </>
  );
}
