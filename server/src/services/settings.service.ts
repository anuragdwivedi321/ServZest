import { prisma } from '../db/prisma';

export interface AdminSettingsMap {
  platform_commission_pct: number;
  cancel_fee_after_grace: number;
  cancel_grace_period_sec: number;
  rush_surge_cap: number;
  rush_surge_multiplier: number;
  night_charge_pct: number;
  max_dispatch_radius_meters: number;
  max_eta_minutes: number;
  worker_dispatch_timeout_sec: number;
  subscription_required: number;
  [key: string]: number | string;
}

export const DEFAULT_SETTINGS: AdminSettingsMap = {
  platform_commission_pct: 15,
  cancel_fee_after_grace: 40,
  cancel_grace_period_sec: 120,
  rush_surge_cap: 1.5,
  rush_surge_multiplier: 1.0,
  night_charge_pct: 25,
  max_dispatch_radius_meters: 5000,
  max_eta_minutes: 20,
  worker_dispatch_timeout_sec: 30,
  subscription_required: 0,
};

export class SettingsService {
  private cache: Map<string, { value: string; timestamp: number }> = new Map();
  private cacheTtlMs = 60000; // 1 minute cache

  async getSetting<T = number>(key: string, defaultValue?: T): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      return this.parseValue(cached.value) as unknown as T;
    }

    try {
      const row = await prisma.adminSetting.findUnique({
        where: { key },
      });

      if (row) {
        this.cache.set(key, { value: row.value, timestamp: now });
        return this.parseValue(row.value) as unknown as T;
      }
    } catch (err) {
      console.warn(`[SettingsService] Could not fetch setting ${key} from DB, using fallback:`, err);
    }

    const fallback = defaultValue ?? (DEFAULT_SETTINGS[key] as unknown as T);
    return fallback;
  }

  async getAllSettings(): Promise<AdminSettingsMap> {
    const result: AdminSettingsMap = { ...DEFAULT_SETTINGS };

    try {
      const rows = await prisma.adminSetting.findMany();
      for (const row of rows) {
        result[row.key] = this.parseValue(row.value);
        this.cache.set(row.key, { value: row.value, timestamp: Date.now() });
      }
    } catch (err) {
      console.warn('[SettingsService] Could not fetch all settings from DB, using defaults');
    }

    return result;
  }

  async updateSetting(key: string, value: string | number, description?: string): Promise<void> {
    const stringValue = String(value);
    await prisma.adminSetting.upsert({
      where: { key },
      update: { value: stringValue, ...(description ? { description } : {}) },
      create: { key, value: stringValue, description },
    });
    this.cache.set(key, { value: stringValue, timestamp: Date.now() });
  }

  async updateSettings(settings: Record<string, string | number>): Promise<void> {
    const entries = Object.entries(settings);
    await prisma.$transaction(entries.map(([key, value]) => prisma.adminSetting.upsert({
      where: { key }, update: { value: String(value) }, create: { key, value: String(value) },
    })));
    for (const [key, value] of entries) this.cache.set(key, { value: String(value), timestamp: Date.now() });
  }

  private parseValue(val: string): number | string {
    const num = parseFloat(val);
    return isNaN(num) ? val : num;
  }
}

export const settingsService = new SettingsService();
