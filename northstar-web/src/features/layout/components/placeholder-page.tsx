import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

// Placeholder for routes not yet built. Keeps nav links from 404ing while the
// corresponding feature (Employees CRUD, Admin) is implemented.
export const PlaceholderPage = ({ title }: { title: string }) => {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This section is part of the planned roadmap. Implementation follows the
        Workspace and role-union work.
      </p>
      <Button variant="outline">
        <Link to="/dashboard">Back to Dashboard</Link>
      </Button>
    </div>
  );
};

