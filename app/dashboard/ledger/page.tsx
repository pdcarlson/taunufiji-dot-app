"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { getTransactionHistoryAction } from "@/lib/actions/ledger.actions";
import { account } from "@/lib/client/appwrite";
import { Models } from "appwrite";
import { LedgerSchema } from "@/lib/types/schema";
import { ArrowDownLeft, ArrowUpRight, History } from "lucide-react";

export default function LedgerPage() {
  const { user } = useAuth();
  const [history, setHistory] = useState<(Models.Document & LedgerSchema)[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
        if (!user) return;
        setLoading(true);
        const { jwt } = await account.createJWT();
        const data = await getTransactionHistoryAction(user.$id, jwt); // Using Auth ID as user_id link
        // @ts-ignore
        setHistory(data);
        setLoading(false);
    };
    loadData();
  }, [user]);

  return (
    <div className="pb-20">
      <h1 className="font-bebas text-3xl text-stone-900 mb-1">Points Ledger</h1>
      <p className="text-sm text-stone-500 mb-6">Your transaction history.</p>

      {loading && <div className="text-center py-10 text-stone-400">Loading history...</div>}

      {!loading && history.length === 0 && (
         <div className="text-center py-12 bg-white rounded-xl border border-dashed border-stone-300">
             <History className="w-8 h-8 text-stone-300 mx-auto mb-2" />
             <p className="text-stone-500">No transactions found.</p>
         </div>
      )}

      <div className="space-y-3">
        {history.map((tx) => (
            <div key={tx.$id} className="bg-white p-4 rounded-xl border border-stone-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.amount >= 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {tx.amount >= 0 ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
                    </div>
                    <div>
                        <div className="font-bold text-stone-800">{tx.reason}</div>
                        <div className="text-xs text-stone-400 uppercase tracking-wider">
                            {new Date(tx.timestamp).toLocaleDateString()} • {tx.category}
                        </div>
                    </div>
                </div>
                <div className={`font-bebas text-xl ${tx.amount >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {tx.amount > 0 ? "+" : ""}{tx.amount}
                </div>
            </div>
        ))}
      </div>
    </div>
  );
}
