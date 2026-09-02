import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card } from "@heroui/react";

export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("React application error", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="centered-page">
        <Card className="status-card">
          <Card.Header>
            <Card.Title>Application error</Card.Title>
            <Card.Description>{this.state.error.message}</Card.Description>
          </Card.Header>
          <Card.Footer>
            <Button onPress={() => location.reload()}>Reload</Button>
          </Card.Footer>
        </Card>
      </main>
    );
  }
}
