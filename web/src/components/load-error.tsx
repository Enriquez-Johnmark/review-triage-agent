export function LoadError({ error }: { error: Error }) {
  return (
    <p role="alert" className="text-sm text-destructive">
      Couldn't load this: {error.message}
    </p>
  )
}
