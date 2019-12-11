import { act, renderHook } from "@testing-library/react-hooks";
import RoomServiceClient from "./client";
import { useRoomService } from "./index";
import { DUMMY_PATH, DUMMY_URL, mockAuthEndpoint } from "./test-util";

jest.mock("idb-keyval");

test("should call connect and publish", async () => {
  jest.mock("socket.io-client");
  mockAuthEndpoint();
  const client = new RoomServiceClient(DUMMY_URL + DUMMY_PATH);

  const connect = jest.fn();
  const publish = jest.fn();

  // @ts-ignore because we're doing deep mocking magic and typescript
  // is justifiably horrified at our behavior
  jest.spyOn(client, "room").mockImplementation((a, r) => {
    // Mock room class
    return new (class {
      constructor() {}
      async connect(...args: any[]) {
        connect(...args);
      }
      disconnect() {}
      onUpdate() {}
      onConnect() {}
      onDisconnect() {}
      publish(...args: any[]) {
        publish(...args);
      }
    })();
  });

  // @ts-ignore "wait" does exist but the typings for the lib are bad
  const { result, wait } = renderHook(() => useRoomService(client, "my-room"));

  // Can we call setState without problems before
  // we're connected?
  act(() => {
    const [_, setState] = result.current;
    setState(prevState => {
      prevState.value = "literally anything";
    });
  });

  // We've mocked the function, so the only value is checking
  // if it got called
  expect(publish.mock.calls.length).toBe(1);

  // Wait to see if we'll connect
  await wait(() => connect.mock.calls.length === 1, {
    // this isn't actually making a network call, since it's mocked.
    // we're just waiting for the callstack to finish. So tiny timeout.
    timeout: 150
  });

  expect(connect.mock.calls.length).toBe(1); // Sanity check
});