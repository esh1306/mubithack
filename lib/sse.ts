// Reads a text/event-stream response body and calls onEvent for each event.
export async function readSse(
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onEvent: (event: string, data: any) => void,
) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += value;
    let i;
    while ((i = buf.indexOf("\n\n")) !== -1) {
      const chunk = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const event = /^event: (.*)$/m.exec(chunk)?.[1] ?? "message";
      const data = /^data: (.*)$/m.exec(chunk)?.[1];
      if (data) onEvent(event, JSON.parse(data));
    }
  }
}
