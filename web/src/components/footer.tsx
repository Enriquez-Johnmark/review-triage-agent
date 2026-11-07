/** Said on every page (G1). */
export const NOT_AFFILIATED = "Uses public app-store reviews. Not affiliated with any app's maker."

export function Footer() {
  return (
    <footer className="border-t py-4 text-center text-xs text-muted-foreground">
      {NOT_AFFILIATED}
    </footer>
  )
}
