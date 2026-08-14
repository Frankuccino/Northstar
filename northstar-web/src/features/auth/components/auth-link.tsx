import { Link } from "react-router-dom";

type AuthLinkProps = {
  text: string;
  linkText: string;
  to: string;
};

export const AuthLink = ({ text, linkText, to }: AuthLinkProps) => {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {text}{" "}
      <Link to={to} className="font-medium text-primary underline underline-offset-4">
        {linkText}
      </Link>
    </p>
  );
};
