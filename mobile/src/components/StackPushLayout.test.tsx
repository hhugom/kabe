import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { StackPushLayout } from './StackPushLayout';

describe('StackPushLayout', () => {
  it('renders the entryHeader slot', async () => {
    const { findByText } = await render(
      <StackPushLayout
        entryHeader={<Text>eyebrow-and-title</Text>}
        primary={{ title: 'Save', onPress: () => {} }}
      >
        <Text>content</Text>
      </StackPushLayout>
    );
    expect(await findByText('eyebrow-and-title')).toBeTruthy();
  });

  it('renders the children content', async () => {
    const { findByText } = await render(
      <StackPushLayout primary={{ title: 'Save', onPress: () => {} }}>
        <Text>body-content</Text>
      </StackPushLayout>
    );
    expect(await findByText('body-content')).toBeTruthy();
  });

  it('renders the primary button title and fires onPress on tap', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(
      <StackPushLayout primary={{ title: 'Save', onPress }}>
        <Text>content</Text>
      </StackPushLayout>
    );
    fireEvent.press(await findByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('respects the primary disabled flag', async () => {
    const onPress = jest.fn();
    const { findByText } = await render(
      <StackPushLayout primary={{ title: 'Save', onPress, disabled: true }}>
        <Text>content</Text>
      </StackPushLayout>
    );
    fireEvent.press(await findByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('does not render Cancel when the cancel slot is omitted', async () => {
    const { queryByText } = await render(
      <StackPushLayout primary={{ title: 'Save', onPress: () => {} }}>
        <Text>content</Text>
      </StackPushLayout>
    );
    expect(queryByText('Cancel')).toBeNull();
  });

  it('renders Cancel below primary when the cancel slot is provided, and fires onPress on tap', async () => {
    const onCancel = jest.fn();
    const { findByText } = await render(
      <StackPushLayout
        primary={{ title: 'Save', onPress: () => {} }}
        cancel={{ title: 'Cancel', onPress: onCancel }}
      >
        <Text>content</Text>
      </StackPushLayout>
    );
    fireEvent.press(await findByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
