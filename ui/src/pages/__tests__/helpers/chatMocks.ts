/**
 * Shared mock factories for Chat test suite.
 * jest.mock factory closures capture these refs (safe since factories run after imports resolve).
 */
export const mockUseParams = jest.fn();
export const mockUseServerStore = jest.fn();
export const mockUseEventStream = jest.fn();
export const mockUseMemoryExtraction = jest.fn();
export const mockUseMemoryInjection = jest.fn();
export const mockListMessages = jest.fn();
export const mockGetSession = jest.fn();
export const mockCreateSession = jest.fn();
export const mockUpdateSession = jest.fn();
export const mockPromptAsync = jest.fn();
export const mockRespondPermission = jest.fn();
export const mockSetSession = jest.fn();
export const mockSetStatus = jest.fn();
export const mockHydrateTurns = jest.fn();
export const mockUpsertMessage = jest.fn();
export const mockUpsertPart = jest.fn();
export const mockRemoveMessage = jest.fn();
export const mockRemovePart = jest.fn();
export const mockPushPermission = jest.fn();
export const mockResolvePermission = jest.fn();
export const mockReset = jest.fn();
