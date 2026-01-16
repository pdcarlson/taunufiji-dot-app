"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { account } from "@/lib/client/appwrite";
import {
  getOpenTasksAction,
  getMyTasksAction,
  getSchedulesAction,
  checkHousingAdminAction,
  getAllMembersAction
} from "@/lib/actions/housing.actions";
import HousingStats from "@/components/dashboard/housing/HousingStats";
import TaskCard from "@/components/dashboard/housing/TaskCard";
import DutyRoster from "@/components/dashboard/housing/DutyRoster";
import ScheduleManager from "@/components/dashboard/housing/ScheduleManager";
import ProofReviewModal from "@/components/dashboard/housing/ProofReviewModal";
import CreateBountyModal from "@/components/dashboard/housing/CreateBountyModal";
import CreateScheduleModal from "@/components/dashboard/housing/CreateScheduleModal";
import CreateOneOffModal from "@/components/dashboard/housing/CreateOneOffModal";
import { ListTodo, Users, CalendarClock, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

type Task = any; 
type Member = any;
type Schedule = any;

export default function HousingPage() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "roster">("board");
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<Task | null>(null);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { jwt } = await account.createJWT();
      
      // 1. Check Admin
      const adminStatus = await checkHousingAdminAction(jwt);
      setIsAdmin(adminStatus);

      // 2. Fetch Tasks & Members
      const [open, mine, allMembers] = await Promise.all([
          getOpenTasksAction(jwt),
          getMyTasksAction(user.$id, jwt),
          getAllMembersAction(jwt)
      ]);
      const allTasks = [...open, ...mine].filter((v,i,a)=>a.findIndex(v2=>(v2.$id===v.$id))===i);
      setTasks(allTasks);
      setMembers(allMembers);

      // 3. Fetch Schedules (If Admin)
      if (adminStatus) {
          const scheds = await getSchedulesAction(jwt);
          setSchedules(scheds);
      }

    } catch (err) {
      toast.error("Sync Failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  // Filters
  const pendingReviews = isAdmin
    ? tasks.filter((t) => t.status === "pending" && t.proof_s3_key)
    : [];

  const myResponsibilities = tasks
    .filter((t) => t.assigned_to === profile?.discord_id)
    .filter((t) => !(t.type === "one_off" && t.status === "approved")) // Hide completed one-offs
    .sort((a, b) => {
        // 1. "Under Review" (Pending + Proof) goes to bottom
        const aReview = a.status === 'pending' && a.proof_s3_key;
        const bReview = b.status === 'pending' && b.proof_s3_key;
        if (aReview && !bReview) return 1;
        if (!aReview && bReview) return -1;

        // 2. Sort by Urgency (Due Date or Expiry)
        const aDate = new Date(a.due_at || a.expires_at || '9999-12-31').getTime();
        const bDate = new Date(b.due_at || b.expires_at || '9999-12-31').getTime();
        return aDate - bDate;
    });

  const availableBounties = tasks.filter((t) => t.status === "open" && t.type === "bounty");

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-end">
        <div>
          <h1 className="font-bebas text-4xl text-fiji-dark">
            Housing Operations
          </h1>
          <p className="text-stone-500 text-sm">
            Tau Nu Chapter Housing Dashboard.
          </p>
        </div>
        <div className="flex bg-stone-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab("board")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === "board" ? "bg-white text-fiji-dark shadow-sm" : "text-stone-500"
            }`}
          >
            <ListTodo className="w-4 h-4" /> Work Board
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === "roster" ? "bg-white text-fiji-dark shadow-sm" : "text-stone-500"
            }`}
          >
            <Users className="w-4 h-4" /> Master Roster
          </button>
          
        </div>
      </div>

      <HousingStats />

      {/* --- TAB: WORK BOARD --- */}
      {activeTab === "board" && (
        <div className="space-y-8">
           {/* ADMIN ACTION BAR (Main Page) */}
           {isAdmin && (
             <div className="flex flex-wrap gap-2 mb-6 p-4 bg-stone-100 rounded-xl border border-stone-200">
                <button
                   onClick={() => setShowBountyModal(true)}
                   className="flex items-center gap-2 bg-stone-800 hover:bg-black text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                   <Plus size={16} /> Post Bounty
                </button>
                <button
                   onClick={() => setShowOneOffModal(true)}
                   className="flex items-center gap-2 bg-stone-800 hover:bg-black text-white text-sm font-bold px-4 py-2 rounded-lg transition-colors"
                >
                   <Plus size={16} /> Assign Duty
                </button>
                <button
                   onClick={() => setShowScheduleModal(true)}
                   className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold px-4 py-2 rounded-lg transition-colors border border-stone-300"
                >
                   <CalendarClock size={16} /> Create Schedule
                </button>
             </div>
          )}

          {/* 1. ADMIN REVIEWS */}
          {pendingReviews.length > 0 && (
            <div>
              <h2 className="font-bebas text-xl text-stone-700 mb-4">Pending Approvals</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingReviews.map((t) => (
                  <TaskCard
                    key={t.$id}
                    task={t}
                    userId={user?.$id || ""}
                    profileId={profile?.discord_id || ""}
                    userName={user?.name || ""}
                    isAdmin={isAdmin}
                    onRefresh={loadData}
                    viewMode="review"
                    onReview={setReviewTask}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 2. MY RESPONSIBILITIES */}
          <section>
              <h2 className="font-bebas text-2xl text-fiji-purple mb-4 border-b border-stone-200 pb-2">
                My Responsibilities
              </h2>
              {myResponsibilities.length === 0 ? (
                   <p className="text-stone-400 italic">No active tasks assigned to you.</p>
              ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {myResponsibilities.map((t) => (
                      <TaskCard
                        key={t.$id}
                        task={t}
                        userId={user?.$id || ""}
                        profileId={profile?.discord_id || ""}
                        userName={user?.name || ""}
                        isAdmin={isAdmin}
                        onRefresh={loadData}
                        viewMode="action"
                      />
                    ))}
                  </div>
              )}
          </section>

          {/* 3. AVAILABLE BOUNTIES */}
          <section>
            <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-2">
                <h2 className="font-bebas text-2xl text-stone-700">Available Bounties</h2>
            </div>
            {loading ? (
             <div className="flex justify-center p-8"><Loader2 className="animate-spin text-stone-300" /></div>
            ) : availableBounties.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded border border-dashed border-stone-200 text-stone-400 font-bold">
                No active bounties
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableBounties.map((t) => (
                  <TaskCard
                    key={t.$id}
                    task={t}
                    userId={user?.$id || ""}
                    profileId={profile?.discord_id || ""}
                    userName={user?.name || ""}
                    isAdmin={isAdmin}
                    onRefresh={loadData}
                    viewMode="action"
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* --- TAB: MASTER ROSTER --- */}
      {activeTab === "roster" && (
        <DutyRoster
          tasks={tasks}
          members={members}
          isAdmin={isAdmin}
          userId={user?.$id || ""}
          onRefresh={loadData}
        />
      )}



      {/* MODALS */}
      <ProofReviewModal
        task={reviewTask}
        onClose={() => setReviewTask(null)}
        onSuccess={loadData}
      />
      
      {showBountyModal && (
          <CreateBountyModal onClose={() => setShowBountyModal(false)} onSuccess={() => {
              setShowBountyModal(false);
              loadData();
          }} />
      )}

      {showScheduleModal && (
        <CreateScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={loadData}
          members={members}
        />
      )}

      {showOneOffModal && (
        <CreateOneOffModal
          onClose={() => setShowOneOffModal(false)}
          onSuccess={loadData}
          members={members}
        />
      )}
    </div>
  );
}
