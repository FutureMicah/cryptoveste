import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Calendar, Clock, Video, Check, X, Plus, User } from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface InterviewSchedulingProps {
  onRefresh: () => void;
}

const InterviewScheduling = ({ onRefresh }: InterviewSchedulingProps) => {
  const [users, setUsers] = useState<any[]>([]);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load users without scheduled interviews
      const { data: allUsers } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, detected_country, country_code")
        .order("created_at", { ascending: false });

      // Load existing interviews
      const { data: existingInterviews } = await supabase
        .from("admin_interviews")
        .select(`
          *,
          profiles:user_id (first_name, last_name, detected_country, country_code)
        `)
        .order("scheduled_at", { ascending: true });

      setUsers(allUsers || []);
      setInterviews(existingInterviews || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const scheduleInterview = async () => {
    if (!selectedUserId || !scheduledAt) {
      toast.error("Please select a user and date/time");
      return;
    }

    try {
      const { error } = await supabase.from("admin_interviews").insert({
        user_id: selectedUserId,
        scheduled_at: scheduledAt,
        meeting_link: meetingLink || null,
        duration_minutes: duration,
        notes: notes || null,
        status: "scheduled",
      });

      if (error) throw error;

      toast.success("Interview scheduled successfully!");
      setShowScheduleForm(false);
      setSelectedUserId("");
      setScheduledAt("");
      setMeetingLink("");
      setNotes("");
      loadData();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to schedule interview");
    }
  };

  const updateInterviewStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from("admin_interviews")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      toast.success(`Interview marked as ${status}`);
      loadData();
      onRefresh();
    } catch (error: any) {
      toast.error(error.message || "Failed to update interview");
    }
  };

  const getCountryFlag = (countryCode: string) => {
    if (!countryCode) return null;
    return `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
  };

  if (loading) {
    return (
      <Card className="p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Schedule New Interview Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-foreground">Interview Scheduling</h3>
        <Button onClick={() => setShowScheduleForm(!showScheduleForm)}>
          <Plus className="w-4 h-4 mr-2" />
          Schedule Interview
        </Button>
      </div>

      {/* Schedule Form */}
      {showScheduleForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 space-y-4">
            <h4 className="font-semibold text-foreground">New Interview</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Select User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-foreground"
                >
                  <option value="">Choose a user...</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.first_name} {user.last_name} ({user.detected_country || "Unknown"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Date & Time</label>
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Meeting Link (Optional)</label>
                <Input
                  type="url"
                  placeholder="https://zoom.us/j/..."
                  value={meetingLink}
                  onChange={(e) => setMeetingLink(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Duration (minutes)</label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
                  min={15}
                  max={120}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <label className="text-sm text-muted-foreground">Notes (Optional)</label>
                <Input
                  placeholder="Interview notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={scheduleInterview}>
                <Calendar className="w-4 h-4 mr-2" />
                Schedule
              </Button>
              <Button variant="outline" onClick={() => setShowScheduleForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Interviews List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upcoming Interviews */}
        <Card className="p-6">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Upcoming Interviews
          </h4>
          <div className="space-y-3">
            {interviews.filter(i => i.status === "scheduled").length === 0 ? (
              <p className="text-muted-foreground text-sm">No upcoming interviews</p>
            ) : (
              interviews
                .filter(i => i.status === "scheduled")
                .map((interview) => (
                  <motion.div
                    key={interview.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-4 rounded-lg bg-muted/30 border border-border/50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {interview.profiles?.first_name} {interview.profiles?.last_name}
                        </span>
                        {interview.profiles?.country_code && (
                          <img
                            src={getCountryFlag(interview.profiles.country_code)}
                            alt=""
                            className="w-4 h-3 rounded"
                          />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {new Date(interview.scheduled_at).toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground mb-3">
                      Duration: {interview.duration_minutes} min
                    </p>
                    {interview.meeting_link && (
                      <a
                        href={interview.meeting_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 mb-3"
                      >
                        <Video className="w-3 h-3" />
                        Join Meeting
                      </a>
                    )}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInterviewStatus(interview.id, "completed")}
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Complete
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateInterviewStatus(interview.id, "cancelled")}
                      >
                        <X className="w-3 h-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </motion.div>
                ))
            )}
          </div>
        </Card>

        {/* Past Interviews */}
        <Card className="p-6">
          <h4 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            Past Interviews
          </h4>
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {interviews.filter(i => i.status !== "scheduled").length === 0 ? (
              <p className="text-muted-foreground text-sm">No past interviews</p>
            ) : (
              interviews
                .filter(i => i.status !== "scheduled")
                .map((interview) => (
                  <div
                    key={interview.id}
                    className="p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">
                        {interview.profiles?.first_name} {interview.profiles?.last_name}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        interview.status === "completed" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {interview.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(interview.scheduled_at).toLocaleString()}
                    </p>
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default InterviewScheduling;
