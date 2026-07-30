// Jest setup for the `ui` project. Two things:
//
// 1. React 19 requires `IS_REACT_ACT_ENVIRONMENT = true` for the concurrent
//    renderer to treat this as an act-scoped test env. Without it, async
//    state updates from prior tests (Tamagui portals, setInterval flushes)
//    escape act() boundaries and pile up on the next test — later tests
//    then time out even when nothing is wrong with the render itself.
//
// 2. RN Testing Library's default asyncUtilTimeout of 1000ms is too tight
//    for React Native + Tamagui renders under jest's process; bumping it
//    gives large suites headroom to settle.
import { configure } from '@testing-library/react-native';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

configure({ asyncUtilTimeout: 5000 });
