type MarkTarget = { type: 'file' | 'folder', id: number };

export async function markItem(target: MarkTarget, marked: boolean): Promise<void> {
  const params = new URLSearchParams({
    [target.type === 'file' ? 'fid' : 'flid']: String(target.id),
    m: String(marked)
  });
  const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/file/mark?${params}`, {
    method: "PATCH",
    credentials: "include"
  });
  if (!response.ok) throw new Error("Could not update marked state");

  // The endpoint may return an empty response or a JSON success envelope.
  const text = await response.text();
  if (text && response.headers.get("content-type")?.includes("application/json")) {
    const result = JSON.parse(text);
    if (result?.success === false) throw new Error("Could not update marked state");
  }
}
