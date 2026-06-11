import { Link } from "react-router-dom";

type AuthLinkProps = {
  text: string;
  linkText: string;
  to: string;
};

export const AuthLink = ({ text, linkText, to }: AuthLinkProps) => {
  return (
    <p className="text-ceter text-sm text-muted-foreground">
      {text}{" "}
      <Link to={to} className="font-medium underline underline-offset-4">
        {linkText}
      </Link>
    </p>
  );
};
