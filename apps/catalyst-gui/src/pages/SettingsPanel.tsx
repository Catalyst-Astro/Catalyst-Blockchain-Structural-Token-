import React from "react";
import { Bot, Settings, TerminalSquare } from "lucide-react";

import Button from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

interface SettingsPanelProps {
  theme: "light" | "dark";
  notifications: NotificationSettings | null;
  apiBaseUrl: string;
  activationCommands: string[];
  onToggleTheme: () => void;
  onUpdateNotifications: (patch: Partial<NotificationSettings>) => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  theme,
  notifications,
  apiBaseUrl,
  activationCommands,
  onToggleTheme,
  onUpdateNotifications,
}) => {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.05fr,0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5 text-primary" aria-hidden />
            <span>Settings</span>
          </CardTitle>
          <CardDescription>Theme, notifications, and backend activation hints for the Electron shell.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border/80 bg-card/60 p-4">
            <div>
              <p className="font-semibold">Theme</p>
              <p className="text-sm text-muted">Switch the operator console visual mode.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={onToggleTheme}>
              {theme === "light" ? "Dark mode" : "Light mode"}
            </Button>
          </div>

          <div className="space-y-3 rounded-lg border border-border/80 bg-card/60 p-4">
            <div className="flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" aria-hidden />
              <p className="font-semibold">Notifications</p>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Email alerts</p>
                <p className="text-sm text-muted">Notify approvals and blocked cases by email.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onUpdateNotifications({ emailEnabled: !notifications?.emailEnabled })}
              >
                {notifications?.emailEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold">Slack alerts</p>
                <p className="text-sm text-muted">Push operator events to your webhook.</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onUpdateNotifications({ slackEnabled: !notifications?.slackEnabled })}
              >
                {notifications?.slackEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
            <p className="text-xs text-muted">
              Backend URL resolved by Electron: <span className="font-semibold text-fg">{apiBaseUrl}</span>
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card to-primary/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <TerminalSquare className="h-5 w-5 text-primary" aria-hidden />
            <span>Activation</span>
          </CardTitle>
          <CardDescription>Run these commands to keep the GUI and its governed UI copilot in sync.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {activationCommands.map((command) => (
            <div key={command} className="rounded-md bg-border/40 px-3 py-2 font-mono text-sm">
              {command}
            </div>
          ))}
          <p className="text-sm text-muted">
            `gui:doctor` expects the backend to be live and checks that Electron preload and renderer typings stay aligned.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPanel;
