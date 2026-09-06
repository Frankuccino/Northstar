import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { acceptInvitation } from "../api/workspace.api";

export const AcceptInvitationPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing invitation token.");
      return;
    }

    acceptInvitation(token)
      .then(() => {
        setStatus("success");
        setMessage("Invitation accepted. You can now close this page.");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Invalid or expired invitation.");
      });
  }, [token]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="w-full max-w-sm space-y-4 rounded-md border p-6 text-center">
        <h1 className="text-lg font-semibold">Invitation</h1>
        {status === "loading" && <p>Accepting invitation…</p>}
        {status === "success" && <p>{message}</p>}
        {status === "error" && (
          <div className="space-y-2">
            <p className="text-destructive">{message}</p>
            <a className="text-sm underline" href="/login">Go to login</a>
          </div>
        )}
      </div>
    </div>
  );
};
