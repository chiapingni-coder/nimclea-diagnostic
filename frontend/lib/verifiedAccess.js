export function hasVerifiedAccess() {
  if (typeof localStorage === "undefined") return false;

  return (
    localStorage.getItem("nimclea_email_verified") === "true" ||
    localStorage.getItem("nimclea_session_verified") === "true" ||
    localStorage.getItem("nimclea_dev_auth_override") === "true"
  );
}
