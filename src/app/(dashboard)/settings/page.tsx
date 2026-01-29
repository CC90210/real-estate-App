'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUser } from '@/lib/hooks/useUser';
import { useTheme } from 'next-themes';
import { Moon, Sun, User, Bell, Shield, LogOut } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export default function SettingsPage() {
    const { profile, signOut, role } = useUser();
    const { theme, setTheme } = useTheme();

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your account preferences and application settings.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="w-5 h-5" /> Profile Settings
                    </CardTitle>
                    <CardDescription>Update your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="w-20 h-20">
                            <AvatarImage src={profile?.avatar_url || ''} />
                            <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                {profile?.full_name?.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm">Change Avatar</Button>
                            <p className="text-xs text-muted-foreground">JPG, GIF or PNG. Max 1MB.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Full Name</Label>
                            <Input defaultValue={profile?.full_name} />
                        </div>
                        <div className="space-y-2">
                            <Label>Email Address</Label>
                            <Input defaultValue={profile?.email} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone Number</Label>
                            <Input defaultValue={profile?.phone || ''} placeholder="+1 (555) 000-0000" />
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Input value={role?.toUpperCase()} disabled className="bg-muted" />
                        </div>
                    </div>
                    <Button>Save Changes</Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Appearance</CardTitle>
                    <CardDescription>Customize how the app looks on your device</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            <span>Dark Mode</span>
                        </div>
                        <Switch
                            checked={theme === 'dark'}
                            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                        />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5" /> Notifications
                    </CardTitle>
                    <CardDescription>Configure how you receive alerts</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="email-notif">Email Notifications</Label>
                        <Switch id="email-notif" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="app-notif">New Application Alerts</Label>
                        <Switch id="app-notif" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                        <Label htmlFor="marketing-notif">Marketing Updates</Label>
                        <Switch id="marketing-notif" />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end pt-6">
                <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => signOut()}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out of All Devices
                </Button>
            </div>
        </div>
    );
}
