import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../theme';

// Thin wrapper over @expo/vector-icons MaterialIcons. See docs/adr/0003.
// Kept minimal so the underlying set can be swapped without touching callers.
export type IconName = React.ComponentProps<typeof MaterialIcons>['name'];

type Props = {
  name: IconName;
  size?: number;
  color?: string;
};

export function Icon({ name, size = 24, color = colors.textPrimary }: Props) {
  return <MaterialIcons name={name} size={size} color={color} />;
}
