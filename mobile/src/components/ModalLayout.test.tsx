import { fireEvent, render } from '@testing-library/react-native';
import { Text } from 'react-native';

// Capture RN Modal props so we can invoke onRequestClose (hardware back on Android)
// without needing a native modal manager in the test environment.
const modalProps: any[] = [];
jest.mock('react-native/Libraries/Modal/Modal', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: function MockModal(props: any) {
      modalProps.push(props);
      return props.visible ? React.createElement(React.Fragment, null, props.children) : null;
    },
  };
});

import { ModalLayout } from './ModalLayout';

describe('ModalLayout', () => {
  beforeEach(() => {
    modalProps.length = 0;
  });

  it('renders the title and children when open', async () => {
    const { findByText } = await render(
      <ModalLayout open onCancel={() => {}} title="Unfilled slots">
        <Text>modal-body</Text>
      </ModalLayout>
    );
    expect(await findByText('Unfilled slots')).toBeTruthy();
    expect(await findByText('modal-body')).toBeTruthy();
  });

  it('does not render children when closed', async () => {
    const { queryByText } = await render(
      <ModalLayout open={false} onCancel={() => {}} title="Unfilled slots">
        <Text>modal-body</Text>
      </ModalLayout>
    );
    expect(queryByText('modal-body')).toBeNull();
  });

  it('does NOT call onCancel when the backdrop is pressed (tap-outside ignored)', async () => {
    const onCancel = jest.fn();
    const { findByTestId } = await render(
      <ModalLayout open onCancel={onCancel} title="x">
        <Text>x</Text>
      </ModalLayout>
    );
    fireEvent.press(await findByTestId('modal-backdrop'));
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('calls onCancel when hardware back fires (Modal onRequestClose)', async () => {
    const onCancel = jest.fn();
    await render(
      <ModalLayout open onCancel={onCancel} title="x">
        <Text>x</Text>
      </ModalLayout>
    );
    const props = modalProps[modalProps.length - 1];
    props.onRequestClose();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
