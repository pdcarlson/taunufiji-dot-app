"use server";

import { AuthService } from "@/lib/services/auth.service";
import { logger } from "@/lib/logger";


export async function syncUserAction(authId: string) {
    try {
        await AuthService.syncUser(authId);
        logger.log(`SyncUser Success for ${authId}`);
    } catch (e: any) {
        logger.error(`SyncUser Failed: ${e.message}`);
        // Don't throw, just log. We don't want to crash the dashboard if sync fails momentarily.
    }
}

export async function getProfileAction(authId: string) {
    try {
        const profile = await AuthService.getProfile(authId);
        // Serialize to plain JSON
        return JSON.parse(JSON.stringify(profile));
    } catch (e) {
        console.error("Failed to get profile", e);
        return null;
    }
}
