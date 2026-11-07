import { useState } from "react"

import { api } from "@/api/client"
import type { Settings, SettingsAnswer } from "@/api/types"
import { useChange, useSettings } from "@/app/queries"
import { LoadError } from "@/components/load-error"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useYourName } from "@/lib/your-name"

export function SettingsPage() {
  const settings = useSettings()
  if (settings.error) return <LoadError error={settings.error} />
  if (!settings.data) return null
  // The form starts from the stored settings once; after a save it already
  // shows them, and keeps saying "Saved."
  return <SettingsForm settings={settings.data} />
}

function SettingsForm({ settings }: { settings: SettingsAnswer }) {
  const name = useYourName()
  const [googlePlayId, setGooglePlayId] = useState(settings.googlePlayId ?? "")
  const [appStoreId, setAppStoreId] = useState(settings.appStoreId ?? "")
  const [supportChannel, setSupportChannel] = useState(settings.supportChannel)
  const [threshold, setThreshold] = useState(String(settings.threshold))
  const save = useChange(() =>
    api<Settings>("/api/settings", {
      method: "PUT",
      body: {
        googlePlayId: googlePlayId.trim() || null,
        appStoreId: appStoreId.trim() || null,
        supportChannel,
        threshold: Number(threshold),
        by: name,
      },
    })
  )
  return (
    <section className="max-w-xl space-y-4">
      <h1 className="text-xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>The app to watch</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              save.mutate(undefined)
            }}
          >
            <Field id="play" label="Google Play ID" hint="Like com.example.app">
              <Input
                id="play"
                value={googlePlayId}
                onChange={(e) => setGooglePlayId(e.target.value)}
              />
            </Field>
            <Field id="apple" label="App Store ID" hint="The app's number, like 123456789">
              <Input
                id="apple"
                inputMode="numeric"
                value={appStoreId}
                onChange={(e) => setAppStoreId(e.target.value)}
              />
            </Field>
            <Field
              id="support"
              label="Support channel"
              hint="Every reply ends with it, word for word."
            >
              <Input
                id="support"
                value={supportChannel}
                onChange={(e) => setSupportChannel(e.target.value)}
              />
            </Field>
            <Field
              id="threshold"
              label="Confidence threshold"
              hint="Below it, a review goes to a person (0 to 1)."
            >
              <Input
                id="threshold"
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </Field>
            {save.error && (
              <p role="alert" className="text-sm text-destructive">
                {save.error.message}
              </p>
            )}
            {save.isSuccess && <p className="text-sm text-success">Saved.</p>}
            <Button type="submit" disabled={save.isPending || !name}>
              Save
            </Button>
            {!name && (
              <p className="text-sm text-muted-foreground">Type your name at the top first.</p>
            )}
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Claude and posting</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-2">
            Anthropic API key
            {settings.apiKeySet ? (
              <Badge variant="success">Set</Badge>
            ) : (
              <Badge variant="warning">Not set</Badge>
            )}
          </p>
          <p className="text-muted-foreground">
            The key lives only in the <code>.env</code> file on this computer, as ANTHROPIC_API_KEY;
            this page never shows it.
          </p>
          <p>
            Approved replies go to{" "}
            {settings.poster === "google_play"
              ? "Google Play, with the app owner's credentials."
              : "a stand-in that records them: nothing is posted to a real app."}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}
