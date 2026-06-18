import type { NewDrill } from '@/db/schema';

type SeedDrill = Omit<NewDrill, 'id' | 'createdAt' | 'updatedAt' | 'syncedAt' | 'isCustom'>;

export const seedDrills: SeedDrill[] = [
  {
    name: 'Forehand groundstroke',
    category: 'groundstroke',
    shotType: 'forehand',
    description: 'Standard forehand baseline rally against the wall.',
  },
  {
    name: 'Backhand groundstroke',
    category: 'groundstroke',
    shotType: 'backhand',
    description: 'Standard backhand baseline rally against the wall.',
  },
  {
    name: 'Forehand crosscourt',
    category: 'groundstroke',
    shotType: 'forehand',
    description: 'Aim forehand to the opposite side of the wall.',
  },
  {
    name: 'Backhand crosscourt',
    category: 'groundstroke',
    shotType: 'backhand',
    description: 'Aim backhand to the opposite side of the wall.',
  },
  {
    name: 'Forehand down the line',
    category: 'groundstroke',
    shotType: 'forehand',
    description: 'Aim forehand straight ahead, parallel to a sideline.',
  },
  {
    name: 'Backhand down the line',
    category: 'groundstroke',
    shotType: 'backhand',
    description: 'Aim backhand straight ahead, parallel to a sideline.',
  },
  {
    name: 'Alternating forehand / backhand',
    category: 'groundstroke',
    shotType: 'both',
    description: 'Alternate sides every hit. Trains footwork and recovery.',
  },
  {
    name: 'Forehand topspin (heavy)',
    category: 'groundstroke',
    shotType: 'forehand',
    description: 'Brushing low-to-high contact, emphasize spin over speed.',
  },
  {
    name: 'Forehand slice',
    category: 'groundstroke',
    shotType: 'forehand',
    description: 'High-to-low contact, low trajectory, used as a defensive shot.',
  },
  {
    name: 'Backhand slice',
    category: 'groundstroke',
    shotType: 'backhand',
    description: 'High-to-low backhand, keep ball low and skidding.',
  },
  {
    name: 'Forehand volley',
    category: 'volley',
    shotType: 'forehand',
    description: 'Short, punched forehand at the net, no swing.',
  },
  {
    name: 'Backhand volley',
    category: 'volley',
    shotType: 'backhand',
    description: 'Short, punched backhand at the net, no swing.',
  },
  {
    name: 'Alternating volleys',
    category: 'volley',
    shotType: 'both',
    description: 'Alternate forehand/backhand volleys close to the wall.',
  },
  {
    name: 'Half-volley pickup',
    category: 'volley',
    shotType: 'both',
    description: 'Catch the ball on the short hop, both wings.',
  },
  {
    name: 'Overhead / smash',
    category: 'specialty',
    shotType: 'overhead',
    description: 'High wall feed, overhead smash, recovery, repeat.',
  },
];
