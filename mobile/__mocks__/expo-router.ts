export const useRouter = jest.fn(() => ({
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
}));

export const useLocalSearchParams = jest.fn(() => ({}));
export const useSegments = jest.fn(() => []);
export const Link = 'Link';
export const Tabs = Object.assign(
  ({ children }: any) => children,
  { Screen: ({ children }: any) => children }
);
export const Stack = Object.assign(
  ({ children }: any) => children,
  { Screen: ({ children }: any) => children }
);
