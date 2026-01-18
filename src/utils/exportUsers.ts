interface UserData {
  id: string;
  first_name: string;
  last_name: string;
  username: string;
  referral_code: string;
  detected_country: string;
  country_code: string;
  geo_zone: string;
  total_earnings: number;
  is_vip: boolean;
  vpn_detected: boolean;
  ip_address: string;
  created_at: string;
}

export const exportUsersToCSV = (users: UserData[], filename: string = "users_export") => {
  if (users.length === 0) {
    return;
  }

  const headers = [
    "ID",
    "First Name",
    "Last Name",
    "Username",
    "Referral Code",
    "Country",
    "Country Code",
    "Zone",
    "Total Earnings (₦)",
    "VIP Status",
    "VPN Detected",
    "IP Address",
    "Created At"
  ];

  const rows = users.map(user => [
    user.id,
    user.first_name || "",
    user.last_name || "",
    user.username || "",
    user.referral_code || "",
    user.detected_country || "",
    user.country_code || "",
    user.geo_zone || "",
    user.total_earnings?.toString() || "0",
    user.is_vip ? "Yes" : "No",
    user.vpn_detected ? "Yes" : "No",
    user.ip_address || "",
    user.created_at ? new Date(user.created_at).toLocaleString() : ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportReferralsToCSV = (referrals: any[], filename: string = "referrals_export") => {
  if (referrals.length === 0) return;

  const headers = [
    "Referrer Name",
    "Referral Code",
    "Referee Name",
    "Amount (₦)",
    "Status",
    "Created At",
    "Completed At"
  ];

  const rows = referrals.map(ref => [
    `${ref.referrer?.first_name || ""} ${ref.referrer?.last_name || ""}`.trim(),
    ref.referrer?.referral_code || "",
    `${ref.referee?.first_name || ""} ${ref.referee?.last_name || ""}`.trim(),
    ref.amount?.toString() || "0",
    ref.status || "pending",
    ref.created_at ? new Date(ref.created_at).toLocaleString() : "",
    ref.completed_at ? new Date(ref.completed_at).toLocaleString() : ""
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
