"use client";

import { useState } from "react";
import { Save, Bell, Lock, User } from "lucide-react";

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [aiSensitivity, setAiSensitivity] = useState(85);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Settings</h1>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Profile Settings */}
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <User className="h-5 w-5" /> Profile Information
            </h2>
            <form className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <input type="text" defaultValue="Admin User" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <input type="email" defaultValue="admin@example.com" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm border p-2" />
                </div>
                <button type="button" className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    Update Profile
                </button>
            </form>
        </div>

        {/* System Config */}
        <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 flex items-center gap-2 mb-4">
                <Lock className="h-5 w-5" /> System Configuration
            </h2>
            <div className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        AI Detection Sensitivity ({aiSensitivity}%)
                    </label>
                    <input 
                        type="range" 
                        min="50" 
                        max="99" 
                        value={aiSensitivity} 
                        onChange={(e) => setAiSensitivity(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="mt-1 text-xs text-gray-500">Higher sensitivity may increase false positives.</p>
                </div>
                
                <div className="flex items-start">
                    <div className="flex h-5 items-center">
                        <input
                            id="notifications"
                            name="notifications"
                            type="checkbox"
                            checked={emailNotifications}
                            onChange={(e) => setEmailNotifications(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                    </div>
                    <div className="ml-3 text-sm">
                        <label htmlFor="notifications" className="font-medium text-gray-700">Email Notifications</label>
                        <p className="text-gray-500">Receive digest emails for daily damage reports.</p>
                    </div>
                </div>
                
                <button type="button" className="flex items-center gap-2 w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
                    <Save className="h-4 w-4" /> Save System Preferences
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}

