"use client";

import { useState, useMemo } from "react";
import { HousingTask, Member } from "@/lib/domain/entities";
import { TaskCard } from "./TaskCard";

import { DutyRoster } from "./DutyRoster";
import ProofReviewModal from "./ProofReviewModal";
import CreateBountyModal from "./CreateBountyModal";
import CreateScheduleModal from "./CreateScheduleModal";
import CreateOneOffModal from "./CreateOneOffModal";
import { EditTaskModal } from "./EditTaskModal";
import { CalendarClock, Zap, UserPlus } from "lucide-react";
import toast from "react-hot-toast";

// Actions for Client-Side Refreshing
import {
  getAllActiveTasksAction,
  getAllMembersAction,
} from "@/lib/presentation/actions/housing/query.actions";
import { MyDutiesWidget } from "./MyDutiesWidget";
// Note: We use useAuth for getToken and isHousingAdmin
import { useAuth } from "@/components/providers/AuthProvider";

export interface HousingDashboardClientProps {
  initialTasks?: HousingTask[];
  initialMembers?: Member[];
}

export function HousingDashboardClient({
  initialTasks = [],
  initialMembers = [],
}: HousingDashboardClientProps) {
  const { user: currentUser, getToken, isHousingAdmin } = useAuth();

  // Initialize state with server-provided data
  const [tasks, setTasks] = useState<HousingTask[]>(initialTasks);
  const [members, setMembers] = useState<Member[]>(initialMembers);

  // Derived Profile
  const profile = useMemo(() => {
    if (!currentUser || members.length === 0) return null;
    return (
      members.find(
        (m) =>
          m.discord_id === currentUser.$id || m.auth_id === currentUser.$id,
      ) || null
    );
  }, [currentUser, members]);

  const isAdmin = isHousingAdmin;
  const profileId = profile?.discord_id || currentUser?.$id || "";
  const myDuties = useMemo(() => {
    if (!profileId) {
      return [];
    }
    return tasks.filter((task) => task.assigned_to === profileId);
  }, [tasks, profileId]);

  // Modals
  const [showOneOffModal, setShowOneOffModal] = useState(false);
  const [reviewTask, setReviewTask] = useState<HousingTask | null>(null);
  const [editingTask, setEditingTask] = useState<HousingTask | null>(null);
  const [showBountyModal, setShowBountyModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  const loadDashboardData = async (options?: { notifySuccess?: boolean }) => {
    try {
      const jwt = await getToken();

      const [tasksRes, membersRes] = await Promise.all([
        getAllActiveTasksAction(jwt),
        getAllMembersAction(jwt),
      ]);

      if (tasksRes) {
        setTasks(tasksRes);
        setEditingTask((prev) => {
          if (!prev) {
            return null;
          }
          const found = tasksRes.find((t: HousingTask) => t.id === prev.id);
          return found ?? null;
        });
      }
      if (membersRes) setMembers(membersRes);

      if (options?.notifySuccess) {
        toast.success("Dashboard Updated");
      }
    } catch (error) {
      console.error("Refresh failed", error);
      toast.error("Failed to refresh data");
    }
  };

  const handleRefresh = () => loadDashboardData({ notifySuccess: true });

  const closeEditTaskModal = () => setEditingTask(null);

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={() => setShowBountyModal(true)}
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-fiji-gold to-amber-500 hover:from-amber-500 hover:to-fiji-gold text-white text-sm font-bold px-4 py-3 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Zap className="w-4 h-4" /> Post Bounty
          </button>
          <button
            onClick={() => setShowOneOffModal(true)}
            className="flex items-center justify-center gap-2 bg-fiji-purple hover:bg-fiji-dark text-white text-sm font-bold px-4 py-3 rounded-lg transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <UserPlus className="w-4 h-4" /> Assign Duty
          </button>
          <button
            onClick={() => setShowScheduleModal(true)}
            className="flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-700 text-sm font-bold px-4 py-3 rounded-lg transition-all border-2 border-stone-200 hover:border-stone-300"
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
              profileId={profileId}
              variant="minimal"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: Reviews + Bounties */}
        <div className="lg:col-span-2 space-y-8">
          {/* PENDING REVIEWS (Admin Only - Always Visible) */}
          {isAdmin && (
            <section>
              <div className="flex justify-between items-center mb-4 border-b border-stone-200 pb-2">
                <h2 className="font-bebas text-2xl text-stone-700">
                  Pending Approvals
                </h2>
                {pendingReviews.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {pendingReviews.length}
                  </span>
                )}
              </div>
              {pendingReviews.length === 0 ? (
                <div className="text-center py-8 bg-green-50 rounded border border-dashed border-green-200 text-green-600 font-bold">
                  ✓ All caught up! No pending reviews.
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingReviews.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      userId={currentUser?.$id || ""}
                      profileId={profileId}
                      userName={currentUser?.name || "Guest"}
                      isAdmin={isAdmin}
                      getJWT={getToken}
                      viewMode="review"
                      onReview={setReviewTask}
                      onEdit={(t) => setEditingTask(t)}
                      variant="horizontal"
                    />
                  ))}
                </div>
              )}
            </section>
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
                    userId={currentUser?.$id || ""}
                    profileId={profileId}
                    userName={currentUser?.name || "Guest"}
                    isAdmin={isAdmin}
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

      {/* TASK ROSTER */}
      <section className="pt-6">
        <DutyRoster
          tasks={tasks}
          members={members}
          isAdmin={isAdmin}
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
          onClose={closeEditTaskModal}
          onRefresh={() => loadDashboardData()}
          onSuccessClose={closeEditTaskModal}
        />
      )}
    </div>
  );
}
