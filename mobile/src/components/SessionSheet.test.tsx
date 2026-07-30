// InSessionScreen is stubbed at module-boundary so this suite exercises only
// the sheet chrome — peek label lifecycle, inset hook, and the reset-on-end
// contract. The real InSessionScreen has its own suite; wiring it here would
// pull in the entire session state machine for tests about the shell.
jest.mock('../screens/InSessionScreen', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const { useSessionPeekPublisher } = require('./SessionSheet');
  return {
    InSessionScreen: () => {
      const publish = useSessionPeekPublisher();
      // Expose the publisher into the tree so tests can drive it.
      (globalThis as any).__peekPublish = publish;
      return React.createElement(Text, null, 'insession-mock');
    },
  };
});

import { act, cleanup, render } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider } from 'tamagui';
import tamaguiConfig from '../../tamagui.config';
import {
  SessionSheetProvider,
  useSessionPeekPublisher,
  useSessionSheetInset,
} from './SessionSheet';

afterEach(() => {
  cleanup();
  delete (globalThis as any).__peekPublish;
});

function Providers({
  children,
  sessionActive,
  tabBarVisible,
}: {
  children: React.ReactNode;
  sessionActive: boolean;
  tabBarVisible: boolean;
}) {
  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme="kabe_dark">
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 400, height: 800 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <SessionSheetProvider
          sessionActive={sessionActive}
          onSessionEnded={() => {}}
          tabBarVisible={tabBarVisible}
        >
          {children}
        </SessionSheetProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}

async function wrap(
  children: React.ReactNode,
  opts: { sessionActive?: boolean; tabBarVisible?: boolean } = {}
) {
  let result: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Providers
        sessionActive={opts.sessionActive ?? false}
        tabBarVisible={opts.tabBarVisible ?? true}
      >
        {children}
      </Providers>
    );
  });
  return result!;
}

function InsetProbe() {
  const inset = useSessionSheetInset();
  return <Text testID="inset-probe">{inset}</Text>;
}

describe('useSessionSheetInset', () => {
  it('returns 0 when no session is active', async () => {
    const { findByTestId } = await wrap(<InsetProbe />, { sessionActive: false });
    const probe = await findByTestId('inset-probe');
    expect(probe.props.children).toBe(0);
  });

  it('returns a non-zero footprint when a session is active', async () => {
    const { findByTestId } = await wrap(<InsetProbe />, { sessionActive: true });
    const probe = await findByTestId('inset-probe');
    // PEEK_HEIGHT (56) + safe-area.bottom (0 in test metrics) = 56.
    expect(probe.props.children).toBe(56);
  });
});

describe('useSessionPeekPublisher', () => {
  it('is a safe no-op when consumed outside a SessionSheetProvider', () => {
    function BareProbe() {
      const publish = useSessionPeekPublisher();
      // Must not throw. Result of calling is intentionally undefined.
      publish({ label: 'anything', startedAtMs: 0 });
      return <Text>ok</Text>;
    }
    expect(() => render(<BareProbe />)).not.toThrow();
  });
});

describe('SessionSheet peek', () => {
  it('does not render when sessionActive is false', async () => {
    const { queryByTestId } = await wrap(<View />, { sessionActive: false });
    expect(queryByTestId('session-peek')).toBeNull();
  });

  it('renders "Loading…" until InSessionScreen publishes a label', async () => {
    const { findByTestId } = await wrap(<View />, { sessionActive: true });
    const label = await findByTestId('session-peek-label');
    expect(label.props.children).toBe('Loading…');
  });

  it('reflects the published label the moment InSessionScreen publishes', async () => {
    const { findByTestId } = await wrap(<View />, { sessionActive: true });
    await act(async () => {
      (globalThis as any).__peekPublish?.({
        label: 'Wall rally',
        startedAtMs: Date.now(),
      });
    });
    const label = await findByTestId('session-peek-label');
    expect(label.props.children).toBe('Wall rally');
  });

  it('re-publishing a new label replaces the old one (peek does not go stale)', async () => {
    const { findByTestId } = await wrap(<View />, { sessionActive: true });
    await act(async () => {
      (globalThis as any).__peekPublish?.({
        label: 'Wall rally',
        startedAtMs: Date.now(),
      });
    });
    let label = await findByTestId('session-peek-label');
    expect(label.props.children).toBe('Wall rally');

    await act(async () => {
      (globalThis as any).__peekPublish?.({
        label: 'Serve target',
        startedAtMs: Date.now(),
      });
    });
    label = await findByTestId('session-peek-label');
    expect(label.props.children).toBe('Serve target');
  });

  it('renders elapsed time computed from the published startedAt', async () => {
    const realNow = Date.now;
    Date.now = () => 60_000; // T = 60s since epoch
    try {
      const { findByTestId } = await wrap(<View />, { sessionActive: true });
      await act(async () => {
        (globalThis as any).__peekPublish?.({
          label: 'Wall rally',
          startedAtMs: 15_000, // started 45s before "now"
        });
      });
      const time = await findByTestId('session-peek-time');
      expect(time.props.children).toBe('0:45');
    } finally {
      Date.now = realNow;
    }
  });

  it('resets peek meta when sessionActive flips false (next session starts clean)', async () => {
    const { findByTestId, rerender, queryByTestId } = await wrap(<View />, {
      sessionActive: true,
    });
    await act(async () => {
      (globalThis as any).__peekPublish?.({
        label: 'Wall rally',
        startedAtMs: Date.now(),
      });
    });
    expect((await findByTestId('session-peek-label')).props.children).toBe('Wall rally');

    // Simulate session end: sessionActive flips false, sheet unmounts.
    await act(async () => {
      rerender(
        <Providers sessionActive={false} tabBarVisible>
          <View />
        </Providers>
      );
    });
    expect(queryByTestId('session-peek-label')).toBeNull();

    // Now a new session starts; peek should read "Loading…", not the old label.
    await act(async () => {
      rerender(
        <Providers sessionActive tabBarVisible>
          <View />
        </Providers>
      );
    });
    expect((await findByTestId('session-peek-label')).props.children).toBe('Loading…');
  });
});
