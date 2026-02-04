"use client";

import { HistoryItem } from "@/lib/domain/entities/dashboard.dto";
import { useMemo } from "react";
import { formatDistanceToNow } from "date-fns";
import {
  CheckCircle2,
  History as HistoryIcon,
  AlertCircle,
} from "lucide-react";
// import { cn } from "@/lib/utils";

interface PointsLedgerProps {
  history: HistoryItem[];
}

interface StackedItem extends HistoryItem {
  count: number;
}

export default function PointsLedger({ history }: PointsLedgerProps) {
  const stackedHistory = useMemo(() => {
    const stacked: StackedItem[] = [];
    if (!history || history.length === 0) return stacked;

    let currentStack: StackedItem | null = null;

    for (const item of history) {
      if (
        currentStack &&
        item.reason === currentStack.reason &&
        item.amount === currentStack.amount &&
        item.category === currentStack.category &&
        item.userName === currentStack.userName // Added: Stack only if it's the same person
      ) {
        // Stack it
        currentStack.count += 1;
      } else {
        if (currentStack) {
          stacked.push(currentStack);
        }
        currentStack = { ...item, count: 1 };
      }
    }
    if (currentStack) {
      stacked.push(currentStack);
    }

    return stacked;
  }, [history]);

  if (stackedHistory.length === 0) return null;

  return (
    <div className="w-full bg-white border border-stone-200 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-6 border-b border-stone-100 pb-4">
        <HistoryIcon className="w-5 h-5 text-stone-400" />
        <h2 className="font-bebas text-2xl text-stone-700">
          Recent Chapter Activity
        </h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-stone-400 font-bold uppercase tracking-wider border-b border-stone-100">
            <tr>
              <th className="pb-3 pl-2">Brother</th>
              <th className="pb-3">Activity</th>
              <th className="pb-3">Category</th>
              <th className="pb-3 text-right">Date</th>
              <th className="pb-3 text-right pr-2">Points</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-50">
            {stackedHistory.map((item, idx) => {
              const isPositive = item.amount > 0;
              return (
                <tr
                  key={idx}
                  className="group hover:bg-stone-50 transition-colors"
                >
                  <td className="py-3 pl-2">
                    <span className="font-bold text-stone-900">
                      {item.userName}
                    </span>
                  </td>
                  <td className="py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${isPositive ? "bg-emerald-400" : "bg-rose-400"}`}
                      />
                      <span className="text-stone-700">{item.reason}</span>
                      {item.count > 1 && (
                        <span className="bg-stone-100 text-stone-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-stone-200">
                          x{item.count}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3">
                    <span className="capitalize text-stone-500 text-xs bg-stone-100 px-2 py-1 rounded">
                      {item.category}
                    </span>
                  </td>
                  <td className="py-3 text-right text-stone-400 text-xs tabular-nums">
                    {formatDistanceToNow(new Date(item.timestamp), {
                      addSuffix: true,
                    })}
                  </td>
                  <td
                    className={`py-3 pr-2 text-right font-mono font-bold ${isPositive ? "text-emerald-600" : "text-rose-500"}`}
                  >
                    {isPositive ? "+" : ""}
                    {item.amount * item.count} PTS
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
