import { render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { TabRootLayout } from './TabRootLayout';

describe('TabRootLayout', () => {
  it('renders the Chrome mark "Kabe"', async () => {
    const { findByText } = await render(
      <TabRootLayout>
        <Text>content</Text>
      </TabRootLayout>
    );
    expect(await findByText('Kabe')).toBeTruthy();
  });

  it('renders the hero slot when provided', async () => {
    const { findByText } = await render(
      <TabRootLayout hero={<Text>hero-eyebrow</Text>}>
        <Text>content</Text>
      </TabRootLayout>
    );
    expect(await findByText('hero-eyebrow')).toBeTruthy();
  });

  it('renders the children content', async () => {
    const { findByText } = await render(
      <TabRootLayout>
        <Text>body-content</Text>
      </TabRootLayout>
    );
    expect(await findByText('body-content')).toBeTruthy();
  });
});
