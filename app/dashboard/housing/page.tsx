"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { account } from "@/lib/infrastructure/persistence/appwrite.web";
import { Loader } from "@/components/ui/Loader";
import {
  getOpenTasksAction,
  getMyTasksAction,
  getSchedulesAction,
  checkHousingAdminAction,
  getAllMembersAction,
  getPendingReviewsAction,
} from "@/lib/presentation/actions/housing.actions";
import HousingStats from "@/components/dashboard/housing/HousingStats";
import TaskCard, {
  TaskCardSkeleton,
} from "@/components/dashboard/housing/TaskCard";
import DutyRoster from "@/components/dashboard/housing/DutyRoster";
import ScheduleManager from "@/components/dashboard/housing/ScheduleManager";
import ProofReviewModal from "@/components/dashboard/housing/ProofReviewModal";
import CreateBountyModal from "@/components/dashboard/housing/CreateBountyModal";
import CreateScheduleModal from "@/components/dashboard/housing/CreateScheduleModal";
import CreateOneOffModal from "@/components/dashboard/housing/CreateOneOffModal";
import EditTaskModal from "@/components/dashboard/housing/EditTaskModal";
import { ListTodo, Users, CalendarClock, Loader2, Plus } from "lucide-react";
import toast from "react-hot-toast";

import { HousingTask, HousingSchedule, Member } from "@/lib/domain/entities";

export default function HousingPage() {
  const { user, profile } = useAuth();
  const [tasks, setTasks] = useState<HousingTask[]>([]);
  const [schedules, setSchedules] = useState<HousingSchedule[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState<"board" | "roster">("board");
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<HousingTask | null>(null);
  const [editingTask, setEditingTask] = useState<HousingTask | null>(null);
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
      // 2. Fetch Tasks & Members
      const [open, mine, allMembers, pending] = await Promise.all([
        getOpenTasksAction(jwt),
        getMyTasksAction(user.$id, jwt),
        getAllMembersAction(jwt),
        adminStatus ? getPendingReviewsAction(jwt) : Promise.resolve([]),
      ]);
      const allTasks = [...open, ...mine, ...pending].filter(
        (v, i, a) => a.findIndex((v2) => v2.$id === v.$id) === i,
      );
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
      const aReview = a.status === "pending" && a.proof_s3_key;
      const bReview = b.status === "pending" && b.proof_s3_key;
      if (aReview && !bReview) return 1;
      if (!aReview && bReview) return -1;

      // 2. Sort by Urgency (Due Date or Expiry)
      const aDate = new Date(
        a.due_at || a.expires_at || "9999-12-31",
      ).getTime();
      const bDate = new Date(
        b.due_at || b.expires_at || "9999-12-31",
      ).getTime();
      return aDate - bDate;
    });

  const availableBounties = tasks.filter(
    (t) => t.status === "open" && t.type === "bounty",
  );

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-6 justify-between items-center md:items-end text-center md:text-left">
        <div>
          <h1 className="font-bebas text-3xl md:text-4xl text-fiji-dark leading-none">
            Housing Operations
          </h1>
          <p className="text-stone-500 text-xs md:text-sm">
            Tau Nu Chapter Housing Dashboard.
          </p>
        </div>

        {/* TABS */}
        <div className="flex bg-stone-100 p-1 rounded-lg w-full md:w-auto overflow-x-auto justify-center">
          <button
            onClick={() => setActiveTab("board")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "board"
                ? "bg-white text-fiji-dark shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            <ListTodo className="w-4 h-4" /> Work Board
          </button>
          <button
            onClick={() => setActiveTab("roster")}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-md text-xs md:text-sm font-bold transition-all whitespace-nowrap ${
              activeTab === "roster"
                ? "bg-white text-fiji-dark shadow-sm"
                : "text-stone-500 hover:text-stone-700"
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
            <div className="flex flex-wrap gap-2 mb-6 p-3 md:p-4 bg-stone-100 rounded-xl border border-stone-200 justify-center md:justify-start">
              <button
                onClick={() => setShowBountyModal(true)}
                className="flex items-center gap-2 bg-stone-800 hover:bg-black text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors flex-grow md:flex-grow-0 justify-center"
              >
                <Plus className="w-4 h-4" /> Post Bounty
              </button>
              <button
                onClick={() => setShowOneOffModal(true)}
                className="flex items-center gap-2 bg-stone-800 hover:bg-black text-white text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors flex-grow md:flex-grow-0 justify-center"
              >
                <Plus className="w-4 h-4" /> Assign Duty
              </button>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 bg-white hover:bg-stone-50 text-stone-700 text-xs md:text-sm font-bold px-3 py-2 md:px-4 md:py-2 rounded-lg transition-colors border border-stone-300 flex-grow md:flex-grow-0 justify-center"
              >
                <CalendarClock className="w-4 h-4" /> Create Schedule
              </button>
            </div>
          )}

          {/* 1. ADMIN REVIEWS */}
          {pendingReviews.length > 0 && (
            <div>
              <h2 className="font-bebas text-xl text-stone-700 mb-4">
                Pending Approvals
              </h2>
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
                    onEdit={(t) => setEditingTask(t)} // Added
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
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
            ) : myResponsibilities.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded border border-dashed border-stone-200 text-stone-400 font-bold">
                No active tasks assigned to you
              </div>
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
                    onEdit={(t) => setEditingTask(t)} // Added
                  />
                ))}
              </div>
            )}
          </section>

          {/* 3. AVAILABLE BOUNTIES */}
          <section>
            <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-2">
              <h2 className="font-bebas text-2xl text-stone-700">
                Available Bounties
              </h2>
            </div>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <TaskCardSkeleton key={i} />
                ))}
              </div>
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
                    onEdit={(t) => setEditingTask(t)} // Added
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
          onEdit={(t) => setEditingTask(t)} // Added
        />
      )}

      {/* MODALS */}
      <ProofReviewModal
        task={reviewTask}
        onClose={() => setReviewTask(null)}
        onSuccess={loadData}
      />

      {showBountyModal && (
        <CreateBountyModal
          onClose={() => setShowBountyModal(false)}
          onSuccess={() => {
            setShowBountyModal(false);
            loadData();
          }}
        />
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

      {/* EDIT TASK MODAL */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onRefresh={() => {
            setEditingTask(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
