export async function getDailyCareStatus() {
  const res = await fetch("/api/daily/care/status", { credentials: "include" });
  return res.json();
}

export async function completeDailyCare() {
  const res = await fetch("/api/daily/care/complete", {
    method: "POST",
    credentials: "include",
  });
  return res.json();
}
