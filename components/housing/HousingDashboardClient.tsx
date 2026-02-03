"use client";

import { useState, useEffect } from "react";
import { HousingTask, HousingSchedule, Member } from "@/lib/domain/entities";
import TaskCard, { TaskCardSkeleton } from "./TaskCard";

import DutyRoster from "./DutyRoster";
import ProofReviewModal from "./ProofReviewModal";
import CreateBountyModal from "./CreateBountyModal";
import CreateScheduleModal from "./CreateScheduleModal";
import CreateOneOffModal from "./CreateOneOffModal";
import EditTaskModal from "./EditTaskModal";
import { Users, CalendarClock, Plus } from "lucide-react";
import toast from "react-hot-toast";

// Actions for Client-Side Refreshing
import {
  getAllActiveTasksAction,
  getSchedulesAction,
  getAllMembersAction,
} from "@/lib/presentation/actions/housing.actions";
import { getMyTasksAction } from "@/lib/presentation/actions/tasks.actions";
import MyDutiesWidget from "./MyDutiesWidget";
// Note: We use useAuth for getToken and isHousingAdmin
import { useAuth } from "@/components/providers/AuthProvider";
import { Loader2 } from "lucide-react";

interface HousingDashboardClientProps {
  initialTasks?: HousingTask[];
  initialMembers?: Member[];
  initialSchedules?: HousingSchedule[];
}

export default function HousingDashboardClient({
  initialTasks = [],
  initialMembers = [],
  initialSchedules = [],
}: HousingDashboardClientProps) {
  const { user: currentUser, getToken, isHousingAdmin } = useAuth();
  // We need to fetch profile if not passed.
  // Actually, let's just fetch everything on mount if we don't have it.
  const [profile, setProfile] = useState<Member | null>(null);

  const [tasks, setTasks] = useState<HousingTask[]>(initialTasks);
  const [myDuties, setMyDuties] = useState<HousingTask[]>([]);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [schedules, setSchedules] =
    useState<HousingSchedule[]>(initialSchedules);
  const [initialLoading, setInitialLoading] = useState(true);

  // isHousingAdmin is now sourced from AuthProvider (Discord role check)
  const isAdmin = isHousingAdmin;

  // Modals
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<HousingTask | null>(null);
  const [editingTask, setEditingTask] = useState<HousingTask | null>(null);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Loading state for *Refreshes* only (initial load is instant)
  const [refreshing, setRefreshing] = useState(false);

  // Initial Fetch Effect
  useEffect(() => {
    if (currentUser) {
      handleRefresh(true);
    }
  }, [currentUser]);

  const handleRefresh = async (isInitial = false) => {
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);

    try {
      const jwt = await getToken();
      // Parallel Refresh
      // Parallel Refresh
      const [tasksRes, membersRes, myDutiesRes] = await Promise.all([
        getAllActiveTasksAction(jwt),
        getAllMembersAction(jwt),
        getMyTasksAction(jwt),
      ]);

      if (tasksRes.length > 0) setTasks(tasksRes);
      if (myDutiesRes.documents)
        setMyDuties(myDutiesRes.documents as HousingTask[]);
      // Wait, housing.actions.ts:getAllActiveTasksAction returns array directly?
      // Let's check the code I just wrote.
      // YES: return JSON.parse(JSON.stringify(result)); which is data.

      if (membersRes.length > 0) {
        setMembers(membersRes);
        // Find my profile
        const myProfile = membersRes.find(
          (m: any) =>
            m.discord_id === currentUser?.$id ||
            m.account_id === currentUser?.$id,
        );
        // We might need a better way to link profile, but usually discord_id matches.
        // Actually, let's use the explicit profile fetch if needed, but members list usually has it.
        if (myProfile) setProfile(myProfile);
      }

      // Check Admin status via labels or specific check
      // For now using client-side derivation if possible, or fetch schedules if admin
      if (isAdmin) {
        const schedRes = await getSchedulesAction(jwt);
        if (schedRes.length > 0) setSchedules(schedRes);
      }

      if (!isInitial) toast.success("Dashboard Updated");
    } catch (error) {
      console.error("Refresh failed", error);
      if (!isInitial) toast.error("Failed to refresh data");
    } finally {
      setRefreshing(false);
      setInitialLoading(false);
    }
  };

  if (initialLoading || !currentUser) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-stone-300" />
      </div>
    );
  }

  // Fallback for profile
  const currentProfile =
    profile || members.find((m) => m.discord_id === currentUser.$id) || null;

  // Filters
  const pendingReviews = isAdmin
    ? tasks.filter((t) => t.status === "pending" && t.proof_s3_key)
    : [];

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
      </div>

      {/* ADMIN ACTION BAR */}
      {isAdmin && (
        <div className="flex flex-wrap gap-2 p-3 md:p-4 bg-stone-100 rounded-xl border border-stone-200 justify-center md:justify-start">
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

      {/* MAIN CONTENT: 2-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: My Duties (sticky on desktop) */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-4">
            <MyDutiesWidget
              initialTasks={myDuties}
              userId={currentUser?.$id || ""}
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Reviews + Bounties */}
        <div className="lg:col-span-2 space-y-8">
          {/* PENDING REVIEWS (Admin Only) */}
          {pendingReviews.length > 0 && (
            <div>
              <h2 className="font-bebas text-xl text-stone-700 mb-4">
                Pending Approvals
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingReviews.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    userId={currentUser.$id}
                    profileId={currentProfile?.discord_id || ""}
                    userName={currentUser.name}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    getJWT={getToken}
                    viewMode="review"
                    onReview={setReviewTask}
                    onEdit={(t) => setEditingTask(t)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* AVAILABLE BOUNTIES (Horizontal Cards) */}
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
              <div className="space-y-3">
                {availableBounties.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    userId={currentUser.$id}
                    profileId={currentProfile?.discord_id || ""}
                    userName={currentUser.name}
                    isAdmin={isAdmin}
                    onRefresh={handleRefresh}
                    getJWT={getToken}
                    viewMode="action"
                    variant="horizontal"
                    onEdit={(t) => setEditingTask(t)}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* MASTER ROSTER (Inline at Bottom) */}
      <section className="border-t border-stone-200 pt-8">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-stone-500" />
          <h2 className="font-bebas text-2xl text-stone-700">Master Roster</h2>
        </div>
        <DutyRoster
          tasks={tasks}
          members={members}
          isAdmin={isAdmin}
          userId={currentUser.$id}
          onRefresh={handleRefresh}
          onEdit={(t) => setEditingTask(t)}
        />
      </section>

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
