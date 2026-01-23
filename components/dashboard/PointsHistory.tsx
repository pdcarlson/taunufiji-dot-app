"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getTransactionHistoryAction } from "@/lib/actions/ledger.actions";
import { account } from "@/lib/client/appwrite";
import { Models } from "appwrite";
import { LedgerSchema } from "@/lib/types/schema";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";
import { Loader } from "@/components/ui/Loader";

type LedgerEntry = Models.Document & LedgerSchema;

export default function PointsHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;
      setLoading(true);
      try {
        const { jwt } = await account.createJWT();
        const data = await getTransactionHistoryAction(user.$id, jwt);
        // Verify data shape or cast if action returns generic Document[]
        setHistory(data as unknown as LedgerEntry[]);
      } catch (e) {
        console.error("Failed to load history", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
      <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-center">
        <div>
          <h2 className="font-bebas text-2xl text-stone-700">Points History</h2>
          <p className="text-stone-400 text-sm">
            Recent transactions and updates.
          </p>
        </div>
        {/* Optional: View All Link if we had pagination */}
      </div>

      <div className="p-6">
        {loading && <Loader />}

        {!loading && history.length === 0 && (
          <div className="text-center py-12 border border-dashed border-stone-200 rounded-lg bg-stone-50/50">
            <History className="w-8 h-8 text-stone-300 mx-auto mb-2" />
            <p className="text-stone-500 font-medium">No transactions found.</p>
          </div>
        )}

        <div className="space-y-3">
          {history.map((tx) => {
            // FIX: Restore sign from is_debit flag (DB stores abs value)
            const effectiveAmount =
              tx.is_debit || tx.category === "fine"
                ? -Math.abs(tx.amount)
                : tx.amount;

            return (
              <div
                key={tx.$id}
                className="group hover:bg-stone-50 p-4 rounded-xl border border-stone-100 transition-colors flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                      effectiveAmount >= 0
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {effectiveAmount >= 0 ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-stone-800">{tx.reason}</div>
                    <div className="text-xs text-stone-400 uppercase tracking-wider font-medium">
                      {new Date(tx.timestamp).toLocaleDateString()} •{" "}
                      <span
                        className={tx.category === "fine" ? "text-red-400" : ""}
                      >
                        {tx.category}
                      </span>
                    </div>
                  </div>
                </div>
                <div
                  className={`font-bebas text-xl ${
                    effectiveAmount >= 0 ? "text-emerald-600" : "text-red-500"
                  }`}
                >
                  {effectiveAmount > 0 ? "+" : ""}
                  {effectiveAmount}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
