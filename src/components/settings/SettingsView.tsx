import React, { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import TextField from "@mui/material/TextField";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Avatar from "@mui/material/Avatar";
import Tooltip from "@mui/material/Tooltip";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import {
  Settings as SettingsIcon,
  Translate as LanguageIcon,
  People as HouseholdIcon,
  PersonAdd as PersonAddIcon,
  DeleteForever as DeleteIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Security as SecurityIcon,
  Lock as LockIcon,
  Bolt as BoltIcon,
  Shield as ShieldIcon,
  WarningAmber as WarningIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from "@mui/icons-material";
import { useGetIdentity, useLogout } from "@refinedev/core";
import { useToast } from "../common/ToastProvider";
import { supabaseClient } from "../../lib/supabaseClient";

interface HouseholdMember {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  status: "active" | "pending";
  inviteCode?: string;
  joinedAt: string;
}

export const SettingsView: React.FC = () => {
  const { data: identity } = useGetIdentity<any>();
  const { mutate: logout } = useLogout();
  const { showSuccess, showError, showInfo } = useToast();

  // 1. Language State
  const [selectedLanguage, setSelectedLanguage] = useState<string>(() => {
    return localStorage.getItem("powerforecast_language") || "en";
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    localStorage.setItem("powerforecast_language", lang);
    showSuccess(
      lang === "tl" ? "Wika ay pinalitan sa Tagalog (Filipino)!" : "Language updated to English (US)!",
      "Language Updated"
    );
  };

  // 2. Household Members State
  const householdStorageKey = `powerforecast_household_${identity?.id || "default"}`;

  const [members, setMembers] = useState<HouseholdMember[]>(() => {
    const saved = localStorage.getItem(householdStorageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error("Error parsing household members:", err);
      }
    }
    return [
      {
        id: "owner-1",
        name: identity?.name || "Demo User (You)",
        email: identity?.email || "test09@gmail.com",
        role: "owner",
        status: "active",
        joinedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      },
    ];
  });

  useEffect(() => {
    localStorage.setItem(householdStorageKey, JSON.stringify(members));
  }, [members, householdStorageKey]);

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [generatedInvite, setGeneratedInvite] = useState<{ code: string; link: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleOpenInviteModal = () => {
    setInviteName("");
    setInviteEmail("");
    setGeneratedInvite(null);
    setCopiedLink(false);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showError("Please provide both name and email address.");
      return;
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const code = `PF-HH-${randomSuffix}`;
    const link = `${window.location.origin}/#/signup?invite=${code}&owner=${encodeURIComponent(identity?.email || "admin")}`;

    const newMember: HouseholdMember = {
      id: `member-${Date.now()}`,
      name: inviteName.trim(),
      email: inviteEmail.trim().toLowerCase(),
      role: "member",
      status: "pending",
      inviteCode: code,
      joinedAt: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    };

    setMembers((prev) => [...prev, newMember]);
    setGeneratedInvite({ code, link });
    showSuccess(`Invitation generated for ${inviteName}! You can now share the invite link.`, "Invite Created");
  };

  const handleCopyLink = () => {
    if (!generatedInvite?.link) return;
    navigator.clipboard.writeText(generatedInvite.link);
    setCopiedLink(true);
    showSuccess("Invite link copied to clipboard! Ready to share on Messenger or Viber.", "Link Copied");
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const handleRemoveMember = (memberId: string, memberName: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    showInfo(`Removed ${memberName} from household.`);
  };

  // 3. Account Deletion Security Flow (2-Step Verification)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleOpenDeleteModal = () => {
    setDeletePassword("");
    setDeleteConfirmText("");
    setDeleteError("");
    setIsDeleteModalOpen(true);
  };

  const isDeleteReady = deletePassword.length > 0 && deleteConfirmText === "Confirm";

  const handleExecuteAccountDeletion = async () => {
    if (!isDeleteReady) return;
    setIsDeleting(true);
    setDeleteError("");

    try {
      // 1. Authenticate with password to verify identity
      const userEmail = identity?.email || "";
      if (userEmail) {
        const { error: authErr } = await supabaseClient.auth.signInWithPassword({
          email: userEmail,
          password: deletePassword,
        });

        if (authErr) {
          setDeleteError("Incorrect password. Please verify your current account password.");
          setIsDeleting(false);
          return;
        }
      }

      // 2. Wipe user data records from Supabase tables
      const userId = identity?.id;
      if (userId) {
        try {
          await supabaseClient.from("daily_appliance_usage").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_usage_logs").delete().eq("user_id", userId);
          await supabaseClient.from("user_appliances").delete().eq("user_id", userId);
          await supabaseClient.from("user_calendar_events").delete().eq("user_id", userId);
          await supabaseClient.from("appliance_lists").delete().eq("user_id", userId);
          await supabaseClient.from("accounts").delete().eq("id", userId);
        } catch (dbErr) {
          console.warn("Error cleaning up database rows:", dbErr);
        }
      }

      // 3. Clear local storage caches
      localStorage.removeItem("powerforecast_active_user");
      localStorage.removeItem(householdStorageKey);

      showSuccess("Your account and all associated telemetry have been permanently deleted.", "Account Deleted");
      setIsDeleteModalOpen(false);

      // 4. Sign out
      logout();
    } catch (err: any) {
      setDeleteError(err?.message || "An unexpected error occurred during account deletion.");
      setIsDeleting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2.5, sm: 3.5 } }}>
      {/* Page Header */}
      <Box sx={{ pb: 2, borderBottom: "1px solid", borderColor: "divider" }}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "text.primary", display: "flex", alignItems: "center", gap: 1.5 }}>
          <SettingsIcon sx={{ color: "primary.main" }} />
          Account & Household Settings
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Manage your language preferences, invite family members with tailored roles, and manage your account security.
        </Typography>
      </Box>

      {/* 1. Language Preferences Section */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "rgba(108, 122, 224, 0.25)",
          bgcolor: "rgba(15, 14, 58, 0.5)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 }}>
          <LanguageIcon sx={{ color: "primary.main" }} />
          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
            Language & Localization (Wika)
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mb: 2 }}>
          Choose your preferred interface and notification language.
        </Typography>

        <RadioGroup row value={selectedLanguage} onChange={handleLanguageChange}>
          <FormControlLabel
            value="en"
            control={<Radio color="primary" />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  🇺🇸 English (US)
                </Typography>
              </Box>
            }
            sx={{ mr: 4 }}
          />
          <FormControlLabel
            value="tl"
            control={<Radio color="primary" />}
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  🇵🇭 Tagalog (Filipino)
                </Typography>
              </Box>
            }
          />
        </RadioGroup>
      </Card>

      {/* 2. Household Sharing & Hierarchy Section */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "rgba(108, 122, 224, 0.25)",
          bgcolor: "rgba(15, 14, 58, 0.5)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1.5, flexWrap: "wrap", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <HouseholdIcon sx={{ color: "primary.main" }} />
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                Household Sharing & Multi-User Access
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Invite family members to control stopwatches and log daily usage while keeping master billing locked
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PersonAddIcon />}
            onClick={handleOpenInviteModal}
            sx={{ borderRadius: 2.5, fontWeight: 800, px: 2, fontSize: "0.8125rem" }}
          >
            Invite Family Member
          </Button>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Members Table */}
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2.5, bgcolor: "rgba(0, 0, 0, 0.2)", border: "1px solid rgba(255, 255, 255, 0.08)" }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: "rgba(255, 255, 255, 0.03)" }}>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>MEMBER</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>EMAIL</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>ROLE & PERMISSIONS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary" }}>STATUS</TableCell>
                <TableCell sx={{ fontWeight: 800, fontSize: "0.75rem", color: "text.secondary", textAlign: "right" }}>ACTIONS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {members.map((m) => (
                <TableRow key={m.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                      <Avatar sx={{ width: 30, height: 30, bgcolor: m.role === "owner" ? "primary.main" : "secondary.main", fontSize: "0.75rem", fontWeight: 800 }}>
                        {m.name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 800 }}>
                        {m.name}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: "monospace" }}>
                      {m.email}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {m.role === "owner" ? (
                      <Chip
                        icon={<ShieldIcon sx={{ fontSize: "14px !important", color: "#ffd54f !important" }} />}
                        label="👑 Household Owner (Full Access)"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "rgba(255, 213, 79, 0.15)", color: "#ffd54f", border: "1px solid rgba(255, 213, 79, 0.3)" }}
                      />
                    ) : (
                      <Chip
                        icon={<BoltIcon sx={{ fontSize: "14px !important", color: "#60a5fa !important" }} />}
                        label="👥 Family Member (Usage Logging)"
                        size="small"
                        sx={{ fontWeight: 800, fontSize: "0.6875rem", bgcolor: "rgba(96, 165, 250, 0.15)", color: "#60a5fa", border: "1px solid rgba(96, 165, 250, 0.3)" }}
                      />
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={m.status === "active" ? "🟢 Active" : `⏳ Pending (${m.inviteCode || "Invite"})`}
                      size="small"
                      color={m.status === "active" ? "success" : "warning"}
                      variant="outlined"
                      sx={{ fontWeight: 800, fontSize: "0.6875rem", height: 22 }}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "right" }}>
                    {m.role === "owner" ? (
                      <Typography variant="caption" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                        Primary Admin
                      </Typography>
                    ) : (
                      <Button
                        size="small"
                        color="error"
                        onClick={() => handleRemoveMember(m.id, m.name)}
                        sx={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "none", py: 0.2 }}
                      >
                        Remove
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Hierarchy Explanation Matrix */}
        <Box sx={{ mt: 3, p: 2, borderRadius: 2.5, bgcolor: "rgba(108, 122, 224, 0.06)", border: "1px solid rgba(108, 122, 224, 0.15)" }}>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.light", display: "block", mb: 1 }}>
            🛡️ HOUSEHOLD PERMISSION MATRIX
          </Typography>
          <Grid container spacing={1.5}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: "#34d399", mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block" }}>
                    👑 Household Owner (Admin)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Complete access to ALL features: inventory, billing rates, spaces, AI Scanner, CSV exports, invite members, and account settings.
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                <CheckIcon sx={{ fontSize: 16, color: "#60a5fa", mt: 0.2 }} />
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary", display: "block" }}>
                    👥 Family Member (Usage Logging)
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Can control live stopwatches, log daily hours on Smart Calendar, and view load curves. Restricted from master rate changes and account deletion.
                  </Typography>
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Card>

      {/* 3. Danger Zone: Account Deletion */}
      <Card
        sx={{
          p: { xs: 2.5, sm: 3 },
          borderRadius: 3.5,
          border: "1px solid",
          borderColor: "rgba(248, 113, 113, 0.3)",
          bgcolor: "rgba(127, 29, 29, 0.12)",
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <WarningIcon sx={{ color: "error.main" }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "error.light" }}>
                Danger Zone: Account Deletion
              </Typography>
            </Box>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", lineHeight: 1.5 }}>
              Permanently erase your account, registered appliances, daily calendar logs, live stopwatch history, and analytics records. This action is irreversible.
            </Typography>
          </Box>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleOpenDeleteModal}
            sx={{
              borderRadius: 2.5,
              fontWeight: 800,
              px: 2.5,
              fontSize: "0.8125rem",
              borderColor: "rgba(248, 113, 113, 0.5)",
              "&:hover": { bgcolor: "rgba(248, 113, 113, 0.15)", borderColor: "error.main" },
            }}
          >
            Delete My Account
          </Button>
        </Box>
      </Card>

      {/* Invite Member Dialog */}
      <Dialog
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              border: "1px solid rgba(129, 140, 248, 0.3)",
              bgcolor: "rgba(15, 14, 58, 0.95)",
              backdropFilter: "blur(20px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1.25 }}>
          <PersonAddIcon sx={{ color: "primary.main" }} />
          Invite Household Family Member
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {!generatedInvite ? (
            <Box component="form" onSubmit={handleSendInvite} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Enter the name and email address of the family member you want to add. They will receive permission to control appliance stopwatches and log daily hours.
              </Typography>
              <TextField
                label="Full Name"
                placeholder="e.g. Maria Santos"
                fullWidth
                size="small"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
              />
              <TextField
                label="Email Address"
                placeholder="e.g. maria@gmail.com"
                type="email"
                fullWidth
                size="small"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setIsInviteModalOpen(false)} sx={{ fontWeight: 700 }}>
                  Cancel
                </Button>
                <Button type="submit" variant="contained" color="primary" sx={{ fontWeight: 800, borderRadius: 2 }}>
                  Generate Invitation
                </Button>
              </DialogActions>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, py: 1 }}>
              <Alert severity="success" sx={{ borderRadius: 2.5 }}>
                Invitation successfully created for <strong>{inviteName}</strong>!
              </Alert>

              <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: "rgba(0, 0, 0, 0.4)", border: "1px solid rgba(99, 102, 241, 0.3)" }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 800, display: "block", mb: 0.5 }}>
                  HOUSEHOLD INVITE CODE:
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 900, fontFamily: "monospace", color: "#ffd54f", letterSpacing: 2 }}>
                  {generatedInvite.code}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <TextField
                  fullWidth
                  size="small"
                  value={generatedInvite.link}
                  slotProps={{ input: { readOnly: true, sx: { fontFamily: "monospace", fontSize: "0.75rem" } } }}
                />
                <Button
                  variant="contained"
                  color={copiedLink ? "success" : "primary"}
                  startIcon={copiedLink ? <CheckIcon /> : <CopyIcon />}
                  onClick={handleCopyLink}
                  sx={{ borderRadius: 2, fontWeight: 800, flexShrink: 0, height: 40 }}
                >
                  {copiedLink ? "Copied" : "Copy Link"}
                </Button>
              </Box>

              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Share this link on Messenger or Viber. When they register, they will automatically be joined to your household.
              </Typography>

              <DialogActions sx={{ px: 0, pt: 1 }}>
                <Button onClick={() => setIsInviteModalOpen(false)} variant="outlined" sx={{ fontWeight: 700, borderRadius: 2 }}>
                  Done
                </Button>
              </DialogActions>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      {/* Strict 2-Step Account Deletion Security Dialog */}
      <Dialog
        open={isDeleteModalOpen}
        onClose={() => !isDeleting && setIsDeleteModalOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 3.5,
              border: "1px solid rgba(248, 113, 113, 0.5)",
              bgcolor: "rgba(20, 10, 25, 0.96)",
              backdropFilter: "blur(24px)",
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: "error.light", display: "flex", alignItems: "center", gap: 1.25 }}>
          <WarningIcon sx={{ color: "error.main" }} />
          Confirm Permanent Account Deletion
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Alert severity="error" sx={{ borderRadius: 2.5, fontWeight: 600 }}>
            This action is permanent and cannot be undone. All your appliances, daily logs, stopwatch records, and analytics telemetry will be deleted.
          </Alert>

          {deleteError && (
            <Alert severity="warning" sx={{ borderRadius: 2.5, fontWeight: 700 }}>
              {deleteError}
            </Alert>
          )}

          {/* Step 1: Password Verification */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              STEP 1: ENTER YOUR ACCOUNT PASSWORD
            </Typography>
            <TextField
              type={showPassword ? "text" : "password"}
              size="small"
              placeholder="Enter current password..."
              fullWidth
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon fontSize="small" sx={{ color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          {/* Step 2: Explicit Confirmation Text */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "text.primary" }}>
              STEP 2: TYPE <span style={{ color: "#f87171", fontWeight: 900 }}>Confirm</span> TO AUTHORIZE DELETION
            </Typography>
            <TextField
              size="small"
              placeholder="Type 'Confirm'..."
              fullWidth
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              disabled={isDeleting}
              slotProps={{
                input: {
                  sx: { fontFamily: "monospace", fontWeight: 800 },
                },
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} sx={{ fontWeight: 700 }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={!isDeleteReady || isDeleting}
            onClick={handleExecuteAccountDeletion}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : <DeleteIcon />}
            sx={{ fontWeight: 900, borderRadius: 2, px: 2.5 }}
          >
            {isDeleting ? "Deleting Account..." : "Permanently Delete My Account"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SettingsView;
