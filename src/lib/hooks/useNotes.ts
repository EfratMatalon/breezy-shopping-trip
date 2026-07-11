import { useMutation, useQueryClient } from "@tanstack/react-query";
import { addNote, updateNote, deleteNote } from "../queries/notes";
import { queryKeys } from "../queries/queryKeys";

function useInvalidateNotes(listId: string | undefined) {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: queryKeys.notes(listId) });
}

export function useAddNote(listId: string | undefined) {
  const invalidate = useInvalidateNotes(listId);
  return useMutation({
    mutationFn: ({ note, title }: { note: string; title: string | null }) => {
      if (!listId) throw new Error("No active list");
      return addNote(listId, note, title);
    },
    onSuccess: invalidate,
  });
}

export function useUpdateNote(listId: string | undefined) {
  const invalidate = useInvalidateNotes(listId);
  return useMutation({
    mutationFn: ({ id, note, title }: { id: string; note: string; title: string | null }) =>
      updateNote(id, note, title),
    onSuccess: invalidate,
  });
}

export function useDeleteNote(listId: string | undefined) {
  const invalidate = useInvalidateNotes(listId);
  return useMutation({
    mutationFn: (id: string) => deleteNote(id),
    onSuccess: invalidate,
  });
}
