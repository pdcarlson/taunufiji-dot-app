"use client";

import { useState } from "react";
import { HousingTask, HousingSchedule, Member } from "@/lib/domain/entities";
import { Models } from "appwrite"; // For User type
import TaskCard, { TaskCardSkeleton } from "./TaskCard";
import HousingStats from "./HousingStats";
import DutyRoster from "./DutyRoster";
import ProofReviewModal from "./ProofReviewModal";
import CreateBountyModal from "./CreateBountyModal";
import CreateScheduleModal from "./CreateScheduleModal";
import CreateOneOffModal from "./CreateOneOffModal";
import EditTaskModal from "./EditTaskModal";
import { ListTodo, Users, CalendarClock, Plus } from "lucide-react";
import toast from "react-hot-toast";

// Actions for Client-Side Refreshing
import {
  getAllActiveTasksAction,
  getSchedulesAction,
  getAllMembersAction,
} from "@/lib/presentation/actions/housing.actions";
import { useJWT } from "@/hooks/useJWT";
// Note: We don't need useAuth for data anymore, but might use it for 'logout' if needed,
// but passing user/profile as props is cleaner for the core logic.

interface HousingDashboardClientProps {
  initialTasks: HousingTask[];
  initialMembers: Member[];
  initialSchedules: HousingSchedule[];
  isAdmin: boolean;
  currentUser: Models.User<Models.Preferences>;
  currentProfile: Member | null; // Profile is type Member in this domain? Check entity match.
}

export default function HousingDashboardClient({
  initialTasks,
  initialMembers,
  initialSchedules,
  isAdmin,
  currentUser,
  currentProfile,
}: HousingDashboardClientProps) {
  const [tasks, setTasks] = useState<HousingTask[]>(initialTasks);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [schedules, setSchedules] =
    useState<HousingSchedule[]>(initialSchedules);
  const [activeTab, setActiveTab] = useState<"board" | "roster">("board");

  // Modals
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<HousingTask | null>(null);
  const [editingTask, setEditingTask] = useState<HousingTask | null>(null);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Loading state for *Refreshes* only (initial load is instant)
  const [refreshing, setRefreshing] = useState(false);

  const { getJWT } = useJWT();

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const jwt = await getJWT();
      // Parallel Refresh
      const [tasksRes, membersRes] = await Promise.all([
        getAllActiveTasksAction(jwt),
        getAllMembersAction(jwt),
      ]);

      if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data);
      if (membersRes.success && membersRes.data) setMembers(membersRes.data);

      if (isAdmin) {
        const schedRes = await getSchedulesAction(jwt);
        if (schedRes.success && schedRes.data) setSchedules(schedRes.data);
      }

      toast.success("Dashboard Updated");
    } catch (error) {
      console.error("Refresh failed", error);
      toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  // Filters
  const pendingReviews = isAdmin
    ? tasks.filter((t) => t.status === "pending" && t.proof_s3_key)
    : [];

  const myResponsibilities = tasks
    .filter((t) => t.assigned_to === currentProfile?.discord_id)
    .filter((t) => !(t.type === "one_off" && t.status === "approved"))
    .sort((a, b) => {
      const aReview = a.status === "pending" && a.proof_s3_key;
      const bReview = b.status === "pending" && b.proof_s3_key;
      if (aReview && !bReview) return 1;
      if (!aReview && bReview) return -1;

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
          {refreshing && (
            <div className="text-center text-xs text-stone-400">
              Refreshing...
            </div>
          )}

          {/* ADMIN ACTION BAR */}
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
                    key={t.id}
                    task={t}
                    userId={currentUser.$id}
                    profileId={currentProfile?.discord_id || ""}
                    userName={currentUser.name}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    getJWT={getJWT}
                    viewMode="review"
                    onReview={setReviewTask}
                    onEdit={(t) => setEditingTask(t)}
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
              <div className="text-center py-12 bg-stone-50 rounded border border-dashed border-stone-200 text-stone-400 font-bold">
                No active tasks assigned to you
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myResponsibilities.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    userId={currentUser.$id}
                    profileId={currentProfile?.discord_id || ""}
                    userName={currentUser.name}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    getJWT={getJWT}
                    viewMode="action"
                    onEdit={(t) => setEditingTask(t)}
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
            {availableBounties.length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded border border-dashed border-stone-200 text-stone-400 font-bold">
                No active bounties
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {availableBounties.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    userId={currentUser.$id}
                    profileId={currentProfile?.discord_id || ""}
                    userName={currentUser.name}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    getJWT={getJWT}
                    viewMode="action"
                    onEdit={(t) => setEditingTask(t)}
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
          userId={currentUser.$id}
          onRefresh={handleRefresh}
          onEdit={(t) => setEditingTask(t)}
        />
      )}

      {/* MODALS */}
      <ProofReviewModal
        task={reviewTask}
        onClose={() => setReviewTask(null)}
        onSuccess={handleRefresh}
      />

      {showBountyModal && (
        <CreateBountyModal
          onClose={() => setShowBountyModal(false)}
          onSuccess={() => {
            setShowBountyModal(false);
            handleRefresh();
          }}
        />
      )}

      {showScheduleModal && (
        <CreateScheduleModal
          onClose={() => setShowScheduleModal(false)}
          onSuccess={handleRefresh}
          members={members}
        />
      )}

      {showOneOffModal && (
        <CreateOneOffModal
          onClose={() => setShowOneOffModal(false)}
          onSuccess={handleRefresh}
          members={members}
        />
      )}

      {editingTask && (
        <EditTaskModal
          task={editingTask}
          members={members}
          onClose={() => setEditingTask(null)}
          onRefresh={() => {
            setEditingTask(null);
            handleRefresh();
          }}
        />
      )}
    </div>
  );
}
