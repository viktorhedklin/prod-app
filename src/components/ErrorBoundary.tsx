import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Screen crashed', error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <Box sx={{ p: 3, maxWidth: 520, mx: 'auto' }}>
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          This screen hit an error. Your data is still saved.
        </Alert>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {this.state.error.message}
        </Typography>
        <Button variant="contained" onClick={() => this.setState({ error: null })}>
          Try again
        </Button>
      </Box>
    );
  }
}
