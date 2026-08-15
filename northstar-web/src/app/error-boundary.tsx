import { Component, type ReactNode } from "react";

type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

// Top-level error boundary. Without one, any render throw in a child blanks the
// whole app (React's default dev overlay). This contains the failure, shows the
// message, and offers a reset — see docs/FRONTEND_IA_AND_UI.md Gap 7.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <div
          role="alert"
          className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center"
        >
          <h1 className="text-xl font-semibold">Something went wrong</h1>
          <pre className="max-w-md overflow-auto rounded-xl bg-muted p-3 text-left text-sm text-muted-foreground">
            {this.state.error.message}
          </pre>
          <button
            onClick={this.handleReset}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
