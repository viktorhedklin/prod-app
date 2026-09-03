import React from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';

interface Props {
  children: React.ReactNode;
  /** Name of the screen shown in the fallback message */
  screenName?: string;
  /** Called when the user wants to leave the crashed screen */
  onNavigateHome?: () => void;
}

interface State {
  error: Error | null;
}

/**
 * ErrorBoundary — catches render errors inside one screen so a single
 * crashing page never takes down the whole app. Shows a graceful
 * fallback with recovery actions instead of a blank page.
 */
export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Log for debugging without crashing the app
    console.error(`[${this.props.screenName ?? 'Screen'}] crashed:`, error, info.componentStack);
  }

  componentDidUpdate(prevProps: Props) {
    // If the user navigated to a different screen, reset the crash state
    // so the boundary can try rendering the new screen fresh.
    if (prevProps.screenName !== this.props.screenName && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
          <Paper elevation={2} sx={{ p: 4, maxWidth: 520, textAlign: 'center' }}>
            <Typography variant="h5" gutterBottom>
              ⚠️ {this.props.screenName ?? 'This page'} hit a snag
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              The rest of the app is fine — your data is safe. You can go back
              to the copilot or retry this page.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button variant="contained" onClick={this.props.onNavigateHome}>
                Back to Copilot
              </Button>
              <Button variant="outlined" onClick={() => this.setState({ error: null })}>
                Retry
              </Button>
            </Box>
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', mt: 2, fontFamily: 'monospace' }}
            >
              {this.state.error.message}
            </Typography>
          </Paper>
        </Box>
      );
    }
    return this.props.children;
  }
}
